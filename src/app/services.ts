import { createApiAuth } from "@/modules/auth/api/authService";
import { createApiClient } from "@/shared/api/apiClient";
import { createCatalogService } from "@/modules/catalog/api/catalogService";
import { createCartService } from "@/modules/cart/api/cartService";
import { createProfileService } from "@/modules/account/api/profileService";

export const api = createApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
});

const auth = createApiAuth({ api });
export const services = {
    auth,
    profile: createProfileService(api),
    catalog: createCatalogService(api),
    cart: createCartService(api),
};
