import { beforeEach, describe, expect, it } from "vitest";
import { createLocalServices } from "@/app/createLocalServices";
import {
  DB_KEY,
  GUEST_CART_KEY,
  LocalStorageRepository,
  SESSION_KEYS,
} from "@/shared/storage/LocalStorageRepository";
import { MemoryStorage } from "@/shared/testing/MemoryStorage";
import { DEMO_PASSWORD } from "@/shared/storage/seed";
import type { Services } from "@/app/serviceContracts";

describe("M3 account and cart", () => {
  let storage: MemoryStorage;
  let repository: LocalStorageRepository;
  let services: Services;
  const login = (email = "customer@nutee.demo") =>
    services.auth.login("customer", email, DEMO_PASSWORD);
  const address = {
    recipient: "Người nhận demo",
    phone: "0912345678",
    line: "123 Đường Mẫu, TP. Hồ Chí Minh",
    isDefault: false,
  };
  beforeEach(async () => {
    storage = new MemoryStorage();
    repository = new LocalStorageRepository(() => storage);
    services = createLocalServices(repository, repository);
    await repository.read();
  });
  it("persists a guest cart without copying product prices or personal data", async () => {
    await services.cart.add("product-1", 2);
    const fresh = new LocalStorageRepository(() => storage);
    const reloaded = createLocalServices(fresh, fresh);
    expect((await reloaded.cart.get()).items[0].quantity).toBe(2);
    expect(
      Object.keys(JSON.parse(storage.getItem(GUEST_CART_KEY)!).items[0]).sort(),
    ).toEqual(["productId", "quantity"]);
    await repository.update(0, (db) => {
      db.products[0].price = 12000000;
    });
    expect((await services.cart.get()).subtotal).toBe(24000000);
  });
  it("merges sums once after login, clears guest only after commit, and isolates logout/user carts", async () => {
    await services.cart.add("product-1", 2);
    const seedQuantity = (await repository.read()).cartItems.find(
      (i) => i.productId === "product-1",
    )!.quantity;
    await login();
    expect(storage.getItem(GUEST_CART_KEY)).toBeNull();
    expect((await services.cart.get()).items[0].quantity).toBe(
      seedQuantity + 2,
    );
    await login();
    expect((await services.cart.get()).items[0].quantity).toBe(
      seedQuantity + 2,
    );
    await services.auth.logout("customer");
    expect((await services.cart.get()).items).toEqual([]);
    await login("customer2@nutee.demo");
    expect((await services.cart.get()).items).toEqual([]);
    await login();
    expect((await services.cart.get()).items[0].quantity).toBe(
      seedQuantity + 2,
    );
  });
  it("keeps the guest cart and leaves the customer logged out when the DB write fails", async () => {
    await services.cart.add("product-1", 2);
    const raw = storage.getItem(GUEST_CART_KEY);
    storage.failWrite = true;
    await expect(login()).rejects.toMatchObject({ code: "STORAGE" });
    expect(storage.getItem(GUEST_CART_KEY)).toBe(raw);
    expect(storage.getItem(SESSION_KEYS.customer)).toBeNull();
    storage.failWrite = false;
    await login();
    expect((await services.cart.get()).quantity).toBe(3);
  });
  it("uses a merge receipt to prevent duplicates when guest cleanup fails", async () => {
    await services.cart.add("product-1", 2);
    const remove = storage.removeItem.bind(storage);
    storage.removeItem = (key) => {
      if (key === GUEST_CART_KEY) throw new Error("Denied");
      remove(key);
    };
    await expect(login()).rejects.toMatchObject({ code: "STORAGE" });
    expect((await repository.read()).cartItems[0].quantity).toBe(3);
    expect(storage.getItem(GUEST_CART_KEY)).not.toBeNull();
    expect((await services.cart.get()).items).toEqual([]);
    storage.removeItem = remove;
    await login();
    expect((await services.cart.get()).quantity).toBe(3);
    expect(storage.getItem(GUEST_CART_KEY)).toBeNull();
  });
  it("does not remerge after session storage fails following a successful merge", async () => {
    await services.cart.add("product-1", 2);
    const set = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === SESSION_KEYS.customer) throw new Error("Denied");
      set(key, value);
    };
    await expect(login()).rejects.toMatchObject({ code: "STORAGE" });
    storage.setItem = set;
    await login();
    expect((await services.cart.get()).quantity).toBe(3);
  });
  it("clamps merge sums to current stock and reports changes/unavailable items", async () => {
    await services.cart.add("product-1", 5);
    await services.cart.add("product-2", 1);
    await repository.update(0, (db) => {
      db.products[0].stock = 2;
      db.products[1].status = "hidden";
    });
    const user = await login();
    expect(user.cartMergeNotices).toHaveLength(2);
    const cart = await services.cart.get();
    expect(cart.items.find((i) => i.productId === "product-1")!.quantity).toBe(
      2,
    );
    expect(cart.items.find((i) => i.productId === "product-2")!.status).toBe(
      "hidden",
    );
    expect(cart.hasIssues).toBe(true);
  });
  it.each([0, -1, 1.5, 100, NaN, Infinity])(
    "rejects invalid quantity %s",
    async (value) => {
      await expect(services.cart.add("product-1", value)).rejects.toMatchObject(
        { code: "VALIDATION" },
      );
      expect(storage.getItem(GUEST_CART_KEY)).toBeNull();
    },
  );
  it("rejects hidden, missing and out-of-stock additions and revalidates existing lines", async () => {
    for (const id of ["product-29", "product-30", "missing"])
      await expect(services.cart.add(id, 1)).rejects.toBeDefined();
    await services.cart.add("product-1", 3);
    await repository.update(0, (db) => {
      db.products[0].stock = 1;
    });
    const cart = await services.cart.get();
    expect(cart.items[0].status).toBe("insufficient-stock");
    await expect(
      services.cart.setQuantity("product-1", 2, cart.revision, null),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await services.cart.setQuantity("product-1", 1, cart.revision, null);
    expect((await services.cart.get()).hasIssues).toBe(false);
  });
  it("rejects stale guest writers and stale user writers without overwriting", async () => {
    await services.cart.add("product-1", 1);
    const guest = await services.cart.get();
    await services.cart.add("product-2", 1);
    await expect(
      services.cart.remove("product-1", guest.revision, null),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await login();
    const cart = await services.cart.get();
    await repository.update(cart.revision, (db) => {
      db.products[0].price++;
    });
    await expect(
      services.cart.setQuantity("product-1", 1, cart.revision, cart.ownerId),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("rejects another user's cart mutation and rechecks active status", async () => {
    await login();
    const cart = await services.cart.get();
    await login("customer2@nutee.demo");
    await expect(
      services.cart.remove("product-1", cart.revision, cart.ownerId),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await repository.update((await repository.read()).revision, (db) => {
      db.users[1].isActive = false;
    });
    await expect(services.cart.add("product-2", 1)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
  it("preserves corrupt guest data and prevents login until explicit recovery", async () => {
    storage.setItem(GUEST_CART_KEY, "{bad");
    await expect(services.cart.get()).rejects.toMatchObject({
      code: "CORRUPT_DATA",
    });
    await expect(login()).rejects.toMatchObject({ code: "CORRUPT_DATA" });
    expect(storage.getItem(GUEST_CART_KEY)).toBe("{bad");
    await repository.reset();
    expect((await services.cart.get()).items).toEqual([]);
  });
  it("backoffice login leaves the guest cart intact", async () => {
    await services.cart.add("product-1", 1);
    const raw = storage.getItem(GUEST_CART_KEY);
    await services.auth.login("backoffice", "staff@nutee.demo", DEMO_PASSWORD);
    expect(storage.getItem(GUEST_CART_KEY)).toBe(raw);
    expect((await services.cart.get()).ownerId).toBeNull();
  });
  it("registers a customer with their own plaintext frontend password, logs in and merges the guest cart once", async () => {
    await services.cart.add("product-1", 2);
    const password = "Personal@456";
    const user = await services.auth.register(" NEW@NUTEE.DEMO ", password);
    expect(user).toMatchObject({
      role: "customer",
      name: "",
      profileCompleted: false,
      email: "new@nutee.demo",
    });
    await expect(
      services.auth.register("new@nutee.demo", password),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(services.auth.register("bad", password)).rejects.toMatchObject(
      {
        code: "VALIDATION",
      },
    );
    expect((await services.cart.get()).ownerId).toBe(user.id);
    expect((await services.cart.get()).quantity).toBe(2);
    expect(await services.auth.currentUser("customer")).toMatchObject({
      id: user.id,
      profileCompleted: false,
    });
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("hash");
    expect(
      (await repository.read()).credentials.find(
        (credential) => credential.userId === user.id,
      ),
    ).toMatchObject({ password });
    expect(storage.getItem(DB_KEY)).not.toContain('"hash"');
    expect(storage.getItem(DB_KEY)).not.toContain('"salt"');
    await services.auth.logout("customer");
    await expect(login(user.email)).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await services.auth.login("customer", user.email, password);
    expect((await services.cart.get()).quantity).toBe(2);
    const fresh = new LocalStorageRepository(() => storage);
    await createLocalServices(fresh, fresh).auth.login(
      "customer",
      user.email,
      password,
    );
    await expect(
      services.auth.login("backoffice", user.email, password),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects short passwords without creating a user or session", async () => {
    await expect(
      services.auth.register("new@nutee.demo", "short"),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { password: expect.any(String) },
    });
    expect((await repository.read()).users).toHaveLength(4);
    expect(await services.auth.currentUser("customer")).toBeNull();
  });
  it.each(["", "   ", undefined])(
    "completes a profile without shipping address %s and keeps the phone number",
    async (line) => {
      const user = await services.auth.register(
        "no-address@nutee.demo",
        "12345678",
      );
      const profile = await services.profile.get();
      const completed = await services.profile.completeProfile(
        { name: "Khách mới", phone: address.phone, line },
        profile.revision,
      );
      expect(completed).toMatchObject({
        id: user.id,
        name: "Khách mới",
        phone: address.phone,
        profileCompleted: true,
      });
      expect((await services.profile.get()).addresses).toEqual([]);
      expect(
        (await services.auth.currentUser("customer"))?.profileCompleted,
      ).toBe(true);
    },
  );
  it("completes name and default address together, preserving incomplete state on invalid input or stale revision", async () => {
    const user = await services.auth.register("new@nutee.demo", "Personal@456");
    const profile = await services.profile.get();
    const input = {
      name: " Người dùng mới ",
      phone: address.phone,
      line: address.line,
    };
    await expect(
      services.profile.completeProfile(
        { ...input, line: "short" },
        profile.revision,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect((await services.profile.get()).user.profileCompleted).toBe(false);
    expect((await services.profile.get()).addresses).toEqual([]);
    await repository.update(profile.revision, (db) => {
      db.products[0].stock += 1;
    });
    await expect(
      services.profile.completeProfile(input, profile.revision),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await services.profile.get()).addresses).toEqual([]);
    const current = await services.profile.get();
    const completed = await services.profile.completeProfile(
      input,
      current.revision,
    );
    expect(completed).toMatchObject({
      id: user.id,
      name: "Người dùng mới",
      profileCompleted: true,
    });
    expect((await services.profile.get()).addresses).toEqual([
      expect.objectContaining({
        userId: user.id,
        recipient: "Người dùng mới",
        phone: input.phone,
        line: input.line,
        isDefault: true,
      }),
    ]);
    expect(
      (await repository.read()).addresses.filter(
        (a) => a.userId === "customer-1",
      ),
    ).toHaveLength(1);
    await expect(
      services.profile.completeProfile(
        input,
        (await services.profile.get()).revision,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("adds, edits and switches default addresses with ownership and snapshots preserved", async () => {
    await login();
    const snapshots = (await repository.read()).orders.map((o) => o.address);
    await services.profile.saveAddress(null, address, 0);
    let profile = await services.profile.get();
    const added = profile.addresses.find(
      (a) => a.recipient === address.recipient,
    )!;
    expect(profile.addresses.filter((a) => a.isDefault)).toHaveLength(1);
    await services.profile.setDefaultAddress(added.id, profile.revision);
    profile = await services.profile.get();
    await services.profile.saveAddress(
      added.id,
      { ...address, line: "456 Đường Mẫu, TP. Hồ Chí Minh" },
      profile.revision,
    );
    profile = await services.profile.get();
    expect(profile.addresses.find((a) => a.id === added.id)?.isDefault).toBe(
      true,
    );
    await services.profile.removeAddress(added.id, profile.revision);
    profile = await services.profile.get();
    expect(profile.addresses[0].isDefault).toBe(true);
    expect((await repository.read()).orders.map((o) => o.address)).toEqual(
      snapshots,
    );
    await expect(
      services.profile.removeAddress("address-2", profile.revision),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      services.profile.saveAddress("address-2", address, profile.revision),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      services.profile.setDefaultAddress("address-2", profile.revision),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("automatically defaults the first address after deleting all, persists, and rejects invalid/stale saves", async () => {
    await login();
    await services.profile.removeAddress("address-1", 0);
    expect((await services.profile.get()).addresses).toEqual([]);
    await expect(
      services.profile.saveAddress(null, { ...address, phone: "abc" }, 1),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { phone: expect.any(String) },
    });
    await services.profile.saveAddress(null, address, 1);
    await expect(
      services.profile.saveAddress(null, address, 1),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const fresh = new LocalStorageRepository(() => storage);
    expect(
      (await createLocalServices(fresh, fresh).profile.get()).addresses[0]
        .isDefault,
    ).toBe(true);
    expect(
      (await repository.read()).addresses.filter(
        (a) => a.userId === "customer-2",
      ),
    ).toHaveLength(1);
  });
  it("reads a pre-M3 envelope without resetting user data", async () => {
    const raw = JSON.parse(storage.getItem(DB_KEY)!);
    delete raw.guestCartMerges;
    raw.users[0].name = "Tên đã sửa trước M3";
    storage.setItem(DB_KEY, JSON.stringify(raw));
    await login();
    expect((await services.profile.get()).user.name).toBe(
      "Tên đã sửa trước M3",
    );
  });
  it("does not write a profile or new address into a different session while a write is queued", async () => {
    await login();
    const savingAddress = services.profile.saveAddress(null, address, 0);
    repository.set("customer", {
      userId: "customer-2",
      expiresAt: Date.now() + 60000,
    });
    await expect(savingAddress).rejects.toMatchObject({ code: "CONFLICT" });
    await login();
    const savingName = services.profile.updateName("Tên chưa được lưu", 0);
    repository.set("customer", {
      userId: "customer-2",
      expiresAt: Date.now() + 60000,
    });
    await expect(savingName).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await repository.read()).addresses).toHaveLength(2);
    expect((await repository.read()).users[1].name).toBe("Hoàng Nam");
  });
});
