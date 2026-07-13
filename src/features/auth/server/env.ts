export function isDevModeEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_MODE === "true";
}

export function isEmailVerificationRequired(): boolean {
  return !isDevModeEnabled();
}
