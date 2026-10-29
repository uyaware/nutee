import type { ProductSummary, User } from "@/shared/types/database";

export interface ManagementService {
  dashboard(): Promise<{
    orders: number;
    pending: number;
    afterSales: number;
    paidRevenue: number | null;
    products: number;
  }>;
  products(): Promise<{ items: ProductSummary[]; revision: number }>;
  updateProduct(
    id: string,
    input: { name: string; price: number; status: "published" | "hidden" },
    expectedRevision: number,
  ): Promise<void>;
  users(): Promise<User[]>;
}
