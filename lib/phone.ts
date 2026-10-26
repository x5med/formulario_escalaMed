/** Remove the country prefix only when explicit or longer than a national number.
 * DDD 55 followed by a local number is a valid Brazilian national number.
 */
export function nationalPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (/^\s*(?:\+55|0055)/.test(value)) digits = digits.replace(/^(?:0055|55)/, "");
  else if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  return digits.replace(/^0+/, "");
}

export function applicationPhoneKey(value: string): string {
  let digits = nationalPhoneDigits(value);
  if (digits.length === 10 && /^[1-9]{2}[6-9]/.test(digits)) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  return digits;
}

export function formatPhoneInput(value: string): string {
  if (!/^[+\d() .\-]*$/.test(value)) return value;
  const digits = nationalPhoneDigits(value);
  // Preserve excessive input for validation instead of silently dropping digits.
  if (digits.length > 11) return value;
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

export function phoneNumberE164(value: string): string {
  const national = applicationPhoneKey(value);
  return /^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(national) ? `+55${national}` : "";
}
