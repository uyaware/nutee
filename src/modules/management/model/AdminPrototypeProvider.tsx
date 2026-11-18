import { unavailableMessage } from "@/shared/api/unavailable";
import { useState } from "react";
import type { ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";
import { createAdminPrototype } from "@/modules/management/fixtures/admin";
import { AdminPrototypeContext } from "@/modules/management/model/adminPrototypeContext";
import { toastAppearance, toastPosition } from "@/shared/components/toastStyles";

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
        autoHideDuration={3000}
        transitionDuration={250}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={toastPosition}
        onClose={() => setMessage("")}
      >
        <Alert
          severity="warning"
          icon={false}
          onClose={() => setMessage("")}
          sx={toastAppearance("warning")}
        >
          {message}
        </Alert>
      </Snackbar>
    </AdminPrototypeContext.Provider>
  );
}
