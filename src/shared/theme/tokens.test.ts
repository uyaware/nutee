import { describe, expect, it } from "vitest";
import { tokens } from "@/shared/theme/tokens";
function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
describe("brand theme WCAG text contrast", () => {
  const c = tokens.color;
  it.each([
    ["primary button", c.surface, c.blue],
    ["brand panel", c.surface, c.charcoal],
    ["primary body", c.ink, c.surface],
    ["secondary body", c.muted, c.surface],
    ["secondary tinted surface", c.muted, c.blueTint],
    ["primary price", c.blue, c.surface],
    ["success", c.success, c.surface],
    ["warning", c.warning, c.surface],
    ["error", c.error, c.surface],
  ])("%s has at least 4.5:1 contrast", (_, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
