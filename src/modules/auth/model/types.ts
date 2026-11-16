export type Portal = "customer" | "backoffice";
export type Role = "customer" | "staff" | "admin";

export interface VerificationState {
  email: string;
  expiresIn: number;
  resendAfter: number;
  mailSent: boolean;
  message: string;
}

/** Dữ liệu hiển thị từ API người dùng; chỉ giữ trong bộ nhớ của giao diện. */
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  name: string;
  role: Role;
  emailVerified: boolean;
  imageUrl: string | null;
}
