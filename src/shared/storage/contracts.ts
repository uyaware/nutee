import type { Database, Portal, Session } from "@/shared/types/database";
import type { GuestCart } from "@/modules/cart/model/types";

export interface GuestCartRepository {
  readGuest(): Promise<GuestCart>;
  updateGuest(
    expectedRevision: number,
    change: (cart: GuestCart, db: Database) => void,
  ): Promise<void>;
  mergeGuest(
    userId: string,
    change: (db: Database, cart: GuestCart) => void,
  ): Promise<void>;
}

export interface DataRepository {
  read(): Promise<Database>;
  update(
    expectedRevision: number,
    change: (db: Database) => void,
  ): Promise<Database>;
  reset(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
export interface SessionRepository {
  get(portal: Portal): Session | null;
  set(portal: Portal, session: Session): void;
  remove(portal: Portal): void;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
