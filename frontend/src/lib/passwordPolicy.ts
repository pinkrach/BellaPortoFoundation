export const MIN_PASSWORD_LENGTH = 14;

export const PASSWORD_REQUIREMENT_TEXT =
  "Security Requirement: Password must be at least 14 characters long (no symbols or caps required).";

export const PASSWORD_LENGTH_ERROR_TEXT = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;

export function passwordMeetsPolicy(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
