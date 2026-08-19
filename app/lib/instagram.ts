export const DUPLICATE_INSTAGRAM_MESSAGE = "이미 제출된 인스타그램 아이디입니다. 한 아이디로 한 번만 제출할 수 있어요.";

export function normalizeInstagramId(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}
