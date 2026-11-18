export function reportSuccessToast(message: string) {
    window.dispatchEvent(new CustomEvent<string>("nutee:success", { detail: message }));
}
