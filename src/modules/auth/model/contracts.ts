import type { Portal, User } from "@/shared/types/database";

export interface AuthService {
  register(
    email: string,
    password: string,
  ): Promise<User & { cartMergeNotices?: string[] }>;
  login(
    portal: Portal,
    email: string,
    password: string,
    remember?: boolean,
  ): Promise<User & { cartMergeNotices?: string[] }>;
  currentUser(portal: Portal): Promise<User | null>;
  logout(portal: Portal): Promise<void>;
}
