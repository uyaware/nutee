import type { Portal, Role } from "../types/database";
export type Permission =
  | "catalog:read"
  | "profile:own"
  | "orders:own"
  | "operations:read"
  | "products:write"
  | "promotions:write"
  | "users:read";
export const permissions: Record<Role, readonly Permission[]> = {
  customer: ["catalog:read", "profile:own", "orders:own"],
  staff: ["catalog:read", "operations:read"],
  admin: [
    "catalog:read",
    "operations:read",
    "products:write",
    "promotions:write",
    "users:read",
  ],
};
export const hasPermission = (role: Role, permission: Permission) =>
  permissions[role].includes(permission);
export const belongsToPortal = (role: Role, portal: Portal) =>
  portal === "customer"
    ? role === "customer"
    : role === "staff" || role === "admin";
export const roleLabels: Record<Role, string> = {
  customer: "Khách hàng",
  staff: "Nhân viên",
  admin: "Quản trị viên",
};
