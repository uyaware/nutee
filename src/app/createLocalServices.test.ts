import { beforeEach, describe, expect, it } from "vitest";
import { createLocalServices } from "@/app/createLocalServices";
import { LocalStorageRepository } from "@/shared/storage/LocalStorageRepository";
import { MemoryStorage } from "@/shared/testing/MemoryStorage";
import { DEMO_PASSWORD } from "@/shared/storage/seed";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import type { Services } from "@/app/serviceContracts";

describe("service permissions and sessions", () => {
  let repository: LocalStorageRepository;
  let services: Services;
  beforeEach(() => {
    const storage = new MemoryStorage();
    repository = new LocalStorageRepository(() => storage);
    services = createLocalServices(repository, repository);
  });
  it("isolates sessions and logout per portal", async () => {
    await services.auth.login("customer", "customer@nutee.demo", DEMO_PASSWORD);
    await services.auth.login("backoffice", "admin@nutee.demo", DEMO_PASSWORD);
    await services.auth.logout("customer");
    expect(await services.auth.currentUser("customer")).toBeNull();
    expect((await services.auth.currentUser("backoffice"))?.role).toBe("admin");
  });
  it("rejects wrong portal roles and invalid credentials", async () => {
    await expect(
      services.auth.login("backoffice", "customer@nutee.demo", DEMO_PASSWORD),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      services.auth.login("customer", "admin@nutee.demo", DEMO_PASSWORD),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      services.auth.login("customer", "customer@nutee.demo", "bad"),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("only exposes owned orders to customers and rejects ID substitution", async () => {
    await services.auth.login("customer", "customer@nutee.demo", DEMO_PASSWORD);
    const orders = await services.orders.list("customer");
    expect(orders.items).toHaveLength(6);
    expect(orders.items.every((o) => o.userId === "customer-1")).toBe(true);
    await expect(
      services.orders.detail("customer", "order-2"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("staff can read operations but cannot read users or edit products", async () => {
    await services.auth.login("backoffice", "staff@nutee.demo", DEMO_PASSWORD);
    expect((await services.orders.list("backoffice")).total).toBe(12);
    expect((await services.management.dashboard()).paidRevenue).toBeNull();
    await expect(services.management.users()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      services.management.updateProduct(
        "product-1",
        { name: "Forbidden", price: 10000, status: "hidden" },
        0,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await repository.read()).revision).toBe(0);
  });
  it("rechecks active status and role from latest DB inside mutation", async () => {
    await services.auth.login("backoffice", "admin@nutee.demo", DEMO_PASSWORD);
    await repository.update(0, (db) => {
      db.users.find((u) => u.id === "admin-1")!.role = "staff";
    });
    await expect(
      services.management.updateProduct(
        "product-1",
        { name: "Forbidden", price: 10000, status: "published" },
        1,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await repository.update(1, (db) => {
      db.users.find((u) => u.id === "admin-1")!.isActive = false;
    });
    expect(await services.auth.currentUser("backoffice")).toBeNull();
  });
  it("admin changes are visible publicly, hidden products are excluded and snapshots stay intact", async () => {
    await services.auth.login("backoffice", "admin@nutee.demo", DEMO_PASSWORD);
    await services.management.updateProduct(
      "product-1",
      { name: "Updated MacBook", price: 12000000, status: "published" },
      0,
    );
    expect((await services.catalog.featured())[0].name).toBe("Updated MacBook");
    expect((await repository.read()).orderItems[0].name).toBe("MacBook Air M3");
    expect((await repository.read()).orderItems[0].price).toBe(24990000);
    await services.management.updateProduct(
      "product-1",
      { name: "Updated MacBook", price: 12000000, status: "hidden" },
      1,
    );
    expect(
      (await services.catalog.featured()).some((p) => p.id === "product-1"),
    ).toBe(false);
  });
  it("profile updates only affect the authenticated customer and reject invalid input", async () => {
    await services.auth.login("customer", "customer@nutee.demo", DEMO_PASSWORD);
    await expect(services.profile.updateName("", 0)).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await services.profile.updateName("Demo Name", 0);
    expect((await services.profile.get()).user.name).toBe("Demo Name");
    expect(
      (await repository.read()).users.find((u) => u.id === "customer-2")!.name,
    ).toBe("Hoàng Nam");
  });
});
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
