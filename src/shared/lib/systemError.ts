import { useEffect } from "react";
import { isSystemError } from "@/shared/lib/errors";

const errors = new Set<symbol>();
const listeners = new Set<() => void>();

export function subscribeSystemErrors(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function hasReportedSystemError() {
    return errors.size > 0;
}

export function useReportSystemError(error: unknown) {
    useEffect(() => {
        if (!isSystemError(error)) return;
        const id = Symbol();
        errors.add(id);
        listeners.forEach((listener) => listener());
        return () => {
            errors.delete(id);
            listeners.forEach((listener) => listener());
        };
    }, [error]);
}
