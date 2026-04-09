export const formatDdMmYyyyDot = (yyyyMmDd) => {
  if (!yyyyMmDd) return "";
  const [y, m, d] = String(yyyyMmDd).split("-");
  if (!y || !m || !d) return String(yyyyMmDd);
  return `${d}.${m}.${y}`;
};