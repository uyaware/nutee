import { describe, expect, it } from "vitest";
import { orderedCategories } from "@/modules/catalog/model/categoryTree";

describe("category ordering", () => {
    it("groups descendants under their own parent regardless of API order", () => {
        const categories = [
            { id: "1", name: "Laptop" },
            { id: "2", name: "Keyboard" },
            { id: "4", name: "Mechanical", parentId: "2" },
            { id: "3", name: "Gaming", parentId: "1" },
            { id: "5", name: "Portable", parentId: "3" },
        ];
        expect(orderedCategories(categories).map(({ category, depth }) => [category.id, depth]))
            .toEqual([["1", 0], ["3", 1], ["5", 2], ["2", 0], ["4", 1]]);
    });
});
