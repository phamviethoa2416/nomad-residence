const nodemailer = require('nodemailer');
const config = require('../config');
const { logger } = require('../utils/logger');

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.port === 465,
            auth: {
                user: config.email.user,
                pass: config.email.password,
            },
        });
    }
    return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
    if (!config.email.user || !config.email.password) {
        logger.warn('[Email] SMTP not configured, skipping email send');
        return;
    }

    try {
        const info = await getTransporter().sendMail({
            from: config.email.from,
            to,
            subject,
            html,
            text,
        });
        logger.info('[Email] Sent', { to, messageId: info.messageId });
        return info;
    } catch (err) {
        logger.error('[Email] Failed to send', { err: err.message });
    }
};


const sendBookingConfirmationEmail = async (booking) => {
    if (!booking.guestEmail) return;

    const checkin = new Date(booking.checkinDate).toLocaleDateString('vi-VN');
    const checkout = new Date(booking.checkoutDate).toLocaleDateString('vi-VN');
    const amount = Number(booking.totalAmount).toLocaleString('vi-VN');

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Đặt phòng thành công!</h2>
      <p>Xin chào <strong>${booking.guestName}</strong>,</p>
      <p>Đơn đặt phòng của bạn đã được xác nhận. Chi tiết:</p>
      
      <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f3f4f6;">
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Mã đặt phòng</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${booking.bookingCode}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Phòng</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${booking.room?.name || ''}</td>
        </tr>
        <tr style="background: #f3f4f6;">
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Nhận phòng</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${checkin} từ ${booking.room?.checkinTime || '14:00'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Trả phòng</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${checkout} trước ${booking.room?.checkoutTime || '12:00'}</td>
        </tr>
        <tr style="background: #f3f4f6;">
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Số đêm</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${booking.numNights} đêm</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Tổng tiền</strong></td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; color: #dc2626;"><strong>${amount}đ</strong></td>
        </tr>
      </table>

      <p>Nếu cần hỗ trợ, vui lòng liên hệ chúng tôi.</p>
      <p>Cảm ơn bạn đã tin tưởng và lựa chọn Nomad Residence!</p>
    </div>
  `;

    await sendEmail({
        to: booking.guestEmail,
        subject: `[${booking.bookingCode}] Xác nhận đặt phòng thành công`,
        html,
    });
};

const sendBookingCancellationEmail = async (booking) => {
    if (!booking.guestEmail) return;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Đặt phòng đã bị hủy</h2>
      <p>Xin chào <strong>${booking.guestName}</strong>,</p>
      <p>Đặt phòng <strong>${booking.bookingCode}</strong> đã bị hủy.</p>
      ${booking.cancelReason ? `<p>Lý do: ${booking.cancelReason}</p>` : ''}
      <p>Nếu có thắc mắc, vui lòng liên hệ chúng tôi.</p>
    </div>
  `;

    await sendEmail({
        to: booking.guestEmail,
        subject: `[${booking.bookingCode}] Đặt phòng đã bị hủy`,
        html,
    });
};

const sendTelegram = async (message) => {
    const { botToken, chatId } = config.telegram;
    if (!botToken || !chatId) {
        logger.warn('[Telegram] Not configured, skipping');
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            logger.error('[Telegram] API error', { err });
        }
    } catch (err) {
        logger.error('[Telegram] Failed to send', { err: err.message });
    }
};

const notifyAdminBookingConfirmed = async (booking) => {
    const checkin = new Date(booking.checkinDate).toLocaleDateString('vi-VN');
    const checkout = new Date(booking.checkoutDate).toLocaleDateString('vi-VN');
    const amount = Number(booking.totalAmount).toLocaleString('vi-VN');

    const message = `
🏠 <b>ĐẶT PHÒNG MỚI!</b>

📋 Mã: <code>${booking.bookingCode}</code>
🏡 Phòng: ${booking.room?.name || booking.roomId}
👤 Khách: ${booking.guestName}
📞 SĐT: ${booking.guestPhone}
📅 Nhận phòng: ${checkin}
📅 Trả phòng: ${checkout}
🌙 Số đêm: ${booking.numNights}
💰 Tổng tiền: ${amount}đ
📌 Nguồn: ${booking.source}
${booking.guestNote ? `📝 Ghi chú: ${booking.guestNote}` : ''}
  `.trim();

    await sendTelegram(message);
};

const notifyIcalConflict = async (room, conflictDates) => {
    const message = `
⚠️ <b>XUNG ĐỘT LỊCH iCal!</b>

🏡 Phòng: ${room.name}
📅 Ngày xung đột: ${conflictDates.join(', ')}

Vui lòng kiểm tra và xử lý thủ công!
  `.trim();

    await sendTelegram(message);
};

const notifyIcalSyncError = async (platform, roomName, error) => {
    const message = `
❌ <b>LỖI ĐỒNG BỘ iCal</b>

Platform: ${platform}
Phòng: ${roomName}
Lỗi: ${error}
  `.trim();

    await sendTelegram(message);
};

module.exports = {
    sendEmail,
    sendBookingConfirmationEmail,
    sendBookingCancellationEmail,
    sendTelegram,
    notifyAdminBookingConfirmed,
    notifyIcalConflict,
    notifyIcalSyncError,
};