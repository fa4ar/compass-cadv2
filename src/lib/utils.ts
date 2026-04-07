import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, retries = 2, retryDelay = 1000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const attemptFetch = async (attempt: number): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (attempt < retries && error.name === 'AbortError') {
        console.warn(`⏳ [FETCH] Request timeout, retry ${attempt + 1}/${retries}...`);
        await new Promise(r => setTimeout(r, retryDelay));
        return attemptFetch(attempt + 1);
      }
      
      throw error;
    }
  };

  return attemptFetch(0);
}

export async function fetchWithGracefulDegradation<T = any>(
  url: string,
  options: FetchOptions = {},
  fallback?: T
): Promise<T | null> {
  try {
    const response = await fetchWithTimeout(url, options);
    
    if (!response.ok) {
      console.error(`❌ [FETCH] Request failed with status ${response.status}`);
      return fallback ?? null;
    }
    
    return await response.json();
  } catch (error: any) {
    console.error(`❌ [FETCH] Network error:`, error.message);
    return fallback ?? null;
  }
}

export function getApiUrl(): string {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isIP = hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
    const isLocalhost = hostname === 'localhost';
    const isDomain = !isIP && !isLocalhost;

    if (isDomain && (!apiUrl || apiUrl.includes('localhost'))) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const baseDomain = parts.slice(-2).join('.');
        if (hostname.startsWith('api.')) {
            apiUrl = `${window.location.protocol}//${hostname}`;
        } else {
            apiUrl = `${window.location.protocol}//api.${baseDomain}`;
        }
      } else {
        apiUrl = `${window.location.protocol}//api.${hostname}`;
      }
      console.log(`📡 [UTILS] Dynamic API URL resolved: ${apiUrl}`);
    } else if (!apiUrl) {
      apiUrl = 'http://localhost:4000';
    }
  }
  
  return apiUrl;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
