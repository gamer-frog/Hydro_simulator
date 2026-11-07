// Formato numérico para la interfaz (es-AR, USD).
const num = (n, dec = 0) => {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return v.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

export const fmtMoney = (n, dec = 0) => {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return (v < 0 ? '-$' : '$') + num(Math.abs(v), dec);
};
export const fmtNum = (n, dec = 1) => num(n, dec);
export const fmtQty = (q) => {
  const n = Number(q) || 0;
  const dec = Number.isInteger(n) ? 0 : (Math.abs(n) < 10 ? 2 : 1);
  return num(n, dec);
};
export const fmtPayback = (months) => {
  if (!Number.isFinite(months) || months <= 0) return '—';
  if (months < 1) return 'menos de 1 mes';
  if (months < 36) return `${Math.ceil(months)} meses`;
  return `${(months / 12).toFixed(1)} años`;
};
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
