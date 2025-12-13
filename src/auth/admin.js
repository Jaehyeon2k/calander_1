export const ADMIN_EMAILS = new Set([
  "wmspfl2673@gmail.com", // 너 이메일
]);

export function isAdmin(email) {
  return !!email && ADMIN_EMAILS.has(String(email).toLowerCase());
}
