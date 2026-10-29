import { z } from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Tên cần từ 2 đến 80 ký tự.")
  .max(80, "Tên tối đa 80 ký tự.");
export const addressInputSchema = z.object({
  recipient: z
    .string()
    .trim()
    .min(2, "Tên người nhận cần từ 2 đến 80 ký tự.")
    .max(80, "Tên tối đa 80 ký tự."),
  phone: z
    .string()
    .trim()
    .regex(
      /^(?:0\d{9}|\+84\d{9})$/,
      "Nhập số điện thoại 10 chữ số hoặc +84 và 9 chữ số.",
    ),
  line: z
    .string()
    .trim()
    .min(10, "Địa chỉ cần ít nhất 10 ký tự.")
    .max(240, "Địa chỉ tối đa 240 ký tự."),
  isDefault: z.boolean(),
});
export type AddressInput = z.infer<typeof addressInputSchema>;
export const profileSetupSchema = addressInputSchema
  .pick({ phone: true })
  .extend({
    name: nameSchema,
    line: z
      .string()
      .trim()
      .pipe(z.union([z.literal(""), addressInputSchema.shape.line]))
      .optional(),
  });
export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
