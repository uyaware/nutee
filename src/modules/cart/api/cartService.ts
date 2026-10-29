import type {
  DataRepository,
  GuestCartRepository,
} from "@/shared/storage/contracts";
import type { Database, User } from "@/shared/types/database";
import type { Cart, GuestCart } from "@/modules/cart/model/types";
import { MAX_CART_QUANTITY } from "@/modules/cart/model/types";
import { ServiceError } from "@/shared/lib/errors";
import { createId } from "@/shared/lib/id";
import type { CartService } from "@/modules/cart/model/contracts";

type Items = GuestCart["items"];
function quantity(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_CART_QUANTITY)
    throw new ServiceError(
      "VALIDATION",
      `Số lượng phải là số nguyên từ 1 đến ${MAX_CART_QUANTITY}.`,
    );
}
function saleable(db: Database, productId: string, value: number) {
  quantity(value);
  const product = db.products.find((p) => p.id === productId);
  if (!product || product.status !== "published")
    throw new ServiceError("NOT_FOUND", "Sản phẩm đã ngừng bán.");
  if (product.stock < value)
    throw new ServiceError(
      "VALIDATION",
      `Sản phẩm chỉ còn ${product.stock} trong kho. Kiểm tra lại số lượng.`,
    );
}
function userCart(db: Database, userId: string) {
  let cart = db.carts.find((c) => c.userId === userId);
  if (!cart) {
    cart = { id: createId(), userId };
    db.carts.push(cart);
  }
  return cart;
}
function saveItems(db: Database, userId: string, items: Items) {
  const cart = userCart(db, userId);
  db.cartItems = db.cartItems.filter((i) => i.cartId !== cart.id);
  db.cartItems.push(
    ...items.map((i) => ({ ...i, id: createId(), cartId: cart.id })),
  );
}
function ownedItems(db: Database, userId: string): Items {
  const cart = db.carts.find((c) => c.userId === userId);
  return db.cartItems
    .filter((i) => i.cartId === cart?.id)
    .map(({ productId, quantity }) => ({ productId, quantity }));
}
function dto(
  db: Database,
  items: Items,
  ownerId: string | null,
  revision: number,
): Cart {
  const lines = items.map((item) => {
    const product = db.products.find((p) => p.id === item.productId);
    const stock = product?.stock ?? 0;
    const status =
      !product || product.status !== "published"
        ? "hidden"
        : stock === 0
          ? "out-of-stock"
          : stock < item.quantity
            ? "insufficient-stock"
            : "available";
    const price = product?.price ?? 0;
    return {
      ...item,
      name: product?.name ?? "Sản phẩm không còn tồn tại",
      imageUrl:
        db.productImages
          .filter((i) => i.productId === item.productId)
          .sort((a, b) => a.position - b.position)[0]?.url ?? "",
      price,
      stock,
      status,
      lineTotal: price * item.quantity,
    } as const;
  });
  return {
    ownerId,
    revision,
    items: lines,
    quantity: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: lines.reduce((n, i) => n + i.lineTotal, 0),
    hasIssues: lines.some((i) => i.status !== "available"),
  };
}

export function mergeGuestItems(
  db: Database,
  guest: GuestCart,
  userId: string,
) {
  const notices: string[] = [];
  const user = db.users.find((u) => u.id === userId);
  if (!user?.isActive || user.role !== "customer")
    throw new ServiceError(
      "FORBIDDEN",
      "Tài khoản khách hàng không còn hoạt động.",
    );
  if (!guest.items.length) return notices;
  const items = ownedItems(db, userId);
  for (const incoming of guest.items) {
    // A deleted product cannot retain a DB foreign key; preserve the guest cart on failure.
    const product = db.products.find((p) => p.id === incoming.productId);
    if (!product)
      throw new ServiceError(
        "CONFLICT",
        "Sản phẩm trong giỏ khách không còn tồn tại. Xóa sản phẩm này rồi đăng nhập lại.",
      );
    const existing = items.find((i) => i.productId === incoming.productId);
    const requested = (existing?.quantity ?? 0) + incoming.quantity;
    const merged = Math.min(
      requested,
      MAX_CART_QUANTITY,
      product.stock > 0 ? product.stock : MAX_CART_QUANTITY,
    );
    if (merged !== requested)
      notices.push(
        `${product.name}: số lượng được điều chỉnh từ ${requested} còn ${merged} theo tồn kho/giới hạn giỏ.`,
      );
    if (product.status === "hidden" || product.stock === 0)
      notices.push(
        `${product.name}: hiện không thể mua. Kiểm tra hoặc xóa khỏi giỏ.`,
      );
    if (existing) existing.quantity = merged;
    else items.push({ productId: incoming.productId, quantity: merged });
  }
  saveItems(db, userId, items);
  return notices;
}

export function createCartService(
  repository: DataRepository & GuestCartRepository,
  customer: (db: Database) => User | null,
): CartService {
  async function mutate(
    expectedRevision: number,
    ownerId: string | null,
    change: (items: Items, db: Database) => void,
  ) {
    const checkOwner = (db: Database) => {
      if ((customer(db)?.id ?? null) !== ownerId)
        throw new ServiceError(
          "CONFLICT",
          "Phiên khách hàng đã thay đổi. Tải lại giỏ hàng trước khi sửa.",
        );
    };
    if (ownerId === null) {
      await repository.updateGuest(expectedRevision, (cart, db) => {
        checkOwner(db);
        change(cart.items, db);
      });
    } else {
      await repository.update(expectedRevision, (db) => {
        checkOwner(db);
        const items = ownedItems(db, ownerId);
        change(items, db);
        saveItems(db, ownerId, items);
      });
    }
  }
  async function get() {
    const db = await repository.read();
    const user = customer(db);
    if (user) return dto(db, ownedItems(db, user.id), user.id, db.revision);
    const guest = await repository.readGuest();
    return dto(db, guest.items, null, guest.revision);
  }
  return {
    get,
    async add(productId, value) {
      quantity(value);
      const cart = await get();
      await mutate(cart.revision, cart.ownerId, (items, db) => {
        const existing = items.find((i) => i.productId === productId);
        const total = (existing?.quantity ?? 0) + value;
        saleable(db, productId, total);
        if (existing) existing.quantity = total;
        else items.push({ productId, quantity: value });
      });
    },
    async setQuantity(productId, value, revision, ownerId) {
      quantity(value);
      await mutate(revision, ownerId, (items, db) => {
        const item = items.find((i) => i.productId === productId);
        if (!item)
          throw new ServiceError("NOT_FOUND", "Sản phẩm không còn trong giỏ.");
        saleable(db, productId, value);
        item.quantity = value;
      });
    },
    async remove(productId, revision, ownerId) {
      await mutate(revision, ownerId, (items) => {
        const index = items.findIndex((i) => i.productId === productId);
        if (index < 0)
          throw new ServiceError("NOT_FOUND", "Sản phẩm không còn trong giỏ.");
        items.splice(index, 1);
      });
    },
  };
}
