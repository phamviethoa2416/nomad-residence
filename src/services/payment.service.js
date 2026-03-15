const prisma = require('../config/database');
const config = require('../config');
const { withRequest, logger } = require('../utils/logger');
const { generateVietQR, verifyWebhookToken, extractBookingCode } = require('../utils/qrHelper');
const { confirmBooking } = require('./booking.service');
const { sendBookingConfirmationEmail, notifyAdminBookingConfirmed, sendTelegram } = require('./notification.service');
const { AppError } = require('../middlewares/errorHandler');
const { formatDate } = require('../utils/dateHelper');

const createVietQRPayment = async (bookingCode) => {
    const booking = await prisma.booking.findUnique({
        where: { bookingCode },
        include: {
            room: { select: { name: true, checkinTime: true, checkoutTime: true } },
        },
    });

    if (!booking) {
        throw new AppError('Không tìm thấy đơn đặt phòng', 404, 'BOOKING_NOT_FOUND');
    }
    if (booking.status !== 'pending') {
        throw new AppError('Đơn đặt phòng không ở trạng thái chờ thanh toán', 400, 'INVALID_STATUS');
    }
    if (new Date() > booking.expiresAt) {
        throw new AppError('Đơn đặt phòng đã hết hạn, vui lòng đặt lại', 400, 'BOOKING_EXPIRED');
    }

    const amount = Number(booking.totalAmount);
    const qrInfo = await generateVietQR({ bookingCode, amount });

    const existingPending = await prisma.payment.findFirst({
        where: { bookingId: booking.id, status: 'pending' },
        select: { id: true },
    });

    if (!existingPending) {
        await prisma.payment.create({
            data: {
                bookingId: booking.id,
                amount: booking.totalAmount,
                method: 'vietqr',
                status: 'pending',
            },
        });
    }

    return {
        bookingCode: booking.bookingCode,
        roomName: booking.room.name,
        checkinDate: formatDate(booking.checkinDate),
        checkoutDate: formatDate(booking.checkoutDate),
        numNights: booking.numNights,
        amount,
        expiresAt: booking.expiresAt,
        qr: {
            dataURL: qrInfo.qrDataURL,
            rawCode: qrInfo.qrCode,
            transferContent: qrInfo.transferContent,
            accountNo: qrInfo.accountNo,
            accountName: qrInfo.accountName,
            bankName: qrInfo.bankName,
        },
        instructions: [
            '1. Mở app ngân hàng hoặc ví điện tử',
            '2. Chọn Quét mã QR hoặc Chuyển khoản',
            '3. Quét mã QR hoặc nhập thông tin tài khoản',
            `4. Nhập đúng nội dung: ${qrInfo.transferContent}`,
            `5. Số tiền: ${amount.toLocaleString('vi-VN')}đ`,
            '6. Xác nhận và hoàn tất thanh toán',
        ],
    };
};

