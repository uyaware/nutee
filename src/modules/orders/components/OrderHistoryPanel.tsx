import { Alert, Paper, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { dateTime } from "@/shared/lib/format";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { StatusHistoryStepper } from "@/shared/components/StatusHistoryStepper";

const labels: Record<string, string> = {
    pending: "Chờ xác nhận", confirmed: "Đã xác nhận", packing: "Đóng gói",
    shipping: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy",
};

export function OrderHistoryPanel({ id, currentStatus, management = false }: { id: number; currentStatus: string; management?: boolean }) {
    const session = useSession(management ? "backoffice" : "customer");
    const query = useQuery({
        queryKey: [management ? "management" : "customer", session.data?.id, "orders", id, "history", currentStatus],
        queryFn: () => management ? services.orders.managementHistory(id) : services.orders.history(id),
        enabled: !!session.data && Number.isSafeInteger(id) && id > 0,
        retry: false,
    });
    return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={2}>
        <Typography variant="h2">Lịch sử trạng thái</Typography>
        {query.isPending ? <LoadingState /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : query.data.length ?
            <><StatusHistoryStepper label="Lịch sử trạng thái đơn hàng" finished={["delivered", "cancelled"].includes(currentStatus)} entries={query.data.map((entry) => ({ title: entry.status ? labels[entry.status] ?? entry.status : "Không rõ trạng thái", description: `${entry.occurredAt ? dateTime(entry.occurredAt) : "Không rõ thời gian"}${management ? ` · ${entry.actorName ?? "Hệ thống"}` : ""}`, negative: entry.status === "cancelled" }))} />
                {query.data[query.data.length - 1]?.status !== currentStatus && <Alert severity="info">Một số thay đổi trạng thái chưa được ghi vào lịch sử.</Alert>}</> :
            <Alert severity="info">Chưa có lịch sử trạng thái được ghi nhận cho đơn này.</Alert>}
    </Stack></Paper>;
}
