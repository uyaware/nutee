import { useEffect } from "react";
import { ServiceError } from "@/shared/lib/errors";

const errors = new Set<symbol>();
const listeners = new Set<() => void>();

export function subscribeSystemErrors(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function hasReportedSystemError() {
    return errors.size > 0;
}

export function useReportSystemError(error: unknown) {
    useEffect(() => {
        if (!(error instanceof ServiceError) || error.code !== "NETWORK") return;
        const id = Symbol();
        errors.add(id);
        listeners.forEach((listener) => listener());
        return () => {
            errors.delete(id);
            listeners.forEach((listener) => listener());
        };
    }, [error]);
}
