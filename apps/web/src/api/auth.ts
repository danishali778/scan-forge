import { apiRequest } from "@/api/client";
import type { AuthResponse, CurrentUserResponse, LoginRequest } from "@/types/api";

export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: request,
  });
}

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiRequest<CurrentUserResponse>("/auth/me");
}

export function logout(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>("/auth/logout", {
    method: "POST",
  });
}
