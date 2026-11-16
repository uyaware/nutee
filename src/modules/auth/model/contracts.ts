import type {
    Portal,
    User,
    VerificationState,
} from "@/modules/auth/model/types";

export interface AuthService {
    register(email: string, password: string): Promise<User>;
    login(portal: Portal, email: string, password: string): Promise<User>;
    currentUser(portal: Portal): Promise<User | null>;
    logout(portal: Portal): Promise<void>;
    clearSession(): void;
    verification(): Promise<VerificationState>;
    resendVerification(): Promise<VerificationState>;
    verifyEmail(otp: string): Promise<User>;
    googleNonce(): Promise<{ nonce: string }>;
    google(credential: string): Promise<User>;
    linkGoogle(credential: string): Promise<User>;
    forgotPassword(email: string): Promise<{ message: string }>;
    resetPassword(email: string, otp: string, password: string): Promise<void>;
}
