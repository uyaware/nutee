import { createContext, useContext } from "react";

export const CustomerModeContext = createContext({
    mode: "dark" as "light" | "dark",
    toggle: () => {},
});

export function useCustomerMode() {
    return useContext(CustomerModeContext);
}
