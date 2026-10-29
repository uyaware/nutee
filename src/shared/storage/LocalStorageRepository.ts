import { z } from "zod";
import { createSeed } from "@/shared/storage/seed";
import { databaseSchema } from "@/shared/types/database";
import type { Database, Portal, Session } from "@/shared/types/database";
import { ServiceError } from "@/shared/lib/errors";
import { createId } from "@/shared/lib/id";
import { guestCartSchema } from "@/modules/cart/model/types";
import type { GuestCart } from "@/modules/cart/model/types";
import type {
  DataRepository,
  SessionRepository,
  StorageLike,
  GuestCartRepository,
} from "@/shared/storage/contracts";

export const DB_KEY = "nutee:db:v1";
export const GUEST_CART_KEY = "nutee:cart:guest";
export const SESSION_KEYS = {
  customer: "nutee:session:customer",
  backoffice: "nutee:session:backoffice",
} as const;
export const OWNED_KEYS = [
  DB_KEY,
  SESSION_KEYS.customer,
  SESSION_KEYS.backoffice,
  GUEST_CART_KEY,
  "nutee:auth:customer",
  "nutee:auth:backoffice",
];
const sessionSchema = z.object({
  userId: z.string().min(1),
  expiresAt: z.number().positive(),
});

export class LocalStorageRepository
  implements DataRepository, SessionRepository, GuestCartRepository
{
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: () => StorageLike = () => window.localStorage) {}
  private access<T>(fn: (storage: StorageLike) => T): T {
    try {
      return fn(this.storage());
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        "STORAGE",
        "Không thể truy cập hoặc lưu dữ liệu trình duyệt. Kiểm tra quyền lưu trữ/dung lượng rồi thử lại.",
      );
    }
  }
  private publish() {
    this.listeners.forEach((listener) => listener());
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  // The app owns the browser listener so subscriptions also work with injected storage in tests.
  notifyExternalChange() {
    this.publish();
  }
  private parse(raw: string): Database {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new ServiceError(
        "CORRUPT_DATA",
        "Dữ liệu không hợp lệ. Xuất bản sao trước khi đặt lại dữ liệu.",
      );
    }
    if (
      typeof value === "object" &&
      value !== null &&
      "schemaVersion" in value &&
      value.schemaVersion !== 1
    ) {
      throw new ServiceError(
        "UNSUPPORTED_VERSION",
        "Phiên bản dữ liệu chưa được hỗ trợ. Dữ liệu cũ vẫn được giữ; xuất bản sao hoặc dùng đúng phiên bản ứng dụng.",
      );
    }
    const parsed = databaseSchema.safeParse(value);
    if (!parsed.success)
      throw new ServiceError(
        "CORRUPT_DATA",
        "Cấu trúc hoặc liên kết dữ liệu không hợp lệ. Dữ liệu gốc vẫn được giữ để khôi phục.",
      );
    return parsed.data;
  }
  private async exclusive<T>(work: () => T | Promise<T>): Promise<T> {
    const run = () =>
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request("nutee:database-write", work)
        : Promise.resolve().then(work);
    const task = this.queue.then(run, run);
    this.queue = task.catch(() => undefined);
    return task;
  }
  async read(): Promise<Database> {
    const raw = this.access((s) => s.getItem(DB_KEY));
    if (raw !== null) return this.parse(raw);
    return this.exclusive(() => {
      const current = this.access((s) => s.getItem(DB_KEY));
      if (current !== null) return this.parse(current);
      const seed = databaseSchema.parse(createSeed());
      this.access((s) => s.setItem(DB_KEY, JSON.stringify(seed)));
      this.publish();
      return seed;
    });
  }
  async update(
    expectedRevision: number,
    change: (db: Database) => void,
  ): Promise<Database> {
    return this.exclusive(() => {
      const raw = this.access((s) => s.getItem(DB_KEY));
      if (raw === null)
        throw new ServiceError(
          "CONFLICT",
          "Dữ liệu đã được đặt lại. Tải lại trước khi lưu.",
        );
      const current = this.parse(raw);
      if (current.revision !== expectedRevision)
        throw new ServiceError(
          "CONFLICT",
          "Dữ liệu đã thay đổi ở tab khác. Tải lại và kiểm tra trước khi lưu.",
        );
      change(current);
      current.revision++;
      const validated = databaseSchema.safeParse(current);
      if (!validated.success)
        throw new ServiceError(
          "VALIDATION",
          "Thay đổi làm dữ liệu không hợp lệ. Chưa lưu dữ liệu.",
        );
      this.access((s) => s.setItem(DB_KEY, JSON.stringify(validated.data)));
      this.publish();
      return validated.data;
    });
  }
  private guest(db: Database): GuestCart {
    const raw = this.access((s) => s.getItem(GUEST_CART_KEY));
    if (raw !== null) {
      let parsed;
      try {
        parsed = guestCartSchema.safeParse(JSON.parse(raw));
      } catch {
        /* Keep corrupt data for explicit recovery. */
      }
      if (!parsed?.success)
        throw new ServiceError(
          "CORRUPT_DATA",
          "Giỏ khách bị lỗi. Dữ liệu vẫn được giữ; xuất bản sao hoặc đặt lại dữ liệu tại đây để khôi phục.",
        );
      if (!db.guestCartMerges.some((m) => m.id === parsed.data.id))
        return parsed.data;
    }
    return { id: createId(), revision: 0, items: [] };
  }
  async readGuest() {
    return this.guest(await this.read());
  }
  async updateGuest(
    expectedRevision: number,
    change: (cart: GuestCart, db: Database) => void,
  ) {
    await this.read();
    await this.exclusive(() => {
      const raw = this.access((s) => s.getItem(DB_KEY));
      if (raw === null)
        throw new ServiceError(
          "CONFLICT",
          "Dữ liệu đã được đặt lại. Tải lại giỏ hàng.",
        );
      const db = this.parse(raw);
      const cart = this.guest(db);
      if (cart.revision !== expectedRevision)
        throw new ServiceError(
          "CONFLICT",
          "Giỏ hàng đã thay đổi ở tab khác. Tải lại trước khi sửa.",
        );
      change(cart, db);
      cart.revision++;
      const validated = guestCartSchema.safeParse(cart);
      if (!validated.success)
        throw new ServiceError(
          "VALIDATION",
          "Giỏ hàng không hợp lệ. Chưa lưu thay đổi.",
        );
      this.access((s) =>
        s.setItem(GUEST_CART_KEY, JSON.stringify(validated.data)),
      );
      this.publish();
    });
  }
  async mergeGuest(
    userId: string,
    change: (db: Database, cart: GuestCart) => void,
  ) {
    await this.read();
    await this.exclusive(() => {
      const raw = this.access((s) => s.getItem(DB_KEY));
      if (raw === null)
        throw new ServiceError(
          "CONFLICT",
          "Dữ liệu đã được đặt lại. Thử đăng nhập lại.",
        );
      const db = this.parse(raw);
      const cart = this.guest(db);
      // The callback always rechecks the account, including empty/retried merges.
      change(db, cart);
      if (cart.items.length) {
        db.guestCartMerges.push({ id: cart.id, userId });
        db.revision++;
        const validated = databaseSchema.safeParse(db);
        if (!validated.success)
          throw new ServiceError(
            "VALIDATION",
            "Không thể gộp giỏ hàng. Giỏ khách vẫn được giữ.",
          );
        this.access((s) => s.setItem(DB_KEY, JSON.stringify(validated.data)));
      }
      // A receipt in the same DB commit prevents duplicates if this removal fails.
      this.access((s) => s.removeItem(GUEST_CART_KEY));
      this.publish();
    });
  }
  get(portal: Portal): Session | null {
    const raw = this.access((s) => s.getItem(SESSION_KEYS[portal]));
    if (raw === null) return null;
    try {
      const session = sessionSchema.parse(JSON.parse(raw));
      return session.expiresAt > Date.now() ? session : null;
    } catch {
      throw new ServiceError(
        "CORRUPT_DATA",
        "Phiên đăng nhập bị lỗi. Vui lòng đăng xuất rồi đăng nhập lại.",
      );
    }
  }
  set(portal: Portal, session: Session) {
    this.access((s) =>
      s.setItem(
        SESSION_KEYS[portal],
        JSON.stringify(sessionSchema.parse(session)),
      ),
    );
    this.publish();
  }
  remove(portal: Portal) {
    this.access((s) => s.removeItem(SESSION_KEYS[portal]));
    this.publish();
  }
  async reset() {
    await this.exclusive(() => {
      // Build and validate before touching storage; overwrite DB first so quota failure keeps existing data.
      const seed = databaseSchema.parse(createSeed());
      this.access((s) => s.setItem(DB_KEY, JSON.stringify(seed)));
      this.access((s) => {
        OWNED_KEYS.filter((key) => key !== DB_KEY).forEach((key) =>
          s.removeItem(key),
        );
      });
      this.publish();
    });
  }
  exportRaw() {
    return this.access((s) => s.getItem(DB_KEY)) ?? "";
  }
}
