import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { backofficeTheme } from "@/shared/theme";
import { RequireAuth } from "@/modules/auth/guards/RequireAuth";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { OrderDetailPage } from "@/modules/orders/pages/OrdersPage";
import { SystemPage } from "@/shared/components/SystemPage";
import { ManagementLayout } from "@/app/layouts/ManagementLayout";
const DashboardPage = lazy(
  () => import("@/modules/management/dashboard/pages/DashboardPage"),
);
const ProductsPage = lazy(
  () => import("@/modules/management/products/pages/ProductsPage"),
);
const UsersPage = lazy(
  () => import("@/modules/management/users/pages/UsersPage"),
);
const ProductEditorPage = lazy(
  () => import("@/modules/management/products/pages/ProductEditorPage"),
);
const TaxonomyPage = lazy(
  () => import("@/modules/management/taxonomy/pages/TaxonomyPage"),
);
const PromotionsPage = lazy(
  () => import("@/modules/management/promotions/pages/PromotionsPage"),
);
const PromotionEditorPage = lazy(
  () => import("@/modules/management/promotions/pages/PromotionEditorPage"),
);
const UserDetailPage = lazy(
  () => import("@/modules/management/users/pages/UserDetailPage"),
);
const OperationsOrdersPage = lazy(
  () => import("@/modules/orders/pages/OperationsOrdersPage"),
);
const AfterSalesPage = lazy(
  () => import("@/modules/after-sales/pages/PrototypeAfterSales"),
);
const AfterSaleDetailPage = lazy(
  () => import("@/modules/after-sales/pages/PrototypeAfterSaleDetail"),
);
export default function BackofficeRoutes() {
  return (
    <ThemeProvider theme={backofficeTheme}>
      <Routes>
        <Route path="login" element={<LoginPage portal="backoffice" />} />
        <Route element={<RequireAuth portal="backoffice" />}>
          <Route element={<ManagementLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="orders" element={<OperationsOrdersPage />} />
            <Route
              path="orders/:id"
              element={<OrderDetailPage portal="backoffice" />}
            />
            <Route
              path="after-sales"
              element={<AfterSalesPage portal="backoffice" />}
            />
            <Route
              path="after-sales/:id"
              element={<AfterSaleDetailPage portal="backoffice" />}
            />
            <Route
              element={
                <RequireAuth portal="backoffice" permission="products:write" />
              }
            >
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProductEditorPage />} />
              <Route path="products/:id/edit" element={<ProductEditorPage />} />
              <Route path="brands" element={<TaxonomyPage kind="brands" />} />
              <Route
                path="categories"
                element={<TaxonomyPage kind="categories" />}
              />
            </Route>
            <Route
              element={
                <RequireAuth portal="backoffice" permission="users:read" />
              }
            >
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:id" element={<UserDetailPage />} />
            </Route>
            <Route
              element={
                <RequireAuth
                  portal="backoffice"
                  permission="promotions:write"
                />
              }
            >
              <Route path="promotions" element={<PromotionsPage />} />
              <Route path="promotions/new" element={<PromotionEditorPage />} />
              <Route path="promotions/:id" element={<PromotionEditorPage />} />
            </Route>
            <Route path="403" element={<SystemPage forbidden management />} />
            <Route path="*" element={<SystemPage management />} />
          </Route>
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
