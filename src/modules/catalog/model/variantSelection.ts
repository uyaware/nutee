import type { ProductVariant } from "@/modules/catalog/model/types";

export type VariantSelection = Record<string, string>;

export function specificationGroups(variants: ProductVariant[]) {
    const groups = new Map<
        string,
        { key: string; label: string; values: string[] }
    >();
    for (const variant of variants) {
        for (const spec of variant.specifications) {
            const group = groups.get(spec.key) ?? {
                key: spec.key,
                label: spec.label,
                values: [],
            };
            if (!group.values.includes(spec.value))
                group.values.push(spec.value);
            groups.set(spec.key, group);
        }
    }
    return [...groups.values()];
}

export function initialVariantSelection(
    variants: ProductVariant[],
    requestedId?: number,
): VariantSelection {
    const requested = variants.find((variant) => variant.id === requestedId);
    if (requested)
        return Object.fromEntries(
            requested.specifications.map((spec) => [spec.key, spec.value]),
        );
    return Object.fromEntries(
        specificationGroups(variants)
            .filter(
                (group) =>
                    group.values.length === 1 &&
                    variants.every((variant) =>
                        variant.specifications.some(
                            (spec) =>
                                spec.key === group.key &&
                                spec.value === group.values[0],
                        ),
                    ),
            )
            .map((group) => [group.key, group.values[0]]),
    );
}

export function matchingVariants(
    variants: ProductVariant[],
    selection: VariantSelection,
) {
    return variants.filter((variant) =>
        Object.entries(selection).every(([key, value]) =>
            variant.specifications.some(
                (spec) => spec.key === key && spec.value === value,
            ),
        ),
    );
}

/** Một giá trị khả dụng khi ít nhất một biến thể khớp các lựa chọn còn lại. */
export function isVariantOptionAvailable(
    variants: ProductVariant[],
    selection: VariantSelection,
    key: string,
    value: string,
) {
    return (
        matchingVariants(variants, { ...selection, [key]: value }).length > 0
    );
}

export function isVariantSelectionComplete(
    variant: ProductVariant,
    selection: VariantSelection,
) {
    return variant.specifications.every(
        (spec) => selection[spec.key] === spec.value,
    );
}
