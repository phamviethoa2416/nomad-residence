const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const bookingService = require('../../services/booking.service');
const { sendBookingCancellationEmail, notifyAdminBookingConfirmed } = require('../../services/notification.service');
const { withRequest } = require('../../utils/logger');
const {
    BookingParamsSchema,
    ListBookingsQuerySchema,
    ConfirmBookingBodySchema,
    CancelBookingBodySchema,
    CreateManualBookingBodySchema,
} = require('../../validators/admin/booking.validators');

const listBookings = asyncHandler(async (req, res) => {
    const query = ListBookingsQuerySchema.parse(req.query || {});

    const result = await bookingService.getBookings({
        status: query.status,
        roomId: query.room_id || null,
        dateFrom: query.date_from || null,
        dateTo: query.date_to || null,
        page: query.page,
        limit: query.limit,
    });

    res.json({
        success: true,
        data: result,
    });
});

const getBooking = asyncHandler(async (req, res) => {
    const params = BookingParamsSchema.parse(req.params);
    const booking = await bookingService.getBookingDetail(params.id);

    if (!booking) throw new AppError('Không tìm thấy đơn', 404, 'NOT_FOUND');

    res.json({
        success: true,
        data: booking,
    });
});

const confirmBooking = asyncHandler(async (req, res) => {
    const params = BookingParamsSchema.parse(req.params);
    const data = ConfirmBookingBodySchema.parse(req.body || {});

    const booking = await bookingService.confirmBooking(params.id, data.admin_note);

    const log = withRequest(req);
    log.info('booking_confirm_request', {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        adminId: req.admin?.id,
    });

    notifyAdminBookingConfirmed(booking).catch((err) => {
        log.error('notifyAdminBookingConfirmed failed', { err, bookingId: booking.id });
    });

    res.json({
        success: true,
        data: booking,
        message: 'Đã xác nhận đơn',
    });
});

const cancelBooking = asyncHandler(async (req, res) => {
    const params = BookingParamsSchema.parse(req.params);
    const data = CancelBookingBodySchema.parse(req.body || {});

    const booking = await bookingService.cancelBooking(params.id, data.reason, true);

    const log = withRequest(req);
    log.info('booking_cancel_request', {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        adminId: req.admin?.id,
        reason: data.reason,
    });

    sendBookingCancellationEmail(booking).catch((err) => {
        log.error('sendBookingCancellationEmail failed', { err, bookingId: booking.id });
    });

    res.json({
        success: true,
        data: booking,
        message: 'Đã hủy đơn',
    });
});

const createManualBooking = asyncHandler(async (req, res) => {
    const data = CreateManualBookingBodySchema.parse(req.body || {});

    const booking = await bookingService.createManualBooking({
        roomId: data.room_id,
        checkinDate: data.checkin_date,
        checkoutDate: data.checkout_date,
        guestName: data.guest_name,
        guestPhone: data.guest_phone,
        guestEmail: data.guest_email || undefined,
        guestNote: data.guest_note,
        numGuests: data.num_guests,
        source: data.source,
        paymentMethod: data.payment_method,
        adminNote: data.admin_note,
    });

    res.status(201).json({
        success: true,
        data: booking,
    });
});

module.exports = {
    listBookings,
    getBooking,
    confirmBooking,
    cancelBooking,
    createManualBooking,
};
