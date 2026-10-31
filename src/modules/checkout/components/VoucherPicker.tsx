import { useInfiniteQuery } from "@tanstack/react-query";
import {
    Alert,
    Button,
    Chip,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { services } from "@/app/services";
import { ErrorState } from "@/shared/components/Feedback";
import { money } from "@/shared/lib/format";
import { useState } from "react";

export function VoucherPicker({
    ownerId,
    selected,
    pending,
    onApply,
}: {
    ownerId: string;
    selected: string;
    pending: boolean;
    onApply: (code: string) => void;
}) {
    const [input, setInput] = useState(selected);
    const vouchers = useInfiniteQuery({
        queryKey: ["customer", ownerId, "vouchers"],
        initialPageParam: 0,
        queryFn: ({ pageParam }) => services.checkout.vouchers(pageParam),
        getNextPageParam: (last) =>
            (last.page + 1) * last.size < last.totalElements
                ? last.page + 1
                : undefined,
        retry: false,
    });
    return (
        <Stack spacing={1.5}>
            <Typography fontWeight={600}>Voucher cho đơn hàng</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                <TextField
                    label="Mã voucher"
                    value={input}
                    disabled={pending}
                    onChange={(event) =>
                        setInput(event.target.value.toUpperCase())
                    }
                    slotProps={{ htmlInput: { maxLength: 20 } }}
                />
                <Button
                    disabled={pending || !input.trim()}
                    onClick={() => onApply(input.trim().toUpperCase())}
                >
                    Áp dụng
                </Button>
                {selected && (
                    <Button
                        disabled={pending}
                        onClick={() => {
                            setInput("");
                            onApply("");
                        }}
                    >
                        Bỏ voucher
                    </Button>
                )}
            </Stack>
            {selected && (
                <Alert severity="info">
                    Mã đang chọn: {selected}. Kết quả áp dụng hiển thị trong
                    tổng tiền.
                </Alert>
            )}
            {vouchers.isError && (
                <ErrorState
                    error={vouchers.error}
                    retry={() => void vouchers.refetch()}
                />
            )}
            {vouchers.data?.pages
                .flatMap((page) => page.content)
                .map((voucher) => (
                    <Stack key={voucher.id} spacing={0.5}>
                        <Chip
                            label={`${voucher.code} · ${voucher.type === "percent" ? `${voucher.value}%` : money(voucher.value)}`}
                            disabled={
                                pending ||
                                voucher.remaining <= 0 ||
                                voucher.remainingPerUser <= 0
                            }
                            onClick={() => {
                                setInput(voucher.code);
                                onApply(voucher.code);
                            }}
                            sx={{ alignSelf: "flex-start", maxWidth: "100%" }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Đơn từ {money(voucher.minOrder)}
                            {voucher.maxDiscount !== null
                                ? ` · giảm tối đa ${money(voucher.maxDiscount)}`
                                : ""}{" "}
                            · còn {voucher.remaining} lượt
                        </Typography>
                    </Stack>
                ))}
            {vouchers.hasNextPage && (
                <Button
                    disabled={vouchers.isFetchingNextPage}
                    onClick={() => void vouchers.fetchNextPage()}
                >
                    Xem thêm voucher
                </Button>
            )}
        </Stack>
    );
}
