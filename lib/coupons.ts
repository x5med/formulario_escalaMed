const coupons = new Map([
  ["fabio", "Fabio"],
  ["patricio", "Patricio"],
  ["patricia", "Patricia"],
  ["vital", "Vital"],
  ["tainara", "Tainara"],
  ["convite", "Convite"],
  ["escalamed", "EscalaMed"],
]);

export function normalizeCoupon(value: string): string | null {
  const key = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
  return coupons.get(key) ?? null;
}

export function formatCouponInput(value: string): string {
  return normalizeCoupon(value) ?? value;
}
