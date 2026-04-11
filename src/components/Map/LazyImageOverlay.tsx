import React, { useRef, useEffect, useState } from 'react';
import { ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useOptimizedImageLoader, imageCacheUtils } from '@/hooks/useOptimizedImageLoader';

interface LazyImageOverlayProps {
  url: string;
  bounds: L.LatLngBoundsLiteral;
  opacity?: number;
  lowQualityUrl?: string;
  fallbackUrl?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Viewport detection hook
function useViewportDetection(bounds: L.LatLngBoundsLiteral) {
  const map = useMap();
  const [isInViewport, setIsInViewport] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Check if bounds are currently in viewport
    const mapBounds = map.getBounds();
    const overlayBounds = L.latLngBounds(bounds);
    const intersects = mapBounds.intersects(overlayBounds);
    
    setIsInViewport(intersects);

    // Set up viewport change listener
    const handleViewportChange = () => {
      const newMapBounds = map.getBounds();
      const newIntersects = newMapBounds.intersects(overlayBounds);
      setIsInViewport(newIntersects);
    };

    map.on('moveend', handleViewportChange);
    map.on('zoomend', handleViewportChange);

    return () => {
      map.off('moveend', handleViewportChange);
      map.off('zoomend', handleViewportChange);
    };
  }, [map, bounds]);

  return isInViewport;
}

export default function LazyImageOverlay({
  url,
  bounds,
  opacity = 1,
  lowQualityUrl,
  fallbackUrl,
  className,
  onLoad,
  onError
}: LazyImageOverlayProps) {
  const isInViewport = useViewportDetection(bounds);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const {
    src: loadedSrc,
    isLoading,
    isError,
    load,
    cancel
  } = useOptimizedImageLoader({
    src: url,
    lowQualitySrc: lowQualityUrl,
    fallbackSrc: fallbackUrl,
    shouldLoad: isInViewport,
    cacheKey: url
  });

  // Trigger callbacks
  useEffect(() => {
    if (loadedSrc && !isLoading && !isError) {
      onLoad?.();
    }
    if (isError) {
      onError?.();
    }
  }, [loadedSrc, isLoading, isError, onLoad, onError]);

  // Cancel loading when component unmounts or goes out of viewport
  useEffect(() => {
    return () => {
      if (!isInViewport) {
        cancel();
      }
    };
  }, [isInViewport, cancel]);

  // Don't render anything if not in viewport and not loaded
  if (!isInViewport && !loadedSrc) {
    return null;
  }

  // Show loading placeholder
  if (isLoading && !loadedSrc) {
    return (
      <ImageOverlay
        url="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%230a0a0a'/%3E%3C/svg%3E"
        bounds={bounds}
        opacity={opacity}
        className={className}
      />
    );
  }

  // Show error fallback
  if (isError || !loadedSrc) {
    return (
      <ImageOverlay
        url="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='12'%3EError%3C/text%3E%3C/svg%3E"
        bounds={bounds}
        opacity={opacity}
        className={className}
      />
    );
  }

  // Show loaded image
  return (
    <ImageOverlay
      url={loadedSrc}
      bounds={bounds}
      opacity={opacity}
      className={className}
    />
  );
}

// Export utility functions for cache management
export { imageCacheUtils };
