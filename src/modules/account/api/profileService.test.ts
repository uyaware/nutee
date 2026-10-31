import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/api/apiClient";
import { createProfileService } from "@/modules/account/api/profileService";

const address = {
    provinceCity: "TP Hồ Chí Minh",
    wardCommune: "Phường 1",
    street: "12 Đường A",
    isDefault: true,
};
const profile = {
    user: {
        id: "account-owner",
        username: "owner",
        fullName: "Tên hồ sơ",
        email: "owner@example.invalid",
        role: "CUSTOMER",
        emailVerified: true,
        imageUrl: null,
    },
    phone: "0912345678",
    googleLinked: true,
    addresses: [{ id: 12, ...address }],
};

function setup() {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
        Response.json(
            String(url).endsWith("/auth/csrf")
                ? { token: "profile-csrf", headerName: "X-XSRF-TOKEN" }
                : profile,
        ),
    );
    return { fetch, service: createProfileService(createApiClient({ fetch })) };
}

describe("account profile API", () => {
    it("maps the account and address components and sends all mutations with cookie/CSRF protection", async () => {
        const { fetch, service } = setup();
        expect(await service.get()).toMatchObject({
            googleLinked: true,
            user: {
                name: "Tên hồ sơ",
                phone: "0912345678",
                profileCompleted: true,
            },
            addresses: [
                {
                    id: "12",
                    line: "12 Đường A, Phường 1, TP Hồ Chí Minh",
                    recipient: "Tên hồ sơ",
                    phone: "0912345678",
                },
            ],
        });
        await service.update({ name: " Tên mới ", phone: "0912345678" });
        await service.saveAddress(null, address);
        await service.saveAddress("12", address);
        await service.setDefaultAddress("12");
        await service.removeAddress("12");
        const requests = fetch.mock.calls.filter(
            ([url]) => !String(url).endsWith("/csrf"),
        );
        expect(requests.map(([url, init]) => [url, init?.method])).toEqual([
            ["/api/v1/account/profile", "GET"],
            ["/api/v1/account/profile", "PUT"],
            ["/api/v1/account/addresses", "POST"],
            ["/api/v1/account/addresses/12", "PUT"],
            ["/api/v1/account/addresses/12/default", "PUT"],
            ["/api/v1/account/addresses/12", "DELETE"],
        ]);
        expect(JSON.parse(requests[1][1]!.body as string)).toEqual({
            fullName: "Tên mới",
            phone: "0912345678",
        });
        expect(JSON.parse(requests[2][1]!.body as string)).toEqual(address);
        expect(JSON.parse(requests[3][1]!.body as string)).toEqual(address);
        for (const [, init] of requests) {
            expect(init?.credentials).toBe("include");
            if (init?.method !== "GET")
                expect(new Headers(init?.headers).get("X-XSRF-TOKEN")).toBe(
                    "profile-csrf",
                );
        }
    });

    it("validates input before requests and submits optional setup address atomically", async () => {
        const { fetch, service } = setup();
        await expect(
            service.update({ name: " ", phone: "123" }),
        ).rejects.toThrow();
        await expect(
            service.saveAddress(null, { ...address, wardCommune: " " }),
        ).rejects.toThrow();
        await expect(service.removeAddress("../other")).rejects.toMatchObject({
            code: "VALIDATION",
        });
        expect(fetch).not.toHaveBeenCalled();
        await service.completeProfile({
            name: "Tên mới",
            phone: "0912345678",
            street: address.street,
            wardCommune: address.wardCommune,
            provinceCity: address.provinceCity,
        });
        const writes = fetch.mock.calls.filter(
            ([, init]) => init?.method === "PUT" || init?.method === "POST",
        );
        expect(writes).toHaveLength(1);
        expect(JSON.parse(writes[0][1]!.body as string)).toMatchObject({
            fullName: "Tên mới",
            address: { ...address, isDefault: true },
        });
        const body = JSON.parse(writes[0][1]!.body as string);
        expect(body.address).not.toHaveProperty("recipient");
        expect(body.address).not.toHaveProperty("phone");
    });

    it("surfaces failed saves and reads rather than returning a successful or empty profile", async () => {
        const { fetch, service } = setup();
        fetch.mockImplementation(async (url) =>
            String(url).endsWith("/csrf")
                ? Response.json({ token: "csrf", headerName: "X-XSRF-TOKEN" })
                : Response.json(
                      { detail: "Địa chỉ đang được sử dụng." },
                      { status: 409 },
                  ),
        );
        await expect(service.removeAddress("12")).rejects.toMatchObject({
            code: "CONFLICT",
        });
        await expect(service.get()).rejects.toMatchObject({ code: "CONFLICT" });
    });
});
