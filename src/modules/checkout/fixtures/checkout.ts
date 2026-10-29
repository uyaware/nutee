import type { OrderItem } from "@/modules/orders/model/types";
export interface CheckoutAddress {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line: string;
}
export const checkoutAddresses: CheckoutAddress[] = [];
export const checkoutItems: OrderItem[] = [];
export const checkoutQuote = {
  subtotal: 0,
  discount: 0,
  shipping: 0,
  total: 0,
};
