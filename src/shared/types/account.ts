import { z } from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Tên cần từ 2 đến 80 ký tự.")
  .max(80, "Tên tối đa 80 ký tự.");
export const registrationCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Nhập địa chỉ email hợp lệ.")),
  password: z
    .string()
    .min(8, "Mật khẩu cần ít nhất 8 ký tự.")
    .max(128, "Mật khẩu tối đa 128 ký tự."),
});
export const authPasswordSchema = z
  .string()
  .min(12, "Mật khẩu cần ít nhất 12 ký tự.")
  .max(72, "Mật khẩu tối đa 72 byte UTF-8.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Mật khẩu tối đa 72 byte UTF-8.",
  );
export const registrationSchema = registrationCredentialsSchema
  .extend({
    password: authPasswordSchema,
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu."),
  })
  .refine((fields) => fields.password === fields.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });
export type RegistrationInput = z.infer<typeof registrationSchema>;
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
