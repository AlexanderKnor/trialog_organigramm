/**
 * Date Utility Functions
 */

export const formatDate = (date, format = 'DD.MM.YYYY') => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('HH', hours)
    .replace('mm', minutes);
};

export const getCurrentTimestamp = () => new Date().toISOString();

export const parseDate = (dateString) => {
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
};
