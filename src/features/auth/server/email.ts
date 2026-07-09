import { Resend } from "resend";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

const from = "GeoPilot AI <auth@geopilot.ai>";

function shell(title: string, body: string): string {
  return `
  <div style="margin:0;background:#080b12;padding:40px 0;font-family:Inter,Arial,sans-serif;color:#f8fafc">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:32px">
        <tr><td>
          <div style="font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:#38bdf8;font-weight:700">GeoPilot AI</div>
          <h1 style="margin:18px 0 12px;font-size:28px;line-height:1.2;color:#fff">${title}</h1>
          <div style="font-size:15px;line-height:1.7;color:#cbd5e1">${body}</div>
          <p style="margin-top:28px;font-size:12px;color:#64748b">如果这不是你本人操作，可以安全忽略此邮件。</p>
        </td></tr>
      </table>
    </td></tr></table>
  </div>`;
}

export async function sendVerificationCodeEmail(email: string, code: string): Promise<void> {
  const resend = getResend();
  const html = shell("验证你的邮箱", `<p>你的 GeoPilot AI 邮箱验证码是：</p><div style="margin:20px 0;padding:18px 24px;border-radius:16px;background:#111827;border:1px solid rgba(56,189,248,.25);font-size:32px;letter-spacing:.35em;font-weight:800;color:#38bdf8;text-align:center">${code}</div><p>验证码将在 15 分钟后过期。</p>`);

  if (!resend) {
    console.info("[auth:email] resend missing, verification code logged locally", { email, resendApiKeyPresent: false });
    console.info(`[auth] Verification code for ${email}: ${code}`);
    return;
  }

  try {
    const result = await resend.emails.send({ from, to: email, subject: "验证你的 GeoPilot AI 邮箱", html });
    console.info("[auth:email] verification email sent", { email, result });
  } catch (error) {
    console.error("[auth:email] verification email failed", {
      email,
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    });
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const resend = getResend();
  const html = shell("重置你的密码", `<p>请使用下方安全链接重置你的 GeoPilot AI 密码。链接将在 30 分钟后过期。</p><p style="margin:24px 0"><a href="${resetUrl}" style="display:inline-block;background:#38bdf8;color:#020617;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">重置密码</a></p><p style="word-break:break-all;color:#94a3b8">${resetUrl}</p>`);

  if (!resend) {
    console.info("[auth:email] resend missing, password reset logged locally", { email, resendApiKeyPresent: false });
    console.info(`[auth] Password reset for ${email}: ${resetUrl}`);
    return;
  }

  try {
    const result = await resend.emails.send({ from, to: email, subject: "重置你的 GeoPilot AI 密码", html });
    console.info("[auth:email] password reset email sent", { email, result });
  } catch (error) {
    console.error("[auth:email] password reset email failed", {
      email,
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    });
    throw error;
  }
}
