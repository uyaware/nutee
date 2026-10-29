import type {
  Database,
  Order,
  Page,
  Portal,
  ProductSummary,
  User,
} from "../shared/types/database";
import type {
  CatalogFilters,
  CatalogPage,
  CatalogFacets,
  ProductDetail,
  ProductReview,
} from "../shared/types/catalog";
import type { Cart } from "../shared/types/cart";
import type { AddressInput, ProfileSetupInput } from "../shared/types/account";

export interface AuthService {
  register(
    email: string,
    password: string,
  ): Promise<User & { cartMergeNotices?: string[] }>;
  login(
    portal: Portal,
    email: string,
    password: string,
    remember?: boolean,
  ): Promise<User & { cartMergeNotices?: string[] }>;
  currentUser(portal: Portal): Promise<User | null>;
  logout(portal: Portal): Promise<void>;
}
export interface CatalogService {
  categories(): Promise<CatalogFacets["categories"]>;
  brands(): Promise<CatalogFacets["brands"]>;
  featured(): Promise<ProductSummary[]>;
  list(filters: CatalogFilters): Promise<CatalogPage>;
  detail(id: string): Promise<ProductDetail>;
  reviews(id: string, page?: number): Promise<Page<ProductReview>>;
}
export interface ProfileService {
  get(): Promise<{
    user: User;
    addresses: Database["addresses"];
    revision: number;
  }>;
  updateName(name: string, expectedRevision: number): Promise<void>;
  completeProfile(
    input: ProfileSetupInput,
    expectedRevision: number,
  ): Promise<User>;
  saveAddress(
    id: string | null,
    input: AddressInput,
    expectedRevision: number,
  ): Promise<void>;
  removeAddress(id: string, expectedRevision: number): Promise<void>;
  setDefaultAddress(id: string, expectedRevision: number): Promise<void>;
}
export interface CartService {
  get(): Promise<Cart>;
  add(productId: string, quantity: number): Promise<void>;
  setQuantity(
    productId: string,
    quantity: number,
    expectedRevision: number,
    ownerId: string | null,
  ): Promise<void>;
  remove(
    productId: string,
    expectedRevision: number,
    ownerId: string | null,
  ): Promise<void>;
}
export interface OrderService {
  list(portal: Portal): Promise<Page<Order>>;
  detail(portal: Portal, id: string): Promise<Order>;
}
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
export interface DemoService {
  stats(): Promise<{
    revision: number;
    seededAt: string;
    counts: { label: string; count: number }[];
  }>;
  reset(): Promise<void>;
}
export interface Services {
  auth: AuthService;
  catalog: CatalogService;
  profile: ProfileService;
  cart: CartService;
  orders: OrderService;
  management: ManagementService;
  demo: DemoService;
}
