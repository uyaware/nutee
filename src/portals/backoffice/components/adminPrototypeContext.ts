import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AdminPrototype } from "../../../mocks/admin";

export const AdminPrototypeContext = createContext<{
  data: AdminPrototype;
  setData: Dispatch<SetStateAction<AdminPrototype>>;
  notify: (message: string) => void;
} | null>(null);

export function useAdminPrototype() {
  const context = useContext(AdminPrototypeContext);
  if (!context) throw new Error("M6 requires the admin prototype provider");
  return context;
}
