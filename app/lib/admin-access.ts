export const ADMIN_EMAILS = [
  "kangbyeongyeon05@gmail.com",
  "gim67507@gmail.com",
] as const;

export function isAdminEmail(email: string | null | undefined) {
  return typeof email === "string" && ADMIN_EMAILS.some((adminEmail) => adminEmail === email.toLowerCase());
}
