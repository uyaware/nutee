import { createApiAuth } from "@/modules/auth/api/authService";
import { createApiClient } from "@/shared/api/apiClient";
import { emptyCatalog } from "@/modules/catalog/model/emptyCatalog";
import { emptyCart } from "@/modules/cart/model/emptyCart";
import { createProfileService } from "@/modules/account/api/profileService";

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
});

const auth = createApiAuth({ api });
export const services = {
  auth,
  profile: createProfileService(auth),
  catalog: emptyCatalog,
  cart: emptyCart,
};
