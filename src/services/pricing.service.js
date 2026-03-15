const prisma = require('../config/database');
const { getDateRange, getDayOfWeek, formatDate } = require('../utils/dateHelper');

const calcNightPrice = (basePrice, date, rules) => {
    const dow = getDayOfWeek(date);
    const dateStr = formatDate(date);

    const applicable = rules.filter((rule) => {
        if (!rule.isActive) return false;

        const hasDateRange = rule.dateFrom && rule.dateTo;
        const hasDayOfWeek = rule.dayOfWeek && rule.dayOfWeek.length > 0;

        if (hasDateRange) {
            const inRange = dateStr >= formatDate(rule.dateFrom) && dateStr <= formatDate(rule.dateTo);
            if (!inRange) return false;
        }

        if (hasDayOfWeek && !hasDateRange) {
            if (!rule.dayOfWeek.includes(dow)) return false;
        } else if (hasDayOfWeek && hasDateRange) {
            if (!rule.dayOfWeek.includes(dow)) return false;
        }

        return true;
    });

    if (applicable.length === 0) {
        return { price: basePrice, ruleName: null };
    }

    applicable.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        const aHasDate = !!(a.dateFrom && a.dateTo);
        const bHasDate = !!(b.dateFrom && b.dateTo);
        if (bHasDate !== aHasDate) return bHasDate - aHasDate;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const bestRule = applicable[0];
    let finalPrice;

    if (bestRule.modifierType === 'percent') {
        finalPrice = Math.round(basePrice * (1 + Number(bestRule.priceModifier) / 100));
    } else {
        finalPrice = basePrice + Number(bestRule.priceModifier);
    }

    finalPrice = Math.max(0, finalPrice);

    return { price: finalPrice, ruleName: bestRule.name };
};

const calculatePrice = async (roomId, checkinDate, checkoutDate) => {
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { basePrice: true, cleaningFee: true },
    });

    if (!room) throw new Error('Phòng không tồn tại');

    const rules = await prisma.pricingRule.findMany({
        where: { roomId, isActive: true },
    });

    return computePriceFromRoomAndRules(room, rules, checkinDate, checkoutDate);
};

const calculatePricesForRooms = async (roomIds, checkinDate, checkoutDate) => {
    if (!roomIds.length) return new Map();

    const [rooms, allRules] = await Promise.all([
        prisma.room.findMany({
            where: { id: { in: roomIds } },
            select: { id: true, basePrice: true, cleaningFee: true },
        }),
        prisma.pricingRule.findMany({
            where: { roomId: { in: roomIds }, isActive: true },
        }),
    ]);

    const rulesByRoom = new Map();
    for (const r of allRules) {
        if (!rulesByRoom.has(r.roomId)) rulesByRoom.set(r.roomId, []);
        rulesByRoom.get(r.roomId).push(r);
    }

    const result = new Map();
    for (const room of rooms) {
        const rules = rulesByRoom.get(room.id) || [];
        const calc = computePriceFromRoomAndRules(room, rules, checkinDate, checkoutDate);
        result.set(room.id, calc);
    }
    return result;
};

const computePriceFromRoomAndRules = (room, rules, checkinDate, checkoutDate) => {
    const dates = getDateRange(checkinDate, checkoutDate);
    const basePrice = Number(room.basePrice);

    const nightlyPrices = dates.map((date) => {
        const { price, ruleName } = calcNightPrice(basePrice, date, rules);
        return {
            date: formatDate(date),
            price,
            ruleName,
        };
    });

    const baseTotal = nightlyPrices.reduce((sum, n) => sum + n.price, 0);
    const cleaningFee = Number(room.cleaningFee) || 0;

    return {
        nightlyPrices,
        numNights: dates.length,
        baseTotal,
        cleaningFee,
        total: baseTotal + cleaningFee,
    };
};

const getRoomPricingRules = async (roomId) => {
    return prisma.pricingRule.findMany({
        where: { roomId },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
};

const createPricingRule = async (roomId, data) => {
    return prisma.pricingRule.create({
        data: { roomId, ...data },
    });
};

const updatePricingRule = async (ruleId, data) => {
    return prisma.pricingRule.update({
        where: { id: ruleId },
        data,
    });
};

const deletePricingRule = async (ruleId) => {
    return prisma.pricingRule.delete({ where: { id: ruleId } });
};

module.exports = {
    calculatePrice,
    calculatePricesForRooms,
    calcNightPrice,
    getRoomPricingRules,
    createPricingRule,
    updatePricingRule,
    deletePricingRule,
};
