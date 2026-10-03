import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { backofficeTheme } from "../../shared/theme";
import { RequireAuth } from "../../shared/auth/RequireAuth";
import { LoginPage } from "../../shared/components/LoginPage";
import { OrderDetailPage } from "../../shared/components/OrdersPage";
import { SystemPage } from "../../shared/components/SystemPage";
import { ManagementLayout } from "./layouts/ManagementLayout";
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const ProductEditorPage = lazy(() => import("./pages/ProductEditorPage"));
const TaxonomyPage = lazy(() => import("./pages/TaxonomyPage"));
const PromotionsPage = lazy(() => import("./pages/PromotionsPage"));
const PromotionEditorPage = lazy(() => import("./pages/PromotionEditorPage"));
const UserDetailPage = lazy(() => import("./pages/UserDetailPage"));
const OperationsOrdersPage = lazy(() => import("./pages/OperationsOrdersPage"));
const AfterSalesPage = lazy(
  () => import("../../shared/components/PrototypeAfterSales"),
);
const AfterSaleDetailPage = lazy(
  () => import("../../shared/components/PrototypeAfterSaleDetail"),
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
