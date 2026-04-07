import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
        // Проверяем, если мы уже на поддомене api., то используем текущий hostname
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
