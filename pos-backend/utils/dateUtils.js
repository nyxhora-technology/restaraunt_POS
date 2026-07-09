const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Returns the start of the day in UTC for a given timezone.
 * e.g., if restaurant is Asia/Kolkata and now is 2AM local, 
 * this returns yesterday's midnight local time, converted to UTC Date.
 */
const getStartOfDay = (tz = "UTC", date = new Date()) => {
  return dayjs(date).tz(tz).startOf("day").toDate();
};

/**
 * Returns the start of the month in UTC for a given timezone.
 */
const getStartOfMonth = (tz = "UTC", date = new Date()) => {
  return dayjs(date).tz(tz).startOf("month").toDate();
};

/**
 * Returns the start of the previous day in UTC for a given timezone.
 */
const getStartOfYesterday = (tz = "UTC", date = new Date()) => {
  return dayjs(date).tz(tz).subtract(1, "day").startOf("day").toDate();
};

/**
 * Evaluates if a given date has expired relative to the local timezone.
 * Returns true if date is before the start of the current day in local tz.
 */
const isExpired = (expiryDate, tz = "UTC") => {
  const localToday = dayjs().tz(tz).startOf("day");
  const localExpiry = dayjs(expiryDate).tz(tz).startOf("day");
  return localExpiry.isBefore(localToday);
};

/**
 * Returns the number of days until expiry relative to local timezone.
 */
const daysUntilExpiry = (expiryDate, tz = "UTC") => {
  const localToday = dayjs().tz(tz).startOf("day");
  const localExpiry = dayjs(expiryDate).tz(tz).startOf("day");
  return localExpiry.diff(localToday, "day");
};

module.exports = {
  dayjs,
  getStartOfDay,
  getStartOfMonth,
  getStartOfYesterday,
  isExpired,
  daysUntilExpiry
};
