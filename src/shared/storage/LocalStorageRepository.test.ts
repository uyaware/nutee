import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LocalStorageRepository,
  DB_KEY,
  SESSION_KEYS,
} from "@/shared/storage/LocalStorageRepository";
import { MemoryStorage } from "@/shared/testing/MemoryStorage";
import { databaseSchema } from "@/shared/types/database";
import { createSeed } from "@/shared/storage/seed";

describe("seed consistency", () => {
  it("has the planned counts, valid relations, totals and relative dates", () => {
    const seed = databaseSchema.parse(
      createSeed(new Date("2026-10-02T00:00:00Z")),
    );
    expect(seed.products).toHaveLength(30);
    expect(seed.brands).toHaveLength(6);
    expect(seed.users).toHaveLength(4);
    expect(seed.credentials).toHaveLength(seed.users.length);
    expect(
      seed.credentials.every(
        (credential) => credential.password === "12345678",
      ),
    ).toBe(true);
    expect(seed.orders).toHaveLength(12);
    expect(seed.promotions).toHaveLength(4);
    expect(seed.afterSaleRequests).toHaveLength(6);
    expect(seed.promotions.find((p) => p.code === "NUTEE100")!.endsAt).toBe(
      "2026-11-01T00:00:00.000Z",
    );
    expect(new Set(seed.afterSaleRequests.map((r) => r.status)).size).toBe(6);
  });
  it.each([
    "brand",
    "order-owner",
    "review-owner",
    "cycle",
    "totals",
    "default-address",
  ])("rejects inconsistent %s", (scenario) => {
    const seed = createSeed();
    if (scenario === "brand") seed.products[0].brandId = "missing";
    if (scenario === "order-owner") seed.orders[0].userId = "missing";
    if (scenario === "review-owner") seed.reviews[0].userId = "customer-2";
    if (scenario === "cycle")
      seed.categoryRelations.push({
        id: "cycle",
        parentId: "laptop",
        childId: "electronics",
      });
    if (scenario === "totals") seed.orders[0].total++;
    if (scenario === "default-address")
      seed.addresses.push({ ...seed.addresses[0], id: "duplicate-default" });
    expect(databaseSchema.safeParse(seed).success).toBe(false);
  });
});
describe("local persistence", () => {
  let storage: MemoryStorage;
  let repository: LocalStorageRepository;
  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new LocalStorageRepository(() => storage);
  });
  it("seeds once even with concurrent reads and retains a change through a new instance", async () => {
    await Promise.all([repository.read(), repository.read()]);
    await repository.update(0, (db) => {
      db.products[0].name = "Persistent name";
    });
    const afterReload = await new LocalStorageRepository(() => storage).read();
    expect(afterReload.products[0].name).toBe("Persistent name");
    expect(afterReload.revision).toBe(1);
  });
  it("does not reseed when seedVersion differs", async () => {
    const seed = createSeed();
    seed.seedVersion = 99;
    seed.products[0].name = "Custom data";
    storage.setItem(DB_KEY, JSON.stringify(seed));
    expect((await repository.read()).products[0].name).toBe("Custom data");
  });
  it.each(["not json", '{"schemaVersion":99}', '{"schemaVersion":1}'])(
    "preserves unreadable data %s",
    async (raw) => {
      storage.setItem(DB_KEY, raw);
      await expect(repository.read()).rejects.toMatchObject({
        code: raw.includes("99") ? "UNSUPPORTED_VERSION" : "CORRUPT_DATA",
      });
      expect(storage.getItem(DB_KEY)).toBe(raw);
    },
  );
  it("rejects stale revision and never overwrites the newer value", async () => {
    await repository.read();
    const other = new LocalStorageRepository(() => storage);
    await other.update(0, (db) => {
      db.products[0].name = "Newer";
    });
    await expect(
      repository.update(0, (db) => {
        db.products[0].name = "Stale";
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await repository.read()).products[0].name).toBe("Newer");
  });
  it("serializes same-tab writes and rejects a second stale writer", async () => {
    await repository.read();
    const results = await Promise.allSettled([
      repository.update(0, (db) => {
        db.products[0].stock++;
      }),
      repository.update(0, (db) => {
        db.products[1].stock++;
      }),
    ]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
    expect((await repository.read()).revision).toBe(1);
  });
  it("validates before commit", async () => {
    await repository.read();
    const original = storage.getItem(DB_KEY);
    await expect(
      repository.update(0, (db) => {
        db.products[0].price = -1;
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(storage.getItem(DB_KEY)).toBe(original);
  });
  it("reports quota failure without saving or emitting success", async () => {
    await repository.read();
    const original = storage.getItem(DB_KEY);
    const listener = vi.fn();
    repository.subscribe(listener);
    storage.failWrite = true;
    await expect(
      repository.update(0, (db) => {
        db.products[0].name = "Unsaved";
      }),
    ).rejects.toMatchObject({ code: "STORAGE" });
    expect(storage.getItem(DB_KEY)).toBe(original);
    expect(listener).not.toHaveBeenCalled();
  });
  it("reports blocked storage access", async () => {
    const blocked = new LocalStorageRepository(() => {
      throw new Error("SecurityError");
    });
    await expect(blocked.read()).rejects.toMatchObject({ code: "STORAGE" });
  });
  it("notifies on successful same-tab commit and external updates, and unsubscribes", async () => {
    await repository.read();
    const listener = vi.fn();
    const unsubscribe = repository.subscribe(listener);
    await repository.update(0, (db) => {
      db.products[0].stock++;
    });
    repository.notifyExternalChange();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    repository.notifyExternalChange();
    expect(listener).toHaveBeenCalledTimes(2);
  });
  it("reset restores seed, removes both sessions/guest cart, and keeps unrelated keys", async () => {
    await repository.read();
    await repository.update(0, (db) => {
      db.products[0].name = "Changed";
    });
    repository.set("customer", {
      userId: "customer-1",
      expiresAt: Date.now() + 60000,
    });
    repository.set("backoffice", {
      userId: "admin-1",
      expiresAt: Date.now() + 60000,
    });
    storage.setItem("nutee:cart:guest", "[]");
    storage.setItem("another-app:data", "keep");
    await repository.reset();
    expect((await repository.read()).products[0].name).toBe("MacBook Air M3");
    expect(storage.getItem(SESSION_KEYS.customer)).toBeNull();
    expect(storage.getItem(SESSION_KEYS.backoffice)).toBeNull();
    expect(storage.getItem("nutee:cart:guest")).toBeNull();
    expect(storage.getItem("another-app:data")).toBe("keep");
  });
  it("keeps old data and sessions if reset fails to write", async () => {
    await repository.read();
    repository.set("customer", {
      userId: "customer-1",
      expiresAt: Date.now() + 60000,
    });
    const original = storage.getItem(DB_KEY);
    storage.failWrite = true;
    await expect(repository.reset()).rejects.toMatchObject({ code: "STORAGE" });
    expect(storage.getItem(DB_KEY)).toBe(original);
    expect(repository.get("customer")?.userId).toBe("customer-1");
  });
  it("expired sessions do not authenticate; corrupt session can be cleared independently", () => {
    repository.set("customer", {
      userId: "customer-1",
      expiresAt: Date.now() - 1,
    });
    expect(repository.get("customer")).toBeNull();
    storage.setItem(SESSION_KEYS.customer, "bad");
    expect(() => repository.get("customer")).toThrow();
    repository.remove("customer");
    expect(repository.get("customer")).toBeNull();
  });
});
