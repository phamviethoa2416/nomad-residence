const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const getDateRange = (checkin, checkout) => {
    const dates = [];
    let current = dayjs(checkin);
    const end = dayjs(checkout);

    while (current.isBefore(end)) {
        dates.push(current.toDate());
        current = current.add(1, 'day');
    }

    return dates;
}

const calculateNights = (checkin, checkout) => {
    return dayjs(checkout).diff(dayjs(checkin), 'day');
}

const formatDate = (date) => dayjs(date).format('YYYY-MM-DD');

const parseDate = (dateString) => dayjs(dateString).toDate();

const isBefore = (date1, date2) => dayjs(date1).isBefore(dayjs(date2));

const addMinutes = (date, minutes) => dayjs(date).add(minutes, 'minute').toDate();

const getDayOfWeek = (date) => dayjs(date).day();

module.exports = {
    getDateRange,
    calculateNights,
    formatDate,
    parseDate,
    isBefore,
    addMinutes,
    getDayOfWeek,
    dayjs,
}
