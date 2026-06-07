function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

function generateRandomCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

function sanitizeHtml(text) {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/<[^>]*>?/gm, '');
}

function paginateResults(page, limit, total) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  const t = parseInt(total, 10) || 0;
  const totalPages = Math.max(1, Math.ceil(t / l));
  return {
    page: p,
    limit: l,
    total: t,
    totalPages,
    hasNextPage: p < totalPages,
    hasPrevPage: p > 1,
  };
}

module.exports = {
  calculateDistance,
  formatDate,
  slugify,
  truncateText,
  generateRandomCode,
  sanitizeHtml,
  paginateResults,
};
