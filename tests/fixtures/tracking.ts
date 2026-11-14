import type { Page } from "@playwright/test";

export async function captureTracking(page: Page) {
    const events: { name: string; properties: Record<string, unknown> }[] = [];
    await page.exposeFunction("recordTracking", (name: string, properties: Record<string, unknown>) => {
        events.push({ name, properties });
    });
    // Replace only the transport: UI effects and mutation callbacks run normally.
    await page.route("**/src/shared/analytics/posthog.ts*", (route) => route.fulfill({
        contentType: "application/javascript",
        body: `export function initPostHog() {}
export function trackEvent(name, properties) { window.recordTracking(name, properties); }`,
    }));
    return events;
}
