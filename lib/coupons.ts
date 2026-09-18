const coupons = new Map([
  ["fabio", "Fabio"],
  ["patricio", "Patricio"],
  ["patricia", "Patricia"],
  ["vital", "Vital"],
  ["tainara", "Tainara"],
  ["convite", "Convite"],
]);

export function normalizeCoupon(value: string): string | null {
  const key = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return coupons.get(key) ?? null;
}
