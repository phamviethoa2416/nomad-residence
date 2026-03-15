const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const roomService = require('../../services/room.service');
const { pickAndMap } = require('../../utils/objectHelper');
const {
    AdminRoomParamsSchema,
    AdminImageParamsSchema,
    CreateRoomBodySchema,
    UpdateRoomBodySchema,
    AddRoomImageBodySchema,
    ReorderRoomImagesBodySchema,
    UpdateAmenitiesBodySchema,
} = require('../../validators/admin/room.validators');

const ROOM_KEY_MAP = {
    name: 'name',
    slug: 'slug',
    room_type: 'roomType',
    description: 'description',
    short_description: 'shortDescription',
    max_guests: 'maxGuests',
    num_bedrooms: 'numBedrooms',
    num_bathrooms: 'numBathrooms',
    num_beds: 'numBeds',
    area: 'area',
    address: 'address',
    district: 'district',
    city: 'city',
    latitude: 'latitude',
    longitude: 'longitude',
    base_price: 'basePrice',
    cleaning_fee: 'cleaningFee',
    checkin_time: 'checkinTime',
    checkout_time: 'checkoutTime',
    min_nights: 'minNights',
    max_nights: 'maxNights',
    house_rules: 'houseRules',
    cancellation_policy: 'cancellationPolicy',
    status: 'status',
    sort_order: 'sortOrder',
};

const listRooms = asyncHandler(async (req, res) => {
    const rooms = await roomService.getAllRooms();
    res.json({
        success: true,
        data: rooms,
    });
});

const getRoom = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const room = await roomService.getRoomById(params.id);

    if (!room) throw new AppError('Không tìm thấy phòng', 404, 'ROOM_NOT_FOUND');
    res.json({
        success: true,
        data: room,
    });
});

const createRoom = asyncHandler(async (req, res) => {
    const data = CreateRoomBodySchema.parse(req.body || {});

    const room = await roomService.createRoom(pickAndMap(data, ROOM_KEY_MAP));
    await roomService.invalidateRoomCache();

    res.status(201).json({
        success: true,
        data: room,
    });
});

const updateRoom = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const data = UpdateRoomBodySchema.parse(req.body || {});

    const updateData = pickAndMap(data, ROOM_KEY_MAP);

    const existingRoom = await roomService.getRoomById(params.id);
    if (!existingRoom) {
        throw new AppError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND');
    }

    const room = await roomService.updateRoom(params.id, updateData);
    await roomService.invalidateRoomCache();
    res.json({
        success: true,
        data: room,
    });
});

const deleteRoom = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const room = await roomService.getRoomById(params.id);
    if (!room) throw new AppError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND');

    await roomService.deleteRoom(params.id);
    await roomService.invalidateRoomCache();

    res.json({
        success: true,
        message: 'Xóa phòng thành công',
    });
});

const addImage = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const data = AddRoomImageBodySchema.parse(req.body || {});

    const image = await roomService.addRoomImage(params.id, {
        url: data.url,
        altText: data.alt_text,
        isPrimary: data.is_primary,
        sortOrder: data.sort_order,
    });

    res.status(201).json({
        success: true,
        data: image,
    });
});

const deleteImage = asyncHandler(async (req, res) => {
    const params = AdminImageParamsSchema.parse(req.params);
    await roomService.deleteRoomImage(params.imageId);
    res.json({ success: true, message: 'Đã xóa ảnh' });
});

const reorderImages = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const data = ReorderRoomImagesBodySchema.parse(req.body || {});

    await roomService.reorderRoomImages(
        params.id,
        data.order.map((o) => ({ id: o.id, sortOrder: o.sort_order })),
    );

    res.json({
        success: true,
        message: 'Đã sắp xếp lại ảnh',
    });
});

const updateAmenities = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const data = UpdateAmenitiesBodySchema.parse(req.body || {});

    await roomService.upsertAmenities(params.id, data.amenities);
    res.json({
        success: true,
        message: 'Đã cập nhật tiện ích',
    });
});

module.exports = {
    listRooms,
    getRoom,
    createRoom,
    updateRoom,
    deleteRoom,
    addImage,
    deleteImage,
    reorderImages,
    updateAmenities,
};
