import type { Database } from "@/shared/types/database";
import type { User } from "@/modules/auth/model/types";
import type {
  AddressInput,
  ProfileSetupInput,
} from "@/modules/account/model/schemas";

export interface ProfileService {
  get(): Promise<{
    user: User & { phone?: string; profileCompleted?: boolean };
    addresses: Database["addresses"];
    revision: number;
  }>;
  updateName(name: string, expectedRevision: number): Promise<void>;
  completeProfile(
    input: ProfileSetupInput,
    expectedRevision: number,
  ): Promise<User>;
  saveAddress(
    id: string | null,
    input: AddressInput,
    expectedRevision: number,
  ): Promise<void>;
  removeAddress(id: string, expectedRevision: number): Promise<void>;
  setDefaultAddress(id: string, expectedRevision: number): Promise<void>;
}
