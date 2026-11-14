import { describe, expect, it } from "vitest";
import {
    initialVariantSelection,
    isVariantOptionAvailable,
    isVariantSelectionComplete,
    matchingVariants,
    specificationGroups,
} from "@/modules/catalog/model/variantSelection";
import type { ProductVariant } from "@/modules/catalog/model/types";

const variant = (
    id: number,
    color: string,
    ram: string,
    quantity = 1,
): ProductVariant => ({
    id,
    sku: `SKU-${id}`,
    price: id * 100,
    quantity,
    imageId: null,
    specifications: [
        { key: "color", label: "Màu sắc", value: color },
        { key: "ram", label: "RAM", value: ram },
    ],
});
const variants = [
    variant(1, "Đen", "8 GB"),
    variant(2, "Đen", "16 GB"),
    variant(3, "Trắng", "8 GB", 0),
];

describe("variant selection", () => {
    it("disables only incompatible combinations, while preserving sold-out choices", () => {
        expect(specificationGroups(variants).map((group) => group.key)).toEqual(
            ["color", "ram"],
        );
        expect(
            isVariantOptionAvailable(
                variants,
                { ram: "16 GB" },
                "color",
                "Trắng",
            ),
        ).toBe(false);
        expect(
            isVariantOptionAvailable(
                variants,
                { ram: "8 GB" },
                "color",
                "Trắng",
            ),
        ).toBe(true);
        expect(
            matchingVariants(variants, { color: "Trắng", ram: "8 GB" })[0]
                .quantity,
        ).toBe(0);
        expect(isVariantSelectionComplete(variants[0], { color: "Đen" })).toBe(
            false,
        );
    });
    it("restores an explicitly requested variant and preselects shared properties", () => {
        expect(initialVariantSelection(variants, 2)).toEqual({
            color: "Đen",
            ram: "16 GB",
        });
        expect(initialVariantSelection([variants[0], variants[1]])).toEqual({
            color: "Đen",
        });
        expect(initialVariantSelection(variants)).toEqual({});
    });
});
