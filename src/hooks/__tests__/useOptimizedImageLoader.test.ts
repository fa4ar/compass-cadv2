import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimizedImageLoader, imageCacheUtils } from '../useOptimizedImageLoader';

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';

  constructor() {
    setTimeout(() => {
      if (this.src.includes('error')) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    }, 10);
  }
} as any;

describe('useOptimizedImageLoader', () => {
  beforeEach(() => {
    imageCacheUtils.clearAll();
  });

  describe('Basic loading', () => {
    it('should load image successfully', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/image.png' })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.src).toBe(null);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.src).toBe('/test/image.png');
        expect(result.current.isError).toBe(false);
      });
    });

    it('should not load when shouldLoad is false', () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/image.png', shouldLoad: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.src).toBe(null);
    });

    it('should handle loading errors', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/error.png' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Caching', () => {
    it('should cache loaded images', async () => {
      const { result: first } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/image.png', cacheKey: 'test-key' })
      );

      await waitFor(() => {
        expect(first.current.src).toBe('/test/image.png');
      });

      expect(imageCacheUtils.has('test-key')).toBe(true);
      expect(imageCacheUtils.get('test-key')).toBe('/test/image.png');

      // Second hook should use cache
      const { result: second } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/image.png', cacheKey: 'test-key' })
      );

      expect(second.current.src).toBe('/test/image.png');
      expect(second.current.isLoading).toBe(false);
    });

    it('should use src as cache key if not provided', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/image.png' })
      );

      await waitFor(() => {
        expect(result.current.src).toBe('/test/image.png');
      });

      expect(imageCacheUtils.has('/test/image.png')).toBe(true);
    });
  });

  describe('Progressive loading', () => {
    it('should load low quality preview first', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({
          src: '/test/image.png',
          lowQualitySrc: '/test/image_low.png'
        })
      );

      // Should show low quality first
      await waitFor(
        () => {
          expect(result.current.src).toBe('/test/image_low.png');
        },
        { timeout: 50 }
      );

      // Then load full quality
      await waitFor(
        () => {
          expect(result.current.src).toBe('/test/image.png');
        },
        { timeout: 200 }
      );
    });

    it('should handle low quality loading error gracefully', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({
          src: '/test/image.png',
          lowQualitySrc: '/test/error_low.png'
        })
      );

      await waitFor(
        () => {
          expect(result.current.src).toBe('/test/image.png');
        },
        { timeout: 200 }
      );
    });
  });

  describe('Fallback images', () => {
    it('should load fallback on error', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({
          src: '/test/error.png',
          fallbackSrc: '/test/fallback.png'
        })
      );

      await waitFor(
        () => {
          expect(result.current.src).toBe('/test/fallback.png');
        },
        { timeout: 50 }
      );

      expect(result.current.isError).toBe(false);
    });

    it('should handle fallback loading error', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({
          src: '/test/error.png',
          fallbackSrc: '/test/error_fallback.png'
        })
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Cancellation', () => {
    it('should cancel loading when cancel is called', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/image.png' })
      );

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should cancel on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/image.png' })
      );

      unmount();

      // Should not throw errors
      expect(result.current.isLoading).toBe(false);
    });

    it('should cancel when shouldLoad changes to false', async () => {
      const { result, rerender } = renderHook(
        ({ shouldLoad }) => useOptimizedImageLoader({ src: '/test/image.png', shouldLoad }),
        { initialProps: { shouldLoad: true } }
      );

      rerender({ shouldLoad: false });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Manual load', () => {
    it('should load image manually when load is called', async () => {
      const { result } = renderHook(() =>
        useOptimizedImageLoader({ src: '/test/image.png', shouldLoad: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.src).toBe(null);

      act(() => {
        result.current.load();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.src).toBe('/test/image.png');
      });
    });
  });

  describe('Cache utilities', () => {
    it('should clear cache', () => {
      imageCacheUtils.set = jest.fn();
      imageCacheUtils.clear();
      expect(imageCacheUtils.set).not.toHaveBeenCalled();
    });

    it('should check cache existence', () => {
      imageCacheUtils.set('test', 'value');
      expect(imageCacheUtils.has('test')).toBe(true);
      expect(imageCacheUtils.has('nonexistent')).toBe(false);
    });

    it('should get cache value', () => {
      imageCacheUtils.set('test', 'value');
      expect(imageCacheUtils.get('test')).toBe('value');
    });

    it('should delete cache entry', () => {
      imageCacheUtils.set('test', 'value');
      imageCacheUtils.delete('test');
      expect(imageCacheUtils.has('test')).toBe(false);
    });

    it('should return cache size', () => {
      imageCacheUtils.set('test1', 'value1');
      imageCacheUtils.set('test2', 'value2');
      expect(imageCacheUtils.size()).toBe(2);
    });
  });
});
