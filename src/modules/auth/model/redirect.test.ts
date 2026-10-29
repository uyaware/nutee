import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/modules/auth/model/redirect";

describe("return URL stays within its portal", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/management/users",
    "/login",
  ])("rejects customer return URL %s", (value) => {
    expect(safeReturnTo(value, "customer")).toBe("/account/profile");
  });
  it("keeps valid path and query for each portal", () => {
    expect(safeReturnTo("/account/orders?tab=all", "customer")).toBe(
      "/account/orders?tab=all",
    );
    expect(safeReturnTo("/management/products", "backoffice")).toBe(
      "/management/products",
    );
    expect(safeReturnTo("/management/login", "backoffice")).toBe("/management");
  });
});
