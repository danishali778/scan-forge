import { useQuery } from "@tanstack/react-query";

import { listProjects } from "@/api/projects";
import { queryKeys } from "@/lib/queryKeys";

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: listProjects,
  });
}
