export interface OperationsDashboard {
    asOf: string;
    orderCount: number;
    pendingCount: number;
    afterSaleCount: number;
}
export interface Dashboard extends OperationsDashboard {
    timezone: string;
    fromDate: string;
    throughDate: string;
    paidValue: number;
    statuses: Record<string, number>;
    buckets: { label: string; value: number }[];
    recentOrders: {
        id: number;
        code: string;
        recipient: string | null;
        status: string;
        total: number;
        createdAt: string;
    }[];
    lowStock: { id: number; name: string; stock: number }[];
    publishedProducts: number;
    activePromotions: number;
    activeUsers: number;
}
