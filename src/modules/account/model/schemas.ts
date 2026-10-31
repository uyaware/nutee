import { z } from "zod";

export const nameSchema = z
    .string()
    .trim()
    .min(2, "Tên cần từ 2 đến 80 ký tự.")
    .max(80, "Tên tối đa 80 ký tự.");
export const phoneSchema = z
    .string()
    .trim()
    .regex(
        /^(?:0\d{9}|\+84\d{9})$/,
        "Nhập số điện thoại 10 chữ số hoặc +84 và 9 chữ số.",
    );
export const addressInputSchema = z.object({
    street: z
        .string()
        .trim()
        .min(2, "Nhập số nhà và tên đường.")
        .max(240, "Địa chỉ tối đa 240 ký tự."),
    isDefault: z.boolean(),
    provinceCity: z
        .string()
        .trim()
        .min(1, "Nhập tỉnh/thành phố.")
        .max(255, "Tối đa 255 ký tự."),
    wardCommune: z
        .string()
        .trim()
        .min(1, "Nhập phường/xã.")
        .max(255, "Tối đa 255 ký tự."),
});
export type AddressInput = z.infer<typeof addressInputSchema>;
export const profileInputSchema = z.object({
    name: nameSchema,
    phone: z
        .string()
        .trim()
        .pipe(z.union([z.literal(""), phoneSchema])),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;
export const profileSetupSchema = z
    .object({
        phone: phoneSchema,
        name: nameSchema,
        street: z.string().trim().max(240),
        provinceCity: z.string().trim().max(255),
        wardCommune: z.string().trim().max(255),
    })
    .superRefine((input, context) => {
        if (!input.street && !input.wardCommune && !input.provinceCity) return;
        const result = addressInputSchema.safeParse({
            ...input,
            isDefault: true,
        });
        if (!result.success)
            for (const issue of result.error.issues)
                context.addIssue({
                    code: "custom",
                    path: issue.path,
                    message: issue.message,
                });
    });
export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
