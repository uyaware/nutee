import { createSeed } from "@/shared/storage/seed";
import type { Order } from "@/shared/types/database";
import type { PrototypeOrder } from "@/modules/orders/model/types";
import {
  checkoutAddresses,
  checkoutItems,
  checkoutQuote,
} from "@/modules/checkout/fixtures/checkout";

const seed = createSeed(new Date("2026-10-03T03:00:00.000Z"));

/** Temporary screen data only; navigation never persists an order. */
export function findPrototypeOrder(
  id: string | undefined,
  navigationState?: { order?: PrototypeOrder } | null,
) {
  const preview = navigationState?.order;
  return preview?.id === id
    ? preview
    : prototypeOrders.find((order) => order.id === id);
}

const sampleOrder: PrototypeOrder = {
  id: "demo-cod",
  userId: "customer-1",
  status: "pending",
  paymentMethod: "cod",
  paymentStatus: "pending",
  ...checkoutQuote,
  address: {
    recipient: checkoutAddresses[0].recipient,
    phone: checkoutAddresses[0].phone,
    line: checkoutAddresses[0].line,
  },
  createdAt: "2026-10-03T03:00:00.000Z",
  history: [
    {
      status: "pending",
      at: "2026-10-03T03:00:00.000Z",
      actorId: "customer-1",
    },
  ],
  items: checkoutItems,
};

export const prototypeOrders: PrototypeOrder[] = [
  sampleOrder,
  {
    ...sampleOrder,
    id: "demo-qr",
    paymentMethod: "qr",
    items: checkoutItems.map((item) => ({
      ...item,
      id: `${item.id}-qr`,
      orderId: "demo-qr",
    })),
  },
  {
    ...sampleOrder,
    id: "demo-shipping",
    status: "shipping",
    paymentStatus: "paid",
    createdAt: "2026-10-01T03:00:00.000Z",
    history: [
      {
        status: "pending",
        at: "2026-10-01T03:00:00.000Z",
        actorId: "customer-1",
      },
      {
        status: "confirmed",
        at: "2026-10-01T05:00:00.000Z",
        actorId: "staff-1",
      },
      { status: "packing", at: "2026-10-02T03:00:00.000Z", actorId: "staff-1" },
      {
        status: "shipping",
        at: "2026-10-03T02:00:00.000Z",
        actorId: "staff-1",
      },
    ],
    items: checkoutItems.map((item) => ({
      ...item,
      id: `${item.id}-shipping`,
      orderId: "demo-shipping",
    })),
  },
  {
    ...sampleOrder,
    id: "demo-cancelled",
    status: "cancelled",
    createdAt: "2026-09-30T03:00:00.000Z",
    history: [
      {
        status: "pending",
        at: "2026-09-30T03:00:00.000Z",
        actorId: "customer-1",
      },
      {
        status: "cancelled",
        at: "2026-09-30T04:00:00.000Z",
        actorId: "customer-1",
      },
    ],
    items: checkoutItems.map((item) => ({
      ...item,
      id: `${item.id}-cancelled`,
      orderId: "demo-cancelled",
    })),
  },
  ...seed.orders.map((order) => ({
    ...order,
    items: seed.orderItems.filter((item) => item.orderId === order.id),
  })),
];

export const paymentLabels: Record<Order["paymentStatus"], string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  expired: "Đã hết hạn",
};
