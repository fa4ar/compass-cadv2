import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';
import LazyImageOverlay from '../LazyImageOverlay';

// Mock leaflet and react-leaflet
jest.mock('react-leaflet', () => ({
  ...jest.requireActual('react-leaflet'),
  ImageOverlay: ({ url, bounds, opacity }: any) => (
    <div data-testid="image-overlay" data-url={url} data-opacity={opacity}>
      Image Overlay
    </div>
  ),
  useMap: () => ({
    getBounds: () => L.latLngBounds([[0, 0], [100, 100]]),
    on: jest.fn(),
    off: jest.fn()
  })
}));

describe('LazyImageOverlay', () => {
  const mockBounds: L.LatLngBoundsLiteral = [[0, 0], [100, 100]];

  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = class {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    } as any;
  });

  it('should render loading placeholder when loading', () => {
    render(
      <MapContainer center={[0, 0]} zoom={1}>
        <LazyImageOverlay url="/test/image.png" bounds={mockBounds} />
      </MapContainer>
    );

    const overlay = screen.getByTestId('image-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay.getAttribute('data-url')).toContain('data:image');
  });

  it('should render loaded image', async () => {
    // Mock successful image load
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src: string = '';

      constructor() {
        setTimeout(() => {
          this.onload?.();
        }, 10);
      }
    } as any;

    render(
      <MapContainer center={[0, 0]} zoom={1}>
        <LazyImageOverlay url="/test/image.png" bounds={mockBounds} />
      </MapContainer>
    );

    await waitFor(
      () => {
        const overlay = screen.getByTestId('image-overlay');
        expect(overlay.getAttribute('data-url')).toBe('/test/image.png');
      },
      { timeout: 100 }
    );
  });

  it('should render error fallback on load error', async () => {
    // Mock failed image load
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src: string = '';

      constructor() {
        setTimeout(() => {
          this.onerror?.();
        }, 10);
      }
    } as any;

    render(
      <MapContainer center={[0, 0]} zoom={1}>
        <LazyImageOverlay url="/test/error.png" bounds={mockBounds} />
      </MapContainer>
    );

    await waitFor(
      () => {
        const overlay = screen.getByTestId('image-overlay');
        expect(overlay.getAttribute('data-url')).toContain('Error');
      },
      { timeout: 100 }
    );
  });

  it('should use fallback image on error', async () => {
    // Mock failed primary load, successful fallback
    let loadCount = 0;
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src: string = '';

      constructor() {
        setTimeout(() => {
          loadCount++;
          if (this.src.includes('fallback')) {
            this.onload?.();
          } else {
            this.onerror?.();
          }
        }, 10);
      }
    } as any;

    render(
      <MapContainer center={[0, 0]} zoom={1}>
        <LazyImageOverlay
          url="/test/error.png"
          bounds={mockBounds}
          fallbackUrl="/test/fallback.png"
        />
      </MapContainer>
    );

    await waitFor(
      () => {
        const overlay = screen.getByTestId('image-overlay');
        expect(overlay.getAttribute('data-url')).toBe('/test/fallback.png');
      },
      { timeout: 100 }
    );
  });

  it('should call onLoad callback when image loads', async () => {
    const onLoad = jest.fn();

    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src: string = '';

      constructor() {
        setTimeout(() => {
          this.onload?.();
        }, 10);
      }
    } as any;

    render(
      <MapContainer center={[0, 0]} zoom={1}>
        <LazyImageOverlay url="/test/image.png" bounds={mockBounds} onLoad={onLoad} />
      </MapContainer>
    );

    await waitFor(
      () => {
        expect(onLoad).toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });

  it('should call onError callback when image fails to load', async () => {
    const onError = jest.fn();

    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src: string = '';

      constructor() {
        setTimeout(() => {
          this.onerror?.();
        }, 10);
      }
    } as any;

    render(
      <MapContainer center={[0, 0]} zoom={1}>
        <LazyImageOverlay url="/test/error.png" bounds={mockBounds} onError={onError} />
      </MapContainer>
    );

    await waitFor(
      () => {
        expect(onError).toHaveBeenCalled();
      },
      { timeout: 100 }
    );
  });

  it('should apply opacity prop', () => {
    render(
      <MapContainer center={[0, 0]} zoom={1}>
        <LazyImageOverlay url="/test/image.png" bounds={mockBounds} opacity={0.5} />
      </MapContainer>
    );

    const overlay = screen.getByTestId('image-overlay');
    expect(overlay.getAttribute('data-opacity')).toBe('0.5');
  });

  it('should apply custom className', () => {
    render(
      <MapContainer center={[0, 0]} zoom={1}>
        <LazyImageOverlay url="/test/image.png" bounds={mockBounds} className="custom-class" />
      </MapContainer>
    );

    const overlay = screen.getByTestId('image-overlay');
    expect(overlay).toHaveClass('custom-class');
  });
});
