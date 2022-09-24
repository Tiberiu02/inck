export function GenerateRandomString(): string {
  return Date.now().toString(36) + performance.now().toString(36).replaceAll(".", "");
}
