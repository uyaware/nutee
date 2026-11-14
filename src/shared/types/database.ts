import { z } from "zod";

const id = z.string().min(1);
const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const date = z.iso.datetime();
export const roleSchema = z.enum(["customer", "staff", "admin"]);
export type Role = z.infer<typeof roleSchema>;
export type Portal = "customer" | "backoffice";
export const orderStatusSchema = z.enum([
    "pending",
    "confirmed",
    "packing",
    "shipping",
    "delivered",
    "cancelled",
]);
export const paymentStatusSchema = z.enum([
    "pending",
    "paid",
    "failed",
    "expired",
]);
export const afterSaleStatusSchema = z.enum([
    "pending",
    "reviewing",
    "approved",
    "rejected",
    "processing",
    "completed",
]);
export const userSchema = z.object({
    id,
    email: z.email(),
    name: z.string().max(80),
    profileCompleted: z.boolean().optional(),
    phone: z.string().optional(),
    role: roleSchema,
    isActive: z.boolean(),
});
export const productSchema = z.object({
    id,
    name: z.string().min(1).max(160),
    brandId: id,
    sku: id,
    price: money,
    stock: z.number().int().nonnegative(),
    status: z.enum(["published", "hidden"]),
    kind: z.enum(["laptop", "smartphone", "keyboard", "other"]),
    specifications: z.array(z.object({ key: id, label: id, value: id })),
    updatedAt: date,
});
const addressSchema = z.object({
    id,
    userId: id,
    recipient: id,
    phone: id,
    line: id,
    isDefault: z.boolean(),
});
const orderSchema = z.object({
    id,
    userId: id,
    status: orderStatusSchema,
    paymentMethod: z.enum(["cod", "qr"]),
    paymentStatus: paymentStatusSchema,
    subtotal: money,
    discount: money,
    shipping: money,
    total: money,
    address: addressSchema.omit({ id: true, userId: true, isDefault: true }),
    createdAt: date,
    history: z.array(
        z.object({ status: orderStatusSchema, at: date, actorId: id }),
    ),
});
export const databaseSchema = z
    .object({
        schemaVersion: z.literal(1),
        seedVersion: z.number().int().positive(),
        revision: z.number().int().nonnegative(),
        seededAt: date,
        users: z.array(userSchema),
        addresses: z.array(addressSchema),
        brands: z.array(z.object({ id, name: id })),
        categories: z.array(z.object({ id, name: id })),
        categoryRelations: z.array(z.object({ id, parentId: id, childId: id })),
        products: z.array(productSchema),
        productImages: z.array(
            z.object({
                id,
                productId: id,
                url: id,
                alt: id,
                position: z.number().int().nonnegative(),
            }),
        ),
        productCategories: z.array(
            z.object({ id, productId: id, categoryId: id }),
        ),
        carts: z.array(z.object({ id, userId: id })),
        cartItems: z.array(
            z.object({
                id,
                cartId: id,
                productId: id,
                quantity: z.number().int().positive(),
            }),
        ),
        guestCartMerges: z.array(z.object({ id, userId: id })).default([]),
        orders: z.array(orderSchema),
        orderItems: z.array(
            z.object({
                id,
                orderId: id,
                productId: id,
                name: id,
                imageUrl: id,
                configuration: id,
                quantity: z.number().int().positive(),
                price: money,
                warrantyCode: id,
                warrantyExpiresAt: date,
            }),
        ),
        paymentTransactions: z.array(
            z.object({
                id,
                orderId: id,
                amount: money,
                status: paymentStatusSchema,
                reference: id,
                createdAt: date,
            }),
        ),
        reviews: z.array(
            z.object({
                id,
                userId: id,
                productId: id,
                orderItemId: id,
                rating: z.number().int().min(1).max(5),
                comment: id,
                createdAt: date,
            }),
        ),
        promotions: z.array(
            z.object({
                id,
                code: id,
                type: z.enum(["fixed", "percent"]),
                value: money,
                minOrder: money,
                startsAt: date,
                endsAt: date,
                scope: z.enum(["all", "product", "user"]),
            }),
        ),
        promotionProducts: z.array(
            z.object({ id, promotionId: id, productId: id }),
        ),
        promotionUsers: z.array(z.object({ id, promotionId: id, userId: id })),
        orderPromotions: z.array(
            z.object({ id, orderId: id, promotionId: id, discount: money }),
        ),
        afterSaleRequests: z.array(
            z.object({
                id,
                userId: id,
                orderItemId: id,
                type: z.enum(["warranty", "return"]),
                quantity: z.number().int().positive(),
                reason: id,
                status: afterSaleStatusSchema,
                createdAt: date,
                history: z.array(
                    z.object({
                        status: afterSaleStatusSchema,
                        at: date,
                        actorId: id,
                        note: z.string(),
                    }),
                ),
            }),
        ),
    })
    .superRefine((db, ctx) => {
        const fail = (message: string) =>
            ctx.addIssue({ code: "custom", message });
        const exists = (rows: { id: string }[], target: string) =>
            rows.some((r) => r.id === target);
        const fk = (rows: { id: string }[], target: string, label: string) => {
            if (!exists(rows, target))
                fail(`Liên kết ${label}: ${target} không tồn tại`);
        };
        for (const [key, rows] of Object.entries(db)) {
            if (
                Array.isArray(rows) &&
                new Set(rows.map((r) => r.id)).size !== rows.length
            )
                fail(`ID trùng trong ${key}`);
        }
        for (const [label, values] of [
            ["email", db.users.map((u) => u.email.toLowerCase())],
            ["SKU", db.products.map((p) => p.sku)],
            ["code", db.promotions.map((p) => p.code)],
        ] as const) {
            if (new Set(values).size !== values.length) fail(`${label} trùng`);
        }
        db.users.forEach((u) => {
            if (u.profileCompleted !== false && !u.name.trim())
                fail("Hồ sơ thiếu tên");
        });
        db.addresses.forEach((r) => fk(db.users, r.userId, "address.user"));
        db.users.forEach((u) => {
            if (
                db.addresses.filter((a) => a.userId === u.id && a.isDefault)
                    .length > 1
            )
                fail("Nhiều địa chỉ mặc định");
        });
        db.products.forEach((p) => fk(db.brands, p.brandId, "product.brand"));
        db.categoryRelations.forEach((r) => {
            fk(db.categories, r.parentId, "category.parent");
            fk(db.categories, r.childId, "category.child");
            if (
                db.categoryRelations.filter((x) => x.childId === r.childId)
                    .length > 1
            )
                fail("Danh mục có nhiều cha");
            const visited = new Set([r.childId]);
            let current: string | undefined = r.parentId;
            while (current) {
                if (visited.has(current)) {
                    fail("Chu trình danh mục");
                    break;
                }
                visited.add(current);
                current = db.categoryRelations.find(
                    (x) => x.childId === current,
                )?.parentId;
            }
        });
        db.productImages.forEach((r) =>
            fk(db.products, r.productId, "image.product"),
        );
        db.productCategories.forEach((r) => {
            fk(db.products, r.productId, "productCategory.product");
            fk(db.categories, r.categoryId, "productCategory.category");
        });
        db.carts.forEach((r) => fk(db.users, r.userId, "cart.user"));
        if (new Set(db.carts.map((c) => c.userId)).size !== db.carts.length)
            fail("Nhiều giỏ cho một user");
        db.cartItems.forEach((r) => {
            fk(db.carts, r.cartId, "cartItem.cart");
            fk(db.products, r.productId, "cartItem.product");
        });
        if (
            new Set(db.cartItems.map((r) => `${r.cartId}:${r.productId}`))
                .size !== db.cartItems.length
        )
            fail("Sản phẩm trùng trong giỏ hàng");
        db.guestCartMerges.forEach((r) =>
            fk(db.users, r.userId, "guestCartMerge.user"),
        );
        db.orders.forEach((o) => {
            fk(db.users, o.userId, "order.user");
            o.history.forEach((h) =>
                fk(db.users, h.actorId, "order.history.actor"),
            );
            const items = db.orderItems.filter((i) => i.orderId === o.id);
            if (
                !items.length ||
                items.reduce((n, i) => n + i.quantity * i.price, 0) !==
                    o.subtotal ||
                o.subtotal - o.discount + o.shipping !== o.total
            )
                fail(`Tổng tiền sai: ${o.id}`);
            if (
                db.orderPromotions
                    .filter((p) => p.orderId === o.id)
                    .reduce((n, p) => n + p.discount, 0) !== o.discount
            )
                fail(`Ưu đãi sai: ${o.id}`);
        });
        db.orderItems.forEach((r) => {
            fk(db.orders, r.orderId, "orderItem.order");
            fk(db.products, r.productId, "orderItem.product");
        });
        db.paymentTransactions.forEach((r) => {
            fk(db.orders, r.orderId, "payment.order");
            if (db.orders.find((o) => o.id === r.orderId)?.total !== r.amount)
                fail("Số tiền giao dịch sai");
        });
        db.promotions.forEach((p) => {
            if (
                p.endsAt <= p.startsAt ||
                (p.type === "percent" && p.value > 100)
            )
                fail("Điều kiện khuyến mãi sai");
        });
        db.promotionProducts.forEach((r) => {
            fk(db.promotions, r.promotionId, "promotionProduct.promotion");
            fk(db.products, r.productId, "promotionProduct.product");
        });
        db.promotionUsers.forEach((r) => {
            fk(db.promotions, r.promotionId, "promotionUser.promotion");
            fk(db.users, r.userId, "promotionUser.user");
        });
        db.orderPromotions.forEach((r) => {
            fk(db.orders, r.orderId, "orderPromotion.order");
            fk(db.promotions, r.promotionId, "orderPromotion.promotion");
        });
        db.reviews.forEach((r) => {
            fk(db.users, r.userId, "review.user");
            fk(db.products, r.productId, "review.product");
            fk(db.orderItems, r.orderItemId, "review.orderItem");
            const item = db.orderItems.find((i) => i.id === r.orderItemId);
            const order = db.orders.find((o) => o.id === item?.orderId);
            if (
                order?.userId !== r.userId ||
                item?.productId !== r.productId ||
                order?.status !== "delivered"
            )
                fail("Đánh giá không thuộc món đã giao");
        });
        db.afterSaleRequests.forEach((r) => {
            fk(db.users, r.userId, "afterSale.user");
            fk(db.orderItems, r.orderItemId, "afterSale.orderItem");
            r.history.forEach((h) =>
                fk(db.users, h.actorId, "afterSale.history.actor"),
            );
            const item = db.orderItems.find((i) => i.id === r.orderItemId);
            const order = db.orders.find((o) => o.id === item?.orderId);
            if (
                order?.userId !== r.userId ||
                order?.status !== "delivered" ||
                r.quantity > (item?.quantity ?? 0)
            )
                fail("Hậu mãi không hợp lệ");
        });
    });

export type Database = z.infer<typeof databaseSchema>;
export type User = z.infer<typeof userSchema>;
export type Product = z.infer<typeof productSchema>;
export type Order = Database["orders"][number];
export type ProductSummary = Product & {
    brandName: string;
    imageUrl: string;
    avgRating: number;
    reviewCount: number;
    soldCount: number;
    originalPrice?: number;
    promotionCode?: string | null;
};
export interface Session {
    userId: string;
    expiresAt: number;
}
export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}
