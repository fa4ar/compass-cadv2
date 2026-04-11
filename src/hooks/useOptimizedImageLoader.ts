import { useState, useEffect, useRef, useCallback } from 'react';

interface UseOptimizedImageLoaderOptions {
  src: string;
  lowQualitySrc?: string;
  fallbackSrc?: string;
  shouldLoad?: boolean;
  cacheKey?: string;
}

interface UseOptimizedImageLoaderResult {
  src: string | null;
  isLoading: boolean;
  isError: boolean;
  load: () => void;
  cancel: () => void;
}

// Global cache for loaded images
const imageCache = new Map<string, string>();

// Low quality image cache
const lowQualityCache = new Map<string, string>();

export function useOptimizedImageLoader({
  src,
  lowQualitySrc,
  fallbackSrc,
  shouldLoad = true,
  cacheKey
}: UseOptimizedImageLoaderOptions): UseOptimizedImageLoaderResult {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Generate cache key if not provided
  const effectiveCacheKey = cacheKey || src;

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const loadImage = useCallback(async (url: string, signal: AbortSignal): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        if (!signal.aborted && isMountedRef.current) {
          resolve(url);
        }
      };
      
      img.onerror = () => {
        if (!signal.aborted && isMountedRef.current) {
          reject(new Error(`Failed to load image: ${url}`));
        }
      };
      
      img.src = url;
    });
  }, []);

  const load = useCallback(async () => {
    if (!shouldLoad || !src) return;
    
    // Check cache first
    if (imageCache.has(effectiveCacheKey)) {
      setCurrentSrc(imageCache.get(effectiveCacheKey)!);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    // Cancel any ongoing load
    cancel();
    
    setIsLoading(true);
    setIsError(false);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Load low quality preview first if available
      if (lowQualitySrc && !lowQualityCache.has(effectiveCacheKey)) {
        try {
          await loadImage(lowQualitySrc, signal);
          if (!signal.aborted && isMountedRef.current) {
            lowQualityCache.set(effectiveCacheKey, lowQualitySrc);
            setCurrentSrc(lowQualitySrc);
          }
        } catch (error) {
          console.warn('Failed to load low quality preview:', error);
        }
      } else if (lowQualitySrc && lowQualityCache.has(effectiveCacheKey)) {
        setCurrentSrc(lowQualityCache.get(effectiveCacheKey)!);
      }

      // Load full quality image with a small delay to allow LQIP to show
      loadTimeoutRef.current = setTimeout(async () => {
        if (!isMountedRef.current || signal.aborted) return;

        try {
          const loadedUrl = await loadImage(src, signal);
          if (!signal.aborted && isMountedRef.current) {
            imageCache.set(effectiveCacheKey, loadedUrl);
            setCurrentSrc(loadedUrl);
            setIsLoading(false);
          }
        } catch (error) {
          if (!signal.aborted && isMountedRef.current) {
            // Try fallback if available
            if (fallbackSrc) {
              try {
                const fallbackUrl = await loadImage(fallbackSrc, signal);
                if (!signal.aborted && isMountedRef.current) {
                  imageCache.set(effectiveCacheKey, fallbackUrl);
                  setCurrentSrc(fallbackUrl);
                  setIsLoading(false);
                }
              } catch (fallbackError) {
                console.error('Failed to load fallback image:', fallbackError);
                setIsError(true);
                setIsLoading(false);
              }
            } else {
              setIsError(true);
              setIsLoading(false);
            }
          }
        }
      }, 100); // 100ms delay for progressive loading effect
    } catch (error) {
      if (!signal.aborted && isMountedRef.current) {
        console.error('Image loading error:', error);
        setIsError(true);
        setIsLoading(false);
      }
    }
  }, [src, lowQualitySrc, fallbackSrc, shouldLoad, effectiveCacheKey, cancel, loadImage]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (shouldLoad) {
      load();
    }

    return () => {
      isMountedRef.current = false;
      cancel();
    };
  }, [shouldLoad, load, cancel]);

  return {
    src: currentSrc,
    isLoading,
    isError,
    load,
    cancel
  };
}

// Utility functions for cache management
export const imageCacheUtils = {
  clear: () => imageCache.clear(),
  clearLowQuality: () => lowQualityCache.clear(),
  has: (key: string) => imageCache.has(key),
  get: (key: string) => imageCache.get(key),
  delete: (key: string) => imageCache.delete(key),
  size: () => imageCache.size,
  clearAll: () => {
    imageCache.clear();
    lowQualityCache.clear();
  }
};
