import type { ApiProduct } from "@/modules/catalog/model/api";

export const product: ApiProduct = {
    id: 7,
    defaultVariantId: 12,
    name: "Laptop thử nghiệm",
    description: "Thông số lấy từ biến thể đang chọn.",
    avgRating: 0,
    soldCount: 0,
    reviewCount: 0,
    price: 10000000,
    maxPrice: 12000000,
    stock: 4,
    updatedAt: "2026-10-30T00:00:00Z",
    brands: [{ id: 1, name: "NUTEE Test" }],
    categories: [{ id: 20, name: "Laptop", parentId: null }],
    specifications: [
        { name: "ram", value: "8 GB" },
        { name: "ram", value: "16 GB" },
    ],
    variants: [
        {
            id: 11,
            sku: "SKU-8",
            price: 10000000,
            quantity: 1,
            imageId: 8,
            specifications: [
                { name: "configuration", value: "8 GB / 256 GB" },
                { name: "ram", value: "8 GB" },
            ],
        },
        {
            id: 12,
            sku: "SKU-16",
            price: 12000000,
            quantity: 3,
            imageId: 9,
            specifications: [
                { name: "configuration", value: "16 GB / 512 GB" },
                { name: "ram", value: "16 GB" },
            ],
        },
    ],
    images: [
        { id: 8, url: "/images/laptop.svg", primary: true },
        { id: 9, url: "/images/laptop-overview.svg", primary: false },
    ],
};
