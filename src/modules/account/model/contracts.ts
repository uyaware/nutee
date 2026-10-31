import type { Profile } from "@/modules/account/model/types";
import type {
    AddressInput,
    ProfileInput,
    ProfileSetupInput,
} from "@/modules/account/model/schemas";

export interface ProfileService {
    get(): Promise<Profile>;
    update(input: ProfileInput): Promise<Profile>;
    completeProfile(input: ProfileSetupInput): Promise<Profile>;
    saveAddress(id: string | null, input: AddressInput): Promise<Profile>;
    removeAddress(id: string): Promise<Profile>;
    setDefaultAddress(id: string): Promise<Profile>;
}