const handleVietQRWebhook = async (authHeader, body, remoteIp, reqContext) => {
    const log = reqContext ? withRequest(reqContext) : logger;
    const allowedIps = config.vietqr.allowedIps || [];
    if (allowedIps.length > 0) {
        const ip = (remoteIp || '').trim();
        if (!ip || !allowedIps.includes(ip)) {
            return {
                error: true,
                errorReason: 'IP_NOT_ALLOWED',
                toastMessage: 'IP không được phép gọi webhook',
                object: null,
            };
        }
    }
    if (!verifyWebhookToken(authHeader)) {
        return { error: true, errorReason: 'INVALID_TOKEN', toastMessage: 'Token xác thực không hợp lệ', object: null };
    }

    const { transactionid, amount, content, bankaccount, orderId } = body;
    const bookingCode = extractBookingCode(content) || extractBookingCode(orderId);

    if (!bookingCode) {
        log.info(`[VietQR Webhook] Không nhận ra booking từ nội dung`, { content });
        return {
            error: false,
            errorReason: null,
            toastMessage: 'Giao dịch không tìm thấy đơn hàng tương ứng',
            object: { reftransactionid: transactionid },
        };
    }

    const booking = await prisma.booking.findUnique({
        where: { bookingCode },
        include: { room: { select: { name: true, checkinTime: true, checkoutTime: true } } },
    });

    if (!booking) {
        log.warn('[VietQR Webhook] Booking not found', { bookingCode });
        return {
            error: true,
            errorReason: 'ORDER_NOT_FOUND',
            toastMessage: `Không tìm thấy đơn ${bookingCode}`,
            object: null,
        };
    }

    // Idempotency check
    const alreadyProcessed = await prisma.payment.findFirst({ where: { bookingId: booking.id, status: 'success' } });
    if (alreadyProcessed) {
        return {
            error: false,
            errorReason: null,
            toastMessage: 'Đơn hàng đã được xác nhận trước đó',
            object: { reftransactionid: transactionid },
        };
    }

    // Verify số tiền
    const receivedAmount = Number(amount);
    const expectedAmount = Number(booking.totalAmount);

    if (receivedAmount < expectedAmount) {
        await sendTelegram(
            `⚠️ <b>THANH TOÁN THIẾU!</b>\n\n📋 Booking: <code>${bookingCode}</code>\n💰 Cần: ${expectedAmount.toLocaleString('vi-VN')}đ\n💸 Nhận: ${receivedAmount.toLocaleString('vi-VN')}đ\n📝 Nội dung: ${content}\n🏦 TK: ${bankaccount}`,
        );
        log.warn('[VietQR Webhook] Invalid amount', {
            bookingCode,
            expectedAmount,
            receivedAmount,
        });
        return {
            error: true,
            errorReason: 'INVALID_AMOUNT',
            toastMessage: `Số tiền không khớp. Cần ${expectedAmount}, nhận ${receivedAmount}`,
            object: null,
        };
    }

    // Cập nhật payment record
    await prisma.$transaction(async (tx) => {
        const existing = await tx.payment.findFirst({ where: { bookingId: booking.id, status: 'pending' } });
        if (existing) {
            await tx.payment.update({
                where: { id: existing.id },
                data: {
                    status: 'success',
                    vietqrTransactionId: transactionid,
                    paidAt: new Date(),
                    rawResponse: body,
                    adminNote: `VietQR webhook. Nội dung: ${content}`,
                },
            });
        } else {
            await tx.payment.create({
                data: {
                    bookingId: booking.id,
                    amount: receivedAmount,
                    method: 'vietqr',
                    status: 'success',
                    vietqrTransactionId: transactionid,
                    paidAt: new Date(),
                    rawResponse: body,
                },
            });
        }
    });

    const confirmedBooking = await confirmBooking(booking.id, `VietQR tự động - TxID: ${transactionid}`);
    const fullBooking = { ...confirmedBooking, room: booking.room };
    sendBookingConfirmationEmail(fullBooking).catch((err) => {
        logger.error('[Email] Failed to send confirmation after VietQR', { err, bookingCode });
    });
    notifyAdminBookingConfirmed(fullBooking).catch((err) => {
        logger.error('[Notification] Failed to notify admin after VietQR', { err, bookingCode });
    });

    log.info('[VietQR Webhook] Xác nhận thành công booking', { bookingCode, transactionid });
    return {
        error: false,
        errorReason: null,
        toastMessage: 'Xác nhận thanh toán thành công',
        object: { reftransactionid: transactionid },
    };
};

/**
 * Kiểm tra trạng thái thanh toán — guest polling sau khi quét QR
 */
const checkPaymentStatus = async (bookingCode) => {
    const booking = await prisma.booking.findUnique({
        where: { bookingCode },
        select: { bookingCode: true, status: true, totalAmount: true, expiresAt: true, confirmedAt: true },
    });

    if (!booking) throw new AppError('Không tìm thấy đơn', 404, 'BOOKING_NOT_FOUND');

    return {
        bookingCode: booking.bookingCode,
        status: booking.status,
        isPaid: booking.status === 'confirmed',
        isExpired: booking.status === 'canceled' || (booking.expiresAt && new Date() > booking.expiresAt),
        confirmedAt: booking.confirmedAt,
        totalAmount: Number(booking.totalAmount),
    };
};

module.exports = {
    createVietQRPayment,
    handleVietQRWebhook,
    checkPaymentStatus,
};
