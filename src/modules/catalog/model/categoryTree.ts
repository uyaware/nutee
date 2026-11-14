import type { CatalogFacets } from "@/modules/catalog/model/types";

type Category = CatalogFacets["categories"][number];

/** Đặt mỗi danh mục ngay sau cha, kể cả khi API trả danh sách theo thứ tự ID. */
export function orderedCategories(categories: Category[]) {
    const result: { category: Category; depth: number }[] = [];
    const visited = new Set<string>();
    const append = (category: Category, depth: number) => {
        if (visited.has(category.id)) return;
        visited.add(category.id);
        result.push({ category, depth });
        categories.filter((child) => child.parentId === category.id)
            .forEach((child) => append(child, depth + 1));
    };
    categories.filter((category) => !category.parentId || !categories.some((parent) => parent.id === category.parentId))
        .forEach((category) => append(category, 0));
    categories.forEach((category) => append(category, 0));
    return result;
}
