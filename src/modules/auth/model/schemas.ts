import { z } from "zod";

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
