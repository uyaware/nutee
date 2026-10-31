import { createApiAuth } from "@/modules/auth/api/authService";
import { createApiClient } from "@/shared/api/apiClient";
import { createCatalogService } from "@/modules/catalog/api/catalogService";
import { createCartService } from "@/modules/cart/api/cartService";
import { createProfileService } from "@/modules/account/api/profileService";
import { createDiscountService } from "@/modules/management/api/discountService";
import { createCheckoutService } from "@/modules/checkout/api/checkoutService";

export const api = createApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
});

const auth = createApiAuth({ api });
export const services = {
    auth,
    profile: createProfileService(api),
    catalog: createCatalogService(api),
    cart: createCartService(api),
    discounts: createDiscountService(api),
    checkout: createCheckoutService(api),
};
