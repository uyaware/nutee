import { LocalStorageRepository } from "../repositories/local/LocalStorageRepository";
import { createServices } from "./createServices";
import { createApiAuth } from "./apiAuth";
import { mergeGuestItems } from "./cart";
import { createId } from "../shared/lib/id";
import type { SessionRepository } from "../repositories/contracts";
import type { Portal, Session } from "../shared/types/database";

// Authentication uses the backend. Other domains still use their existing local adapters.
export const localRepository = new LocalStorageRepository();
// Keep the prototype's actor in the same tab as its actual API session.
const actors = new Map<Portal, Session>();
const sessions: SessionRepository = {
  get: (portal) => actors.get(portal) ?? null,
  set(portal, session) {
    actors.set(portal, session);
    localRepository.notifyExternalChange();
  },
  remove(portal) {
    if (actors.delete(portal)) localRepository.notifyExternalChange();
  },
};
const localServices = createServices(localRepository, sessions);
const auth = createApiAuth({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  persistent: () => window.localStorage,
  temporary: () => window.sessionStorage,
  async onUser(user, portal, expiresAt, newLogin) {
    const db = await localRepository.read();
    const existing = db.users.find((item) => item.id === user.id);
    // Cache only safe user data for the existing catalog/cart/profile prototype.
    if (
      !existing ||
      existing.email !== user.email ||
      existing.role !== user.role ||
      !existing.isActive
    ) {
      await localRepository.update(db.revision, (current) => {
        const index = current.users.findIndex((item) => item.id === user.id);
        if (index < 0) current.users.push(user);
        else
          current.users[index] = {
            ...current.users[index],
            email: user.email,
            role: user.role,
            isActive: true,
          };
        if (
          portal === "customer" &&
          !current.carts.some((cart) => cart.userId === user.id)
        ) {
          current.carts.push({ id: createId(), userId: user.id });
        }
      });
    }
    if (newLogin && portal === "customer") {
      await localRepository.mergeGuest(user.id, (current, guest) => {
        mergeGuestItems(current, guest, user.id);
      });
    }
    const session = sessions.get(portal);
    if (session?.userId !== user.id || session.expiresAt !== expiresAt) {
      sessions.set(portal, { userId: user.id, expiresAt });
    }
  },
  onClear(portal) {
    sessions.remove(portal);
  },
});
export const services = {
  ...localServices,
  auth,
  demo: {
    ...localServices.demo,
    async reset() {
      await Promise.allSettled([
        auth.logout("customer"),
        auth.logout("backoffice"),
      ]);
      await localServices.demo.reset();
    },
  },
};
