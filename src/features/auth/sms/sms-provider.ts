export type SmsMessage = {
  to: string;
  body: string;
};

export interface SmsProvider {
  send(message: SmsMessage): Promise<void>;
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export async function guardedSmsSend(input: { phone: string; turnstileValid: boolean; rateLimitValid: boolean; userExists: boolean; provider: SmsProvider; body: string }) {
  if (!input.turnstileValid) throw new Error("Turnstile verification required.");
  if (!input.rateLimitValid) throw new Error("Rate limit exceeded.");
  if (!input.userExists) throw new Error("User existence check required.");
  if (!isValidPhoneNumber(input.phone)) throw new Error("Invalid phone number.");
  await input.provider.send({ to: input.phone, body: input.body });
}
