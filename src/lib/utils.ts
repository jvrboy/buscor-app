import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Type-safe API fetch that unwraps the { success, data } envelope.
 * For standard (non-paginated) responses.
 * Throws on non-ok responses with the server error message.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || json.message || `Request failed (${res.status})`);
  }

  // Unwrap { success: true, data: ... }
  if (json.success === true && json.data !== undefined) {
    return json.data as T;
  }

  // Fallback for backward compatibility
  return json as unknown as T;
}

/**
 * Paginated API response type
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Type-safe API fetch for paginated endpoints.
 * Returns { items, meta } by unwrapping the { success, data, meta } envelope.
 */
export async function apiFetchPaginated<T>(
  url: string,
  options?: RequestInit,
): Promise<PaginatedResponse<T>> {
  const res = await fetch(url, options);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || json.message || `Request failed (${res.status})`);
  }

  // Unwrap { success: true, data: [...], meta: {...} }
  if (json.success === true && json.data !== undefined) {
    return {
      items: json.data as T[],
      meta: json.meta,
    };
  }

  // Fallback
  return {
    items: Array.isArray(json) ? json : [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
  };
}