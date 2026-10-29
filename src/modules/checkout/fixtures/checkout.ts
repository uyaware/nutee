import type { OrderItem } from "@/modules/orders/model/types";

export const checkoutAddresses = [
  {
    id: "home",
    label: "Nhà riêng",
    recipient: "Minh Anh",
    phone: "0900000000",
    line: "12 Đường Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh",
  },
  {
    id: "office",
    label: "Văn phòng",
    recipient: "Minh Anh",
    phone: "0900000000",
    line: "45 Đường Nguyễn Huệ, Phường Sài Gòn, TP. Hồ Chí Minh",
  },
];

export const checkoutItems: OrderItem[] = [
  {
    id: "demo-item-1",
    orderId: "demo-cod",
    productId: "product-1",
    name: "MacBook Air M3",
    imageUrl: "/images/laptop.svg",
    configuration: "16GB · 256GB · 13 inch",
    quantity: 1,
    price: 24990000,
    warrantyCode: "NT-DEMO-001",
    warrantyExpiresAt: "2027-10-03T03:00:00.000Z",
  },
  {
    id: "demo-item-2",
    orderId: "demo-cod",
    productId: "product-7",
    name: "Keychron K2 Pro",
    imageUrl: "/images/keyboard.svg",
    configuration: "75% · Wireless · RGB",
    quantity: 1,
    price: 2490000,
    warrantyCode: "NT-DEMO-002",
    warrantyExpiresAt: "2027-10-03T03:00:00.000Z",
  },
];

export const checkoutQuote = {
  subtotal: 27480000,
  discount: 100000,
  shipping: 30000,
  total: 27410000,
};
