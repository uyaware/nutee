import type { Portal } from "@/modules/auth/model/types";
export function safeReturnTo(value: string | null, portal: Portal): string {
  const fallback = portal === "customer" ? "/account/profile" : "/management";
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    /%2f|%5c|%0[0-9a-f]|%1[0-9a-f]|%7f/i.test(value)
  )
    return fallback;
  const normalized = new URL(value, "https://nutee.invalid");
  if (normalized.origin !== "https://nutee.invalid") return fallback;
  let path: string;
  try {
    path =
      decodeURIComponent(normalized.pathname)
        .toLowerCase()
        .replace(/\/+$/, "") || "/";
  } catch {
    return fallback;
  }
  const target = normalized.pathname + normalized.search + normalized.hash;
  if (portal === "backoffice")
    return (path === "/management" || path.startsWith("/management/")) &&
      path !== "/management/login"
      ? target
      : fallback;
  return ![
    "/login",
    "/register",
    "/account/setup",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
  ].includes(path) &&
    path !== "/management" &&
    !path.startsWith("/management/")
    ? target
    : fallback;
}
