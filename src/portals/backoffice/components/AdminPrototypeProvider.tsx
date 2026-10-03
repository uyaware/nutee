import { useState } from "react";
import type { ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";
import { createAdminPrototype } from "../../../mocks/admin";
import { AdminPrototypeContext } from "./adminPrototypeContext";

export function AdminPrototypeProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(createAdminPrototype);
  const [message, setMessage] = useState("");
  return (
    <AdminPrototypeContext.Provider
      value={{ data, setData, notify: setMessage }}
    >
      {children}
      <Snackbar
        open={!!message}
        autoHideDuration={5000}
        onClose={() => setMessage("")}
      >
        <Alert
          severity="success"
          onClose={() => setMessage("")}
          sx={{ width: "100%" }}
        >
          {message} · Bản xem thử
        </Alert>
      </Snackbar>
    </AdminPrototypeContext.Provider>
  );
}
