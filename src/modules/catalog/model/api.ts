export interface ApiCategory {
    id: number;
    name: string;
    parentId: number | null;
}

export interface ApiBrand {
    id: number;
    name: string;
}

export interface ApiSpecification {
    name: string;
    value: string;
}

export interface ApiVariant {
    id: number;
    sku: string;
    price: number;
    quantity: number;
    imageId: number | null;
    specifications: ApiSpecification[];
    originalPrice?: number;
    promotionCode?: string | null;
}

export interface ApiProduct {
    id: number;
    defaultVariantId: number | null;
    name: string;
    description: string | null;
    avgRating: number;
    soldCount: number;
    reviewCount: number;
    price: number;
    maxPrice: number;
    stock: number;
    updatedAt: string;
    brands: ApiBrand[];
    categories: ApiCategory[];
    specifications: ApiSpecification[];
    variants: ApiVariant[];
    images: { id: number; url: string; primary: boolean }[];
}

export interface ApiPage<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
}

export interface ApiFacets {
    brands: ApiBrand[];
    categories: ApiCategory[];
    specifications: { name: string; values: string[] }[];
}
