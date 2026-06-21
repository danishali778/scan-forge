import type { Page } from "@/types/api";

export function emptyPage<T>(): Page<T> {
  return {
    items: [],
    page: {
      limit: 0,
      next_cursor: null,
      has_more: false,
    },
  };
}

export function pageItems<T>(page: Page<T> | null | undefined): T[] {
  return page?.items ?? [];
}

export async function optionalPageItems<T>(request: () => Promise<Page<T>>): Promise<T[]> {
  try {
    return pageItems(await request());
  } catch {
    return [];
  }
}
