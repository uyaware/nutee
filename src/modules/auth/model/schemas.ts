import { z } from "zod";

export const authPasswordSchema = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự")
  .max(100, "Mật khẩu tối đa 100 ký tự")
  .regex(/^[\x20-\x7E]*$/, "Mật khẩu chỉ dùng ký tự ASCII, không có dấu.");
export const registrationSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Nhập địa chỉ email hợp lệ")),
    password: authPasswordSchema,
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu."),
  })
  .refine((fields) => fields.password === fields.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });
export type RegistrationInput = z.infer<typeof registrationSchema>;
