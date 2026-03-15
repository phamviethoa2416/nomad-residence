// src/services/ical.service.js
const crypto = require('crypto');
const ical = require('ical-generator');
const nodeIcal = require('node-ical');
const prisma = require('../config/database');
const { formatDate, getDateRange } = require('../utils/dateHelper');
const { notifyIcalConflict, notifyIcalSyncError } = require('./notification.service');
const config = require('../config');

const generateIcal = async (roomId) => {
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, name: true },
    });

    if (!room) throw new Error('Room not found');

    const bookings = await prisma.booking.findMany({
        where: {
            roomId,
            status: { in: ['confirmed', 'pending', 'completed'] },
        },
        select: {
            bookingCode: true,
            checkinDate: true,
            checkoutDate: true,
            guestName: true,
        },
    });

    const cal = ical.default({
        name: room.name,
        prodId: { company: 'Homestay', product: 'booking-system' },
    });

    bookings.forEach((b) => {
        cal.createEvent({
            start: b.checkinDate,
            end: b.checkoutDate,
            summary: `BLOCKED - ${b.bookingCode}`,
            description: `Guest: ${b.guestName}`,
            id: b.bookingCode,
        });
    });

    return cal.toString();
};

const syncIcalLink = async (linkId) => {
    const link = await prisma.icalLink.findUnique({
        where: { id: linkId },
        include: { room: { select: { id: true, name: true } } },
    });

    if (!link || !link.importUrl) return;

    await prisma.icalLink.update({
        where: { id: linkId },
        data: { syncStatus: 'syncing' },
    });

    try {
        const events = await nodeIcal.async.fromURL(link.importUrl);

        const newDates = [];
        for (const event of Object.values(events)) {
            if (event.type !== 'VEVENT') continue;
            if (!event.start || !event.end) continue;

            const dates = getDateRange(event.start, event.end);
            dates.forEach((d) => {
                newDates.push({
                    roomId: link.roomId,
                    date: d,
                    source: `ota_${link.platform}`,
                    sourceRef: event.uid || null,
                    reason: event.summary || `Blocked via ${link.platform}`,
                });
            });
        }

        await prisma.blockedDate.deleteMany({
            where: {
                roomId: link.roomId,
                source: `ota_${link.platform}`,
            },
        });

        if (newDates.length > 0) {
            await prisma.blockedDate.createMany({
                data: newDates,
                skipDuplicates: true,
            });
        }

        const conflictDates = await checkConflicts(
            link.roomId,
            newDates.map((d) => d.date),
        );
        if (conflictDates.length > 0) {
            const dateStrs = conflictDates.map(formatDate);
            await notifyIcalConflict(link.room, dateStrs);
        }

        await prisma.icalLink.update({
            where: { id: linkId },
            data: {
                syncStatus: 'idle',
                lastSyncedAt: new Date(),
                syncError: null,
            },
        });

        return { success: true, datesBlocked: newDates.length };
    } catch (err) {
        await prisma.icalLink.update({
            where: { id: linkId },
            data: {
                syncStatus: 'error',
                syncError: err.message,
            },
        });

        await notifyIcalSyncError(link.platform, link.room.name, err.message);
        throw err;
    }
};

const syncAllIcalLinks = async () => {
    const links = await prisma.icalLink.findMany({
        where: { isActive: true, importUrl: { not: null } },
    });

    const results = [];
    for (const link of links) {
        try {
            const result = await syncIcalLink(link.id);
            results.push({ linkId: link.id, ...result });
        } catch (err) {
            results.push({ linkId: link.id, success: false, error: err.message });
        }
    }

    return results;
};

const checkConflicts = async (roomId, dates) => {
    if (dates.length === 0) return [];

    const conflicts = await prisma.booking.findMany({
        where: {
            roomId,
            status: 'confirmed',
            checkinDate: { lte: dates[dates.length - 1] },
            checkoutDate: { gte: dates[0] },
        },
        select: { checkinDate: true, checkoutDate: true },
    });

    if (conflicts.length === 0) return [];

    const dateStrs = new Set(dates.map(formatDate));
    const conflictDates = [];

    conflicts.forEach((b) => {
        const range = getDateRange(b.checkinDate, b.checkoutDate);
        range.forEach((d) => {
            if (dateStrs.has(formatDate(d))) conflictDates.push(d);
        });
    });

    return conflictDates;
};

const generateIcalToken = (roomId) => {
    const secret = config.ical.tokenSecret;
    return crypto.createHmac('sha256', secret).update(roomId.toString()).digest('hex');
};

const verifyIcalToken = (roomId, token) => {
    if (!token || typeof token !== 'string') return false;
    try {
        const expected = generateIcalToken(roomId);
        const tokenBuffer = Buffer.from(token, 'utf-8');
        const expectedBuffer = Buffer.from(expected, 'utf-8');
        if (tokenBuffer.length !== expectedBuffer.length) return false;
        return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
    } catch (err) {
        return false;
    }
};

const getIcalLinks = async (roomId) => {
    return prisma.icalLink.findMany({ where: { roomId } });
};

const addIcalLink = async (roomId, { platform, importUrl }) => {
    const exportUrl = getExportUrl(roomId);
    return prisma.icalLink.create({
        data: { roomId, platform, importUrl, exportUrl },
    });
};

const deleteIcalLink = async (linkId) => {
    return prisma.icalLink.delete({ where: { id: linkId } });
};

const getExportUrl = (roomId) => {
    const token = generateIcalToken(roomId);
    return `${config.app.url}/api/v1/ical/${roomId}/calendar.ics?token=${token}`;
};

module.exports = {
    generateIcal,
    syncIcalLink,
    syncAllIcalLinks,
    getIcalLinks,
    addIcalLink,
    deleteIcalLink,
    getExportUrl,
    verifyIcalToken,
};
