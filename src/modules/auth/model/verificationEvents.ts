const listeners = new Set<() => void>();

export function requestEmailVerification() {
    listeners.forEach((listener) => listener());
}

export function subscribeEmailVerification(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
