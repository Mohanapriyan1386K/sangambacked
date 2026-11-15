const ApiError = require('./ApiError');

function parseMonth(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(value))) throw new ApiError(400, 'month must use YYYY-MM format');
  return value;
}
function monthStart(month) { parseMonth(month); return new Date(`${month}-01T00:00:00.000Z`); }
function nextMonth(month) {
  const d = monthStart(month); d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString().slice(0, 7);
}
function currentMonth() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
}
module.exports = { parseMonth, monthStart, nextMonth, currentMonth };
