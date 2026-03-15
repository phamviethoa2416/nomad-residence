const z = require('zod');

const AdminRoomParamsSchema = z.object({
    id: z.coerce.number().int().positive('ID phòng không hợp lệ'),
});

const AdminImageParamsSchema = z.object({
    imageId: z.coerce.number().int().positive('ID ảnh không hợp lệ'),
});

const CreateRoomBodySchema = z.object({
    name: z.string().min(1, 'Tên phòng là bắt buộc'),

    slug: z.string().min(1, 'Slug là bắt buộc'),

    room_type: z.string().min(1, 'Loại phòng là bắt buộc'),

    description: z.string().optional(),

    short_description: z.string().optional(),

    max_guests: z.coerce.number().int().positive({
        message: 'Số khách tối đa phải lớn hơn 0',
    }),

    num_bedrooms: z.coerce.number().int().nonnegative().optional().default(1),

    num_bathrooms: z.coerce.number().int().nonnegative().optional().default(1),

    num_beds: z.coerce.number().int().nonnegative().optional().default(1),

    area: z.coerce.number().positive().optional(),

    address: z.string().min(1, 'Địa chỉ là bắt buộc'),

    district: z.string().optional(),

    city: z.string().optional().default('Hà Nội'),

    latitude: z.coerce.number().optional().nullable(),

    longitude: z.coerce.number().optional().nullable(),

    base_price: z.coerce.number().positive({
        message: 'Giá cơ bản phải lớn hơn 0',
    }),

    cleaning_fee: z.coerce.number().nonnegative().optional().default(0),

    checkin_time: z.string().optional().default('14:00'),

    checkout_time: z.string().optional().default('12:00'),

    min_nights: z.coerce.number().int().positive().optional().default(1),

    max_nights: z.coerce.number().int().positive().optional().default(30),

    house_rules: z.string().optional(),

    cancellation_policy: z.string().optional(),

    status: z.string().optional().default('active'),

    sort_order: z.coerce.number().int().optional().default(0),
});

const UpdateRoomBodySchema = CreateRoomBodySchema.partial();

const AddRoomImageBodySchema = z.object({
    url: z.url('URL hình ảnh không hợp lệ'),
    alt_text: z.string().optional(),
    is_primary: z.boolean().optional().default(false),
    sort_order: z.coerce.number().int().optional().default(0),
});

const ReorderRoomImagesBodySchema = z.object({
    order: z
        .array(
            z.object({
                id: z.coerce.number().int().positive(),
                sort_order: z.coerce.number().int(),
            }),
        )
        .min(1, 'Danh sách thứ tự không được trống'),
});

const UpdateAmenitiesBodySchema = z.object({
    amenities: z.array(z.string()).default([]),
});

module.exports = {
    AdminRoomParamsSchema,
    AdminImageParamsSchema,
    CreateRoomBodySchema,
    UpdateRoomBodySchema,
    AddRoomImageBodySchema,
    ReorderRoomImagesBodySchema,
    UpdateAmenitiesBodySchema,
};
