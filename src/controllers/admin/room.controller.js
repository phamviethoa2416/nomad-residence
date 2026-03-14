const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const roomService = require('../../services/room.service');
const { AdminRoomParamsSchema, AdminImageParamsSchema, CreateRoomBodySchema, UpdateRoomBodySchema, AddRoomImageBodySchema, ReorderRoomImagesBodySchema, UpdateAmenitiesBodySchema } = require('../../validators/admin/room.validators');

const listRooms = asyncHandler(async (req, res) => {
    const rooms = await roomService.getAllRooms();
    res.json({
        success: true,
        data: rooms
    });
});

const getRoom = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const room = await roomService.getRoomById(params.id);

    if (!room) throw new AppError(
        'Không tìm thấy phòng',
        404,
        'ROOM_NOT_FOUND'
    );
    res.json({
        success: true,
        data: room
    });
})

const createRoom = asyncHandler(async (req, res) => {
    const data = CreateRoomBodySchema.parse(req.body || {});

    const room = await roomService.createRoom({
        name: data.name,
        slug: data.slug,
        roomType: data.room_type,
        description: data.description,
        shortDescription: data.short_description,
        maxGuests: data.max_guests,
        numBedrooms: data.num_bedrooms,
        numBathrooms: data.num_bathrooms,
        numBeds: data.num_beds,
        area: data.area,
        address: data.address,
        district: data.district,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        basePrice: data.base_price,
        cleaningFee: data.cleaning_fee,
        checkinTime: data.checkin_time,
        checkoutTime: data.checkout_time,
        minNights: data.min_nights,
        maxNights: data.max_nights,
        houseRules: data.house_rules,
        cancellationPolicy: data.cancellation_policy,
        status: data.status,
        sortOrder: data.sort_order,
    });

    res.status(201).json({
        success: true,
        data: room
    });
});

const updateRoom = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const data = UpdateRoomBodySchema.parse(req.body || {});

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.room_type !== undefined) updateData.roomType = data.room_type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.short_description !== undefined) updateData.shortDescription = data.short_description;
    if (data.max_guests !== undefined) updateData.maxGuests = data.max_guests;
    if (data.num_bedrooms !== undefined) updateData.numBedrooms = data.num_bedrooms;
    if (data.num_bathrooms !== undefined) updateData.numBathrooms = data.num_bathrooms;
    if (data.num_beds !== undefined) updateData.numBeds = data.num_beds;
    if (data.area !== undefined) updateData.area = data.area;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.district !== undefined) updateData.district = data.district;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.base_price !== undefined) updateData.basePrice = data.base_price;
    if (data.cleaning_fee !== undefined) updateData.cleaningFee = data.cleaning_fee;
    if (data.checkin_time !== undefined) updateData.checkinTime = data.checkin_time;
    if (data.checkout_time !== undefined) updateData.checkoutTime = data.checkout_time;
    if (data.min_nights !== undefined) updateData.minNights = data.min_nights;
    if (data.max_nights !== undefined) updateData.maxNights = data.max_nights;
    if (data.house_rules !== undefined) updateData.houseRules = data.house_rules;
    if (data.cancellation_policy !== undefined) updateData.cancellationPolicy = data.cancellation_policy;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.sort_order !== undefined) updateData.sortOrder = data.sort_order;

    const existingRoom = await roomService.getRoomById(params.id);
    if (!existingRoom) {
        throw new AppError('Phòng không tồn tại', 404, 'ROOM_NOT_FOUND');
    }

    const room = await roomService.updateRoom(params.id, updateData);
    res.json({
        success: true,
        data: room
    });
});

const deleteRoom = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const room = await roomService.getRoomById(params.id);
    if (!room) throw new AppError(
        'Phòng không tồn tại',
        404,
        'ROOM_NOT_FOUND'
    );

    await roomService.deleteRoom(params.id);

    res.json({
        success: true,
        message: 'Xóa phòng thành công'
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
        data: image
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
        data.order.map((o) => ({ id: o.id, sortOrder: o.sort_order }))
    );

    res.json({
        success: true,
        message: 'Đã sắp xếp lại ảnh'
    });
});

const updateAmenities = asyncHandler(async (req, res) => {
    const params = AdminRoomParamsSchema.parse(req.params);
    const data = UpdateAmenitiesBodySchema.parse(req.body || {});

    await roomService.upsertAmenities(params.id, data.amenities);
    res.json({
        success: true,
        message: 'Đã cập nhật tiện ích'
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
}