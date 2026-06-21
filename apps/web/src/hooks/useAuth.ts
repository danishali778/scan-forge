import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUser, login, logout } from "@/api/auth";
import { queryKeys } from "@/lib/queryKeys";
import type { LoginRequest } from "@/types/api";

export const currentUserQueryKey = queryKeys.auth.me;

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 30_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequest) => login(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me, {
        authenticated: false,
        user_id: null,
        email: null,
        workspace_id: null,
        role: null,
        permissions: [],
      });
    },
  });
}
