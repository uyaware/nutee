import type { ApiClient, ApiRequest } from "@/shared/api/apiClient";
import { mapApiUser, type ApiUser } from "@/modules/auth/model/api";
import type { ProfileService } from "@/modules/account/model/contracts";
import type { Profile } from "@/modules/account/model/types";
import {
    addressInputSchema,
    profileInputSchema,
    profileSetupSchema,
    type AddressInput,
} from "@/modules/account/model/schemas";
import { ServiceError } from "@/shared/lib/errors";

interface ApiProfile {
    user: ApiUser;
    phone: string | null;
    googleLinked: boolean;
    addresses: (Pick<AddressInput, "isDefault"> & {
        id: number;
        provinceCity: string | null;
        wardCommune: string | null;
        street: string | null;
    })[];
}

function mapProfile(data: ApiProfile): Profile {
    const user = mapApiUser(data.user);
    return {
        user: {
            ...user,
            phone: data.phone ?? "",
            profileCompleted: !!user.fullName?.trim() && !!data.phone,
        },
        googleLinked: data.googleLinked,
        addresses: data.addresses.map((address) => ({
            ...address,
            id: String(address.id),
            recipient: user.name,
            phone: data.phone ?? "",
            provinceCity: address.provinceCity ?? "",
            wardCommune: address.wardCommune ?? "",
            street: address.street ?? "",
            line: [address.street, address.wardCommune, address.provinceCity]
                .filter(Boolean)
                .join(", "),
        })),
    };
}

function addressPath(id: string) {
    if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647)
        throw new ServiceError("VALIDATION", "Địa chỉ không hợp lệ.");
    return `/account/addresses/${id}`;
}

/** Hồ sơ và địa chỉ dùng client cookie/CSRF chung, chỉ giữ dữ liệu trong bộ nhớ giao diện. */
export function createProfileService(api: ApiClient): ProfileService {
    const request = async (path: string, options?: ApiRequest) =>
        mapProfile(await api.request<ApiProfile>(path, options));
    return {
        get: () => request("/account/profile"),
        update: async (input) => {
            const fields = profileInputSchema.parse(input);
            return request("/account/profile", {
                method: "PUT",
                body: { fullName: fields.name, phone: fields.phone },
            });
        },
        completeProfile: async (input) => {
            const fields = profileSetupSchema.parse(input);
            return request("/account/profile", {
                method: "PUT",
                body: {
                    fullName: fields.name,
                    phone: fields.phone,
                    ...(fields.street
                        ? {
                              address: {
                                  street: fields.street,
                                  wardCommune: fields.wardCommune,
                                  provinceCity: fields.provinceCity,
                                  isDefault: true,
                              },
                          }
                        : {}),
                },
            });
        },
        saveAddress: async (id, input) =>
            request(id === null ? "/account/addresses" : addressPath(id), {
                method: id === null ? "POST" : "PUT",
                body: addressInputSchema.parse(input),
            }),
        removeAddress: async (id) =>
            request(addressPath(id), { method: "DELETE" }),
        setDefaultAddress: async (id) =>
            request(`${addressPath(id)}/default`, { method: "PUT" }),
    };
}
