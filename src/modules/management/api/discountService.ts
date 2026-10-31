import type { ApiClient } from "@/shared/api/apiClient";
import type { ApiPage } from "@/modules/catalog/model/api";
import {
    discountSchema,
    emptyDiscount,
    type DiscountDraft,
    type DiscountKind,
    type DiscountOption,
    type DiscountRule,
} from "@/modules/management/model/discounts";

interface ApiRule extends Partial<DiscountDraft> {
    id: string;
    code: string;
    type: "fixed" | "percent";
    value: number;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    status: string;
    products?: { id: number; name: string }[];
    users?: DiscountOption[];
}
function rule(kind: DiscountKind, value: ApiRule): DiscountRule {
    return {
        ...emptyDiscount(kind),
        ...value,
        products: (value.products ?? []).map((item) => ({
            ...item,
            id: String(item.id),
        })),
        users: value.users ?? [],
    };
}

/** Quản trị gọi API thật; chỉ báo thành công sau khi backend xác nhận. */
export function createDiscountService(api: ApiClient) {
    const path = (kind: DiscountKind, id?: string) =>
        `/management/${kind}${id ? `/${encodeURIComponent(id)}` : ""}`;
    return {
        async list(
            kind: DiscountKind,
            q: string,
            status: string,
            page: number,
        ) {
            const result = await api.request<ApiPage<ApiRule>>(
                `${path(kind)}?${new URLSearchParams({ q, status, page: String(page), size: "20" })}`,
            );
            return {
                ...result,
                content: result.content.map((value) => rule(kind, value)),
            };
        },
        async get(kind: DiscountKind, id: string) {
            return rule(kind, await api.request<ApiRule>(path(kind, id)));
        },
        async save(
            kind: DiscountKind,
            id: string | undefined,
            input: DiscountDraft,
        ) {
            const fields = discountSchema.parse(input);
            const common = {
                code: fields.code,
                type: fields.type,
                value: fields.value,
                startsAt: fields.startsAt,
                endsAt: fields.endsAt,
                isActive: fields.isActive,
            };
            const body =
                kind === "promotions"
                    ? { ...common, productIds: fields.productIds }
                    : {
                          ...common,
                          scope: fields.scope,
                          minOrder: fields.minOrder,
                          maxDiscount: fields.maxDiscount,
                          quantity: fields.quantity,
                          maxUsesPerUser: fields.maxUsesPerUser,
                          userIds:
                              fields.scope === "user" ? fields.userIds : [],
                      };
            return rule(
                kind,
                await api.request<ApiRule>(path(kind, id), {
                    method: id ? "PUT" : "POST",
                    body,
                }),
            );
        },
        async active(kind: DiscountKind, id: string, isActive: boolean) {
            return rule(
                kind,
                await api.request<ApiRule>(`${path(kind, id)}/active`, {
                    method: "PATCH",
                    body: { isActive },
                }),
            );
        },
        remove: (kind: DiscountKind, id: string) =>
            api.request<void>(path(kind, id), { method: "DELETE" }),
        async options(
            kind: DiscountKind,
            q: string,
        ): Promise<DiscountOption[]> {
            const result = await api.request<
                ApiPage<{ id: number | string; name: string; email?: string }>
            >(
                `${path(kind)}/${kind === "promotions" ? "products" : "customers"}?${new URLSearchParams({ q, size: "50" })}`,
            );
            return result.content.map((value) => ({
                ...value,
                id: String(value.id),
            }));
        },
    };
}
