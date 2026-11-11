export type ProductImage = { id: number; url: string; primary: boolean };
export type Specification = { name: string; value: string };
export type ProductVariant = { id: number; sku: string; price: number; quantity: number; imageId: number | null; specifications: Specification[] };
export type ManagementProduct = {
    id: number;
    name: string;
    description: string | null;
    published: boolean;
    brandId: number | null;
    categoryIds: number[];
    defaultVariantId: number | null;
    updatedAt: string;
    images: ProductImage[];
    variants: ProductVariant[];
};
export type ProductSummary = Pick<ManagementProduct, "id" | "name" | "published" | "updatedAt">;
export type ProductPage = { content: ProductSummary[]; totalElements: number; page: number; size: number };
export type TaxonomyOption = { id: number; name: string; parentId: number | null };
