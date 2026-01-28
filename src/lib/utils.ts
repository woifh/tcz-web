import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the full API URL for a given path.
 * In development (with Vite proxy), returns relative path.
 * In production (Cloudflare Pages), prepends the API server URL.
 */
export function getApiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
