import { describe, expect, it } from "vitest";
import { hasPermission } from "@/modules/auth/model/permissions";

describe("management permissions", () => {
  it("allows staff to manage products and taxonomy without discount or account permissions", () => {
    expect(hasPermission("staff", "products:write")).toBe(true);
    expect(hasPermission("staff", "taxonomy:write")).toBe(true);
    expect(hasPermission("staff", "promotions:write")).toBe(false);
    expect(hasPermission("staff", "users:read")).toBe(false);
    expect(hasPermission("customer", "products:write")).toBe(false);
    expect(hasPermission("admin", "products:write")).toBe(true);
    expect(hasPermission("admin", "taxonomy:write")).toBe(true);
  });
});
