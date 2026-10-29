import type { Portal, User } from "@/modules/auth/model/types";

export interface AuthService {
  register(email: string, password: string): Promise<User>;
  login(
    portal: Portal,
    email: string,
    password: string,
    remember?: boolean,
  ): Promise<User>;
  currentUser(portal: Portal): Promise<User | null>;
  logout(portal: Portal): Promise<void>;
  googleNonce(): Promise<{ nonce: string }>;
  google(credential: string, remember?: boolean): Promise<User>;
  forgotPassword(email: string): Promise<{ message: string }>;
  resetPassword(token: string, password: string): Promise<void>;
}
