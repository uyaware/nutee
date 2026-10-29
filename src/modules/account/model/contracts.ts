import type { Database, User } from "@/shared/types/database";
import type {
  AddressInput,
  ProfileSetupInput,
} from "@/modules/account/model/schemas";

export interface ProfileService {
  get(): Promise<{
    user: User;
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
