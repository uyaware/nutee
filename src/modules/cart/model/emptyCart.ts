import type { CartService } from "@/modules/cart/model/contracts";
import { unavailable } from "@/shared/api/unavailable";

/** Giữ giỏ hàng rỗng; các thao tác chờ API backend, không dùng browser storage. */
export const emptyCart: CartService = {
  async get() {
    return {
      items: [],
      quantity: 0,
      subtotal: 0,
      ownerId: null,
      revision: 0,
      hasIssues: false,
    };
  },
  add: unavailable,
  setQuantity: unavailable,
  remove: unavailable,
};
