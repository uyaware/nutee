import type { Role } from "@/modules/auth/model/types";

export type ManagementUser = {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: Role;
    isActive: boolean;
};

export type ManagementUserPage = {
    content: ManagementUser[];
    totalElements: number;
    page: number;
    size: number;
};
