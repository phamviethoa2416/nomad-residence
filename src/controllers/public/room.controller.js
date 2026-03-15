const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const roomService = require('../../services/room.service');
const dayjs = require('dayjs');
const {
    ListRoomsSchema,
    GetRoomDetailSchema,
    GetRoomCalendarSchema,
} = require('../../validators/public/room.validators');

const listRooms = asyncHandler(async (req, res) => {
    const data = ListRoomsSchema.parse(req.query || {});

    const result = await roomService.getRooms({
        checkin: data.checkin || null,
        checkout: data.checkout || null,
        guests: data.guests || null,
        roomType: data.room_type || null,
        minPrice: data.min_price || null,
        maxPrice: data.max_price || null,
        sort: data.sort,
        page: data.page,
        limit: data.limit,
    });

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json({
        success: true,
        data: result,
    });
});

const getRoomDetail = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const data = GetRoomDetailSchema.parse(req.query || {});

    const room = await roomService.getRoomBySlug(slug, data.checkin || null, data.checkout || null);

    if (!room) {
        throw new AppError('Không tìm thấy phòng', 404, 'ROOM_NOT_FOUND');
    }

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json({
        success: true,
        data: room,
    });
});

const getRoomCalendar = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const data = GetRoomCalendarSchema.parse(req.query || {});

    const room = await roomService.getRoomBySlug(slug);

    if (!room) {
        throw new AppError('Không tìm thấy phòng', 404, 'ROOM_NOT_FOUND');
    }

    const fromDate = data.from || new Date();
    const toDate = data.to || dayjs().add(90, 'day').toDate();

    const calendar = await roomService.getRoomCalendar(room.id, fromDate, toDate);

    res.json({
        success: true,
        data: calendar,
    });
});

module.exports = {
    listRooms,
    getRoomDetail,
    getRoomCalendar,
};
