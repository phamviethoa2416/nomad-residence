const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const bookingService = require('../../services/booking.service');
const { CreateBookingSchema, LookupBookingSchema } = require('../../validators/public/booking.validators');

const createBooking = asyncHandler(async (req, res) => {
    const data = CreateBookingSchema.parse(req.body || {});

    const booking = await bookingService.createBooking({
        roomId: data.room_id,
        checkinDate: data.checkin_date,
        checkoutDate: data.checkout_date,
        numGuests: data.num_guests,
        guestName: data.guest_name,
        guestPhone: data.guest_phone,
        guestEmail: data.guest_email,
        guestNote: data.guest_note,
    });

    res.status(201).json({
        success: true,
        data: {
            bookingCode: booking.bookingCode,
            roomName: booking.room.name,
            checkinDate: booking.checkinDate,
            checkoutDate: booking.checkoutDate,
            numNights: booking.numNights,
            totalAmount: Number(booking.totalAmount),
            priceBreakdown: booking.priceBreakdown,
            status: booking.status,
            expiresAt: booking.expiresAt,
            paymentUrl: `/api/v1/payments/vietqr?booking_code=${booking.bookingCode}`,
        },
    });
});

const lookupBooking = asyncHandler(async (req, res) => {
    const data = LookupBookingSchema.parse(req.query || {});

    const booking = await bookingService.lookupBooking(data.code, data.phone);

    if (!booking) {
        throw new AppError('Không tìm thấy đơn đặt phòng', 404, 'BOOKING_NOT_FOUND');
    }

    res.json({
        success: true,
        data: booking,
    });
});

module.exports = {
    createBooking,
    lookupBooking,
};
