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
  if (!input.turnstileValid) throw new Error("请先完成人机验证");
  if (!input.rateLimitValid) throw new Error("请求过于频繁，请稍后再试");
  if (!input.userExists) throw new Error("发送短信前必须完成用户存在性校验");
  if (!isValidPhoneNumber(input.phone)) throw new Error("手机号格式无效");
  await input.provider.send({ to: input.phone, body: input.body });
}

