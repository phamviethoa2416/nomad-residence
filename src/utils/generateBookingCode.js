const prisma = require('../config/database');
const dayjs = require('dayjs');
const crypto = require('crypto');

const generateBookingCode = async () => {
    const maxAttempts = 6;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const today = dayjs().format('YYYYMMDD');
        const prefix = `BK-${today}-`;

        let code;

        if (attempt === 0) {
            const startOfDay = dayjs().startOf('day').toDate();
            const nextDay = dayjs().add(1, 'day').startOf('day').toDate();

            const count = await prisma.booking.count({
                where: {
                    createdAt: {
                        gte: startOfDay,
                        lt: nextDay,
                    },
                },
            });

            const sequenceNumber = String(count + 1).padStart(3, '0');
            code = `${prefix}${sequenceNumber}`;
        } else {
            const randomSuffix = crypto.randomInt(100, 999).toString();
            code = `${prefix}${randomSuffix}`;
        }

        const existing = await prisma.booking.findUnique({
            where: { bookingCode: code },
            select: { id: true },
        });

        if (!existing) {
            return code;
        }
    }

    throw new Error('Không thể tạo mã đặt phòng hợp lệ');
};

module.exports = { generateBookingCode };
