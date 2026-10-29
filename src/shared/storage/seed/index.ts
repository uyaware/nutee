import type { Database, Order, Product } from "@/shared/types/database";

export const DEMO_PASSWORD = "12345678";
export const DEMO_ACCOUNTS = [
  { email: "customer@nutee.demo", role: "customer", label: "Khách hàng" },
  { email: "staff@nutee.demo", role: "staff", label: "Nhân viên" },
  { email: "admin@nutee.demo", role: "admin", label: "Quản trị viên" },
] as const;

export function createSeed(now = new Date()): Database {
  const at = (days: number) =>
    new Date(now.getTime() + days * 86400000).toISOString();
  const db: Database = {
    schemaVersion: 1,
    seedVersion: 2,
    revision: 0,
    seededAt: at(0),
    credentials: ["customer-1", "customer-2", "staff-1", "admin-1"].map(
      (userId) => ({
        id: `credential-${userId}`,
        userId,
        password: DEMO_PASSWORD,
      }),
    ),
    users: [
      {
        id: "customer-1",
        email: "customer@nutee.demo",
        name: "Minh Anh",
        role: "customer",
        isActive: true,
      },
      {
        id: "customer-2",
        email: "customer2@nutee.demo",
        name: "Hoàng Nam",
        role: "customer",
        isActive: true,
      },
      {
        id: "staff-1",
        email: "staff@nutee.demo",
        name: "Linh Nguyễn",
        role: "staff",
        isActive: true,
      },
      {
        id: "admin-1",
        email: "admin@nutee.demo",
        name: "NUTEE Admin",
        role: "admin",
        isActive: true,
      },
    ],
    externalIdentities: [],
    addresses: [1, 2].map((n) => ({
      id: `address-${n}`,
      userId: `customer-${n}`,
      recipient: n === 1 ? "Minh Anh" : "Hoàng Nam",
      phone: "0900000000",
      line: `${n} Đường Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh`,
      isDefault: true,
    })),
    brands: ["Apple", "Samsung", "ASUS", "Lenovo", "Logitech", "Keychron"].map(
      (name, i) => ({ id: `brand-${i + 1}`, name }),
    ),
    categories: [
      { id: "electronics", name: "Đồ điện tử" },
      { id: "laptop", name: "Laptop" },
      { id: "smartphone", name: "Điện thoại" },
      { id: "keyboard", name: "Bàn phím" },
    ],
    categoryRelations: ["laptop", "smartphone", "keyboard"].map((childId) => ({
      id: `rel-${childId}`,
      parentId: "electronics",
      childId,
    })),
    products: [],
    productImages: [],
    productCategories: [],
    carts: [1, 2].map((n) => ({ id: `cart-${n}`, userId: `customer-${n}` })),
    cartItems: [],
    guestCartMerges: [],
    orders: [],
    orderItems: [],
    paymentTransactions: [],
    reviews: [],
    promotions: [
      {
        id: "promo-1",
        code: "NUTEE100",
        type: "fixed",
        value: 100000,
        minOrder: 1000000,
        startsAt: at(-90),
        endsAt: at(30),
        scope: "all",
      },
      {
        id: "promo-2",
        code: "LAPTOP5",
        type: "percent",
        value: 5,
        minOrder: 10000000,
        startsAt: at(-10),
        endsAt: at(20),
        scope: "product",
      },
      {
        id: "promo-3",
        code: "HELLOANH",
        type: "fixed",
        value: 200000,
        minOrder: 2000000,
        startsAt: at(-10),
        endsAt: at(15),
        scope: "user",
      },
      {
        id: "promo-4",
        code: "EXPIRED",
        type: "fixed",
        value: 50000,
        minOrder: 500000,
        startsAt: at(-30),
        endsAt: at(-1),
        scope: "all",
      },
    ],
    promotionProducts: [],
    promotionUsers: [
      { id: "pu-1", promotionId: "promo-3", userId: "customer-1" },
    ],
    orderPromotions: [],
    afterSaleRequests: [],
  };
  const lines: [string, string, Product["kind"], number, string][] = [
    ["MacBook Air M3", "brand-1", "laptop", 24990000, "16GB · 256GB · 13 inch"],
    [
      "ASUS Zenbook 14 OLED",
      "brand-3",
      "laptop",
      22990000,
      "16GB · 512GB · OLED",
    ],
    [
      "Lenovo IdeaPad Slim 5",
      "brand-4",
      "laptop",
      17990000,
      "16GB · 512GB · Ryzen 7",
    ],
    ["Samsung Galaxy S24", "brand-2", "smartphone", 18990000, "8GB · 256GB"],
    ["iPhone 15", "brand-1", "smartphone", 19990000, "128GB · 6.1 inch"],
    ["Samsung Galaxy A55", "brand-2", "smartphone", 9990000, "8GB · 128GB"],
    ["Keychron K2 Pro", "brand-6", "keyboard", 2490000, "75% · Wireless · RGB"],
    [
      "Logitech MX Keys S",
      "brand-5",
      "keyboard",
      2890000,
      "Wireless · Low profile",
    ],
    ["Keychron K8", "brand-6", "keyboard", 1990000, "TKL · Wireless"],
    ["ASUS ROG Strix G16", "brand-3", "laptop", 32990000, "16GB · RTX 4060"],
  ];
  for (let i = 0; i < 30; i++) {
    const [name, brandId, kind, price, config] = lines[i % 10];
    const productId = `product-${i + 1}`;
    db.products.push({
      id: productId,
      name: `${name}${i >= 10 ? ` · Cấu hình ${Math.floor(i / 10) + 1}` : ""}`,
      brandId,
      kind,
      sku: `NUT-${String(i + 1).padStart(4, "0")}`,
      price: price + Math.floor(i / 10) * 500000,
      stock: i === 28 ? 0 : 8 + i,
      status: i === 29 ? "hidden" : "published",
      specifications: [
        { key: "configuration", label: "Cấu hình", value: config },
        ...(kind === "laptop"
          ? [
              { key: "ram", label: "RAM", value: "16GB" },
              {
                key: "storage",
                label: "Lưu trữ",
                value: config.includes("256GB") ? "256GB" : "512GB",
              },
            ]
          : kind === "smartphone"
            ? [
                {
                  key: "storage",
                  label: "Lưu trữ",
                  value: config.includes("256GB") ? "256GB" : "128GB",
                },
              ]
            : [{ key: "connection", label: "Kết nối", value: "Wireless" }]),
      ],
      updatedAt: at(0),
    });
    db.productImages.push({
      id: `image-${i + 1}`,
      productId,
      url: `/images/${kind}.svg`,
      alt: `Minh họa ${name}`,
      position: 0,
    });
    db.productImages.push({
      id: `image-${i + 1}-overview`,
      productId,
      url: `/images/${kind}-overview.svg`,
      alt: `Góc nhìn tổng quan ${name} (minh họa)`,
      position: 1,
    });
    db.productCategories.push({
      id: `pc-${i + 1}`,
      productId,
      categoryId: kind,
    });
    if (kind === "laptop")
      db.promotionProducts.push({
        id: `pp-${i + 1}`,
        promotionId: "promo-2",
        productId,
      });
  }
  db.cartItems.push({
    id: "ci-1",
    cartId: "cart-1",
    productId: "product-1",
    quantity: 1,
  });
  const statuses: Order["status"][] = [
    "pending",
    "confirmed",
    "packing",
    "shipping",
    "delivered",
    "cancelled",
    "delivered",
    "delivered",
    "delivered",
    "delivered",
    "delivered",
    "pending",
  ];
  statuses.forEach((status, i) => {
    const p = db.products[i];
    const userId = `customer-${(i % 2) + 1}`;
    const orderId = `order-${i + 1}`;
    const address = db.addresses[i % 2];
    const discount = i === 4 ? 100000 : 0;
    const paymentStatus =
      status === "delivered"
        ? "paid"
        : status === "cancelled"
          ? "expired"
          : "pending";
    db.orders.push({
      id: orderId,
      userId,
      status,
      paymentMethod: i % 2 ? "qr" : "cod",
      paymentStatus,
      subtotal: p.price,
      discount,
      shipping: 0,
      total: p.price - discount,
      address: {
        recipient: address.recipient,
        phone: address.phone,
        line: address.line,
      },
      createdAt: at(-20 + i),
      history: [
        { status: "pending", at: at(-20 + i), actorId: userId },
        ...(status !== "pending"
          ? [{ status, at: at(-18 + i), actorId: "staff-1" }]
          : []),
      ],
    });
    db.orderItems.push({
      id: `oi-${i + 1}`,
      orderId,
      productId: p.id,
      name: p.name,
      imageUrl: `/images/${p.kind}.svg`,
      configuration: p.specifications[0].value,
      quantity: 1,
      price: p.price,
      warrantyCode: `NT-W-${i + 1}`,
      warrantyExpiresAt: at(345 + i),
    });
    db.paymentTransactions.push({
      id: `payment-${i + 1}`,
      orderId,
      amount: p.price - discount,
      status: paymentStatus,
      reference: `NUTEE-${i + 1}`,
      createdAt: at(-20 + i),
    });
    if (discount)
      db.orderPromotions.push({
        id: "op-1",
        orderId,
        promotionId: "promo-1",
        discount,
      });
    if (status === "delivered") {
      db.reviews.push({
        id: `review-${i + 1}`,
        userId,
        productId: p.id,
        orderItemId: `oi-${i + 1}`,
        rating: 5,
        comment: "Sản phẩm đáp ứng tốt nhu cầu sử dụng.",
        createdAt: at(-5),
      });
      const n = db.afterSaleRequests.length;
      const requestStatus = (
        [
          "pending",
          "reviewing",
          "approved",
          "rejected",
          "processing",
          "completed",
        ] as const
      )[n];
      db.afterSaleRequests.push({
        id: `after-${n + 1}`,
        userId,
        orderItemId: `oi-${i + 1}`,
        type: "warranty",
        quantity: 1,
        reason: "Yêu cầu kiểm tra thiết bị",
        status: requestStatus,
        createdAt: at(-3),
        history: [
          {
            status: requestStatus,
            at: at(-2),
            actorId: "staff-1",
            note: "Đã cập nhật trạng thái yêu cầu",
          },
        ],
      });
    }
  });
  return db;
}
