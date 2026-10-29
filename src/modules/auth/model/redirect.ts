import type { Portal } from "@/modules/auth/model/types";
export function safeReturnTo(value: string | null, portal: Portal): string {
  const fallback = portal === "customer" ? "/account/profile" : "/management";
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return fallback;
  const path = value.split(/[?#]/)[0];
  if (portal === "backoffice")
    return (path === "/management" || path.startsWith("/management/")) &&
      path !== "/management/login"
      ? value
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
    ? value
    : fallback;
}
