const coupons = new Map([
  ["fabio", "Fabio"],
  ["patricio", "Patricio"],
  ["patricia", "Patricia"],
  ["vital", "Vital"],
  ["tainara", "Tainara"],
  ["convite", "Convite"],
  ["escalamed", "EscalaMed"],
  ["jimi", "Jimi"],
  ["felipe", "Felipe"],
  ["cs", "CS"],
  ["bioma100", "Bioma100"],
  ["saude", "SAUDE"],
  ["lpescalamed", "LPESCALAMED"],
  ["terapeutica", "Terapeutica"],
  ["varanda", "Varanda"],
]);

export function normalizeCoupon(value: string): string | null {
  const key = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
  return coupons.get(key) ?? null;
}

export function formatCouponInput(value: string): string {
  return normalizeCoupon(value) ?? value;
}

/** Explicit valid URL coupon wins on initial load only; invalid URLs preserve the draft. */
export function initialCouponCode(search: string, draftCoupon = ""): string {
  const params = new URLSearchParams(search);
  return normalizeCoupon(params.get("cupom") || params.get("coupon") || "") ?? draftCoupon;
}
