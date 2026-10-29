import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { StorefrontLayout } from "@/app/layouts/StorefrontLayout";
import { RequireAuth } from "@/modules/auth/guards/RequireAuth";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { AccountLayout } from "@/modules/account/layouts/AccountLayout";
import { OrderDetailPage, OrdersPage } from "@/modules/orders/pages/OrdersPage";
import { SystemPage } from "@/shared/components/SystemPage";
const HomePage = lazy(() => import("@/modules/catalog/pages/HomePage"));
const CatalogPage = lazy(() => import("@/modules/catalog/pages/CatalogPage"));
const ProductDetailPage = lazy(
  () => import("@/modules/catalog/pages/ProductDetailPage"),
);
const ProfilePage = lazy(() => import("@/modules/account/pages/ProfilePage"));
const AddressesPage = lazy(
  () => import("@/modules/account/pages/AddressesPage"),
);
const SecurityPage = lazy(() => import("@/modules/account/pages/SecurityPage"));
const CartPage = lazy(() => import("@/modules/cart/pages/CartPage"));
const AuthDemoPage = lazy(() => import("@/modules/auth/pages/AuthDemoPage"));
const PasswordRecoveryPage = lazy(
  () => import("@/modules/auth/pages/PasswordRecoveryPage"),
);
const RegisterPage = lazy(() => import("@/modules/auth/pages/RegisterPage"));
const ProfileSetupPage = lazy(
  () => import("@/modules/account/pages/ProfileSetupPage"),
);
const CheckoutPage = lazy(
  () => import("@/modules/checkout/pages/CheckoutPage"),
);
const PaymentPage = lazy(() => import("@/modules/checkout/pages/PaymentPage"));
const OrderSuccessPage = lazy(
  () => import("@/modules/checkout/pages/OrderSuccessPage"),
);
const ReviewPage = lazy(() => import("@/modules/catalog/pages/ReviewPage"));
const AfterSalesPage = lazy(
  () => import("@/modules/after-sales/pages/PrototypeAfterSales"),
);
const AfterSaleDetailPage = lazy(
  () => import("@/modules/after-sales/pages/PrototypeAfterSaleDetail"),
);
const AfterSaleCreatePage = lazy(
  () => import("@/modules/after-sales/pages/AfterSaleCreatePage"),
);
export default function CustomerRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage portal="customer" />} />
      <Route path="register" element={<RegisterPage />} />
      <Route element={<StorefrontLayout />}>
        <Route
          path="verify-email"
          element={<AuthDemoPage mode="verify-email" />}
        />
        <Route
          path="forgot-password"
          element={<PasswordRecoveryPage mode="forgot-password" />}
        />
        <Route
          path="reset-password"
          element={<PasswordRecoveryPage mode="reset-password" />}
        />
        <Route path="cart" element={<CartPage />} />
        <Route index element={<HomePage />} />
        <Route path="products" element={<CatalogPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route element={<RequireAuth portal="customer" />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders/:id/payment" element={<PaymentPage />} />
          <Route path="orders/:id/success" element={<OrderSuccessPage />} />
          <Route path="account/setup" element={<ProfileSetupPage />} />
          <Route element={<AccountLayout />}>
            <Route
              path="account"
              element={<Navigate to="/account/profile" replace />}
            />
            <Route path="account/profile" element={<ProfilePage />} />
            <Route path="account/addresses" element={<AddressesPage />} />
            <Route path="account/security" element={<SecurityPage />} />
            <Route
              path="account/orders"
              element={<OrdersPage portal="customer" />}
            />
            <Route
              path="account/orders/:id"
              element={<OrderDetailPage portal="customer" />}
            />
            <Route
              path="account/orders/:id/review/:itemId"
              element={<ReviewPage />}
            />
            <Route
              path="account/after-sales"
              element={<AfterSalesPage portal="customer" />}
            />
            <Route
              path="account/after-sales/new"
              element={<AfterSaleCreatePage />}
            />
            <Route
              path="account/after-sales/:id"
              element={<AfterSaleDetailPage portal="customer" />}
            />
          </Route>
        </Route>
        <Route path="403" element={<SystemPage forbidden />} />
        <Route path="*" element={<SystemPage />} />
      </Route>
    </Routes>
  );
}
