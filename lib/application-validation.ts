import { normalizeCoupon } from './coupons';
import { applicationPhoneKey } from './phone';
import { normalizeInstagram } from './instagram';
export { applicationPhoneKey } from './phone';

export const APPLICATION_FIELDS = ['name', 'email', 'phone', 'instagram', 'role', 'otherRole', 'revenueRange', 'couponCode', 'whatsappConsent'] as const;
export type ApplicationField = typeof APPLICATION_FIELDS[number];
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;
export const VALIDATION_SUMMARY = 'Confira os campos destacados. Seus dados foram mantidos para você corrigir.';

const messages: Record<ApplicationField, string> = {
  name: 'Informe seu nome com pelo menos 3 letras, sem números ou símbolos. Ex.: Ana Souza.',
  email: 'Informe um e-mail no formato nome@dominio.com, sem espaços.',
  phone: 'Informe um telefone válido com DDD. Ex.: (11) 91234-5678. Não use uma sequência de zeros ou dígitos repetidos.',
  instagram: 'Informe um usuário válido, como @seuperfil, ou o link do seu perfil no Instagram (2 a 30 caracteres no usuário).',
  role: 'Selecione uma das opções de cargo na clínica.',
  otherRole: 'Descreva seu cargo com 2 a 160 caracteres.',
  revenueRange: 'Selecione uma das faixas de faturamento disponíveis.',
  couponCode: 'Cupom não reconhecido. Confira o código ou remova-o para continuar com a inscrição paga.',
  whatsappConsent: 'Ative a autorização de contato pelo WhatsApp para continuar com a inscrição.',
};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function validateApplication(data: Record<string, unknown>): ApplicationErrors {
  const errors: ApplicationErrors = {};
  const name = text(data.name), email = text(data.email), phone = text(data.phone);
  if (name.length > 120 || (name.match(/\p{L}/gu)?.length || 0) < 3 || !/^[\p{L}\p{M} .’'\-]+$/u.test(name)) errors.name = messages.name;
  if (name.length > 120) errors.name = 'O nome deve ter no máximo 120 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) errors.email = messages.email;
  if (email.length > 180) errors.email = 'O e-mail deve ter no máximo 180 caracteres.';
  const key = applicationPhoneKey(phone);
  if (phone.length > 40 || !/^[+\d() .\-]+$/.test(phone) || !/^[1-9]{2}([2-5][0-9]{7}|9[0-9]{8})$/.test(key) || /^9?(\d)\1{7,}$/.test(key.slice(2))) errors.phone = messages.phone;
  if (!normalizeInstagram(data.instagram)) errors.instagram = messages.instagram;
  if (!['doctor', 'owner-manager', 'other'].includes(text(data.role))) errors.role = messages.role;
  if (data.role === 'other' && (text(data.otherRole).length < 2 || text(data.otherRole).length > 160 || /\p{C}/u.test(text(data.otherRole)))) errors.otherRole = messages.otherRole;
  if (!['under-40k', '40k-70k', '70k-100k', 'over-100k'].includes(text(data.revenueRange))) errors.revenueRange = messages.revenueRange;
  if ((data.couponCode !== undefined && typeof data.couponCode !== 'string') || text(data.couponCode).length > 80 || (text(data.couponCode) && !normalizeCoupon(text(data.couponCode)))) errors.couponCode = messages.couponCode;
  if (data.whatsappConsent !== true) errors.whatsappConsent = messages.whatsappConsent;
  return errors;
}

/** Map only known field identifiers, never arbitrary upstream errors/details. */
export function readApplicationErrors(value: unknown): ApplicationErrors {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: ApplicationErrors = {};
  for (const field of APPLICATION_FIELDS) {
    const message = (value as Record<string, unknown>)[field];
    if (typeof message === 'string' && message.length <= 250 && message.trim() && !/\p{C}/u.test(message)) result[field] = message;
  }
  return result;
}

export class ApplicationValidationError extends Error {
  constructor(public readonly fields: ApplicationErrors) {
    super(VALIDATION_SUMMARY);
    this.name = 'ApplicationValidationError';
  }
}
