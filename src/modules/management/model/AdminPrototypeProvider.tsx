import { unavailableMessage } from "@/shared/api/unavailable";
import { useState } from "react";
import type { ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";
import { createAdminPrototype } from "@/modules/management/fixtures/admin";
import { AdminPrototypeContext } from "@/modules/management/model/adminPrototypeContext";

export function AdminPrototypeProvider({ children }: { children: ReactNode }) {
  const [data] = useState(createAdminPrototype);
  const [message, setMessage] = useState("");
  return (
    <AdminPrototypeContext.Provider
      value={{
        data,
        setData: () => setMessage(unavailableMessage),
        notify: () => setMessage(unavailableMessage),
      }}
    >
      {children}
      <Snackbar
        open={!!message}
        autoHideDuration={5000}
        onClose={() => setMessage("")}
      >
        <Alert
          severity="warning"
          onClose={() => setMessage("")}
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </AdminPrototypeContext.Provider>
  );
}
