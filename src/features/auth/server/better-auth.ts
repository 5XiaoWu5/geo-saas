import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/features/auth/server/prisma";
import { hashPassword, verifyPassword } from "@/features/auth/server/password";
import { SESSION_MAX_AGE_SECONDS } from "@/features/auth/server/constants";
import { sendPasswordResetEmail, sendVerificationCodeEmail } from "@/features/auth/server/email";

export const auth = betterAuth({
  appName: "GeoPilot AI",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  session: {
    expiresIn: SESSION_MAX_AGE_SECONDS,
    updateAge: 24 * 60 * 60,
    cookieCache: { enabled: false },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    password: {
      hash: hashPassword,
      verify: async ({ hash, password }) => verifyPassword(hash, password),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, token }) => {
      await sendVerificationCodeEmail(user.email, token);
    },
  },
  advanced: {
    cookiePrefix: "geopilot",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
});
