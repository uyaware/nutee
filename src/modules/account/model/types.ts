import type { User } from "@/modules/auth/model/types";
import type { AddressInput } from "@/modules/account/model/schemas";

export interface Address extends AddressInput {
    id: string;
    line: string;
    recipient: string;
    phone: string;
}

export interface Profile {
    user: User & { phone: string; profileCompleted: boolean };
    googleLinked: boolean;
    addresses: Address[];
}
