const prisma = require('../config/database')
const dayjs = require('dayjs')
const crypto = require('crypto')

const generateBookingCode = async (bookingData) => {
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
            code = `${prefix}${Date.now().toString().slice(-6)}-${crypto
                .randomInt(0, 9999)
                .toString()
                .padStart(4, '0')}`;
        }

        try {
            return await prisma.booking.create({
                data: {
                    ...bookingData,
                    bookingCode: code,
                },
            });

        } catch (err) {
            if (err.code === 'P2002') {
                continue;
            }
            throw err;
        }
    }

    throw new Error('Không thể tạo mã đặt phòng hợp lệ');
};

module.exports = generateBookingCode;