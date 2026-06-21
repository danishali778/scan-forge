import { useQuery } from "@tanstack/react-query";

import { listRoles, listUsers } from "@/api/admin";
import { pageItems } from "@/lib/apiPages";
import { mapAdminUser } from "@/lib/adminMapping";

export function useAdminSettings() {
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: listUsers,
  });
  const roles = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: listRoles,
  });

  return {
    users: pageItems(users.data).map(mapAdminUser),
    roleCount: pageItems(roles.data).length,
    isLoading: users.isLoading || roles.isLoading,
    error: users.error ?? roles.error,
  };
}
