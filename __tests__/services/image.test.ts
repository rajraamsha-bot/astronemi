/**
 * Image Service Tests
 */

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Image: {
    getSize: jest.fn((uri, success, failure) => {
      success(100, 100);
    }),
    prefetch: jest.fn(() => Promise.resolve(true)),
  },
}));

// Import service after mocks
import { imageService, ImageSizes, ImageQuality } from '@/services/image';

describe('Image Service', () => {
  describe('getOptimizedUrl', () => {
    it('should return empty string for empty URL', () => {
      const result = imageService.getOptimizedUrl('');
      expect(result).toBe('');
    });

    it('should return original URL for non-transformable domains', () => {
      const url = 'https://example.com/image.jpg';
      const result = imageService.getOptimizedUrl(url);
      expect(result).toBe(url);
    });

    it('should transform Cloudinary URLs', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const result = imageService.getOptimizedUrl(url, { width: 300, height: 300 });
      
      expect(result).toContain('w_300');
      expect(result).toContain('h_300');
    });

    it('should transform Imgix URLs', () => {
      const url = 'https://demo.imgix.net/sample.jpg';
      const result = imageService.getOptimizedUrl(url, { width: 300, height: 300 });
      
      expect(result).toContain('w=300');
      expect(result).toContain('h=300');
    });

    it('should apply quality option', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const result = imageService.getOptimizedUrl(url, { quality: 75 });
      
      expect(result).toContain('q_75');
    });

    it('should apply format option', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const result = imageService.getOptimizedUrl(url, { format: 'webp' });
      
      expect(result).toContain('f_webp');
    });

    it('should use default dimensions when not specified', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const result = imageService.getOptimizedUrl(url);
      
      expect(result).toContain('w_');
      expect(result).toContain('h_');
    });
  });

  describe('ImageSizes', () => {
    it('should have thumbnail size', () => {
      expect(ImageSizes.thumbnail).toEqual({ width: 80, height: 80 });
    });

    it('should have small size', () => {
      expect(ImageSizes.small).toEqual({ width: 150, height: 150 });
    });

    it('should have medium size', () => {
      expect(ImageSizes.medium).toEqual({ width: 300, height: 300 });
    });

    it('should have large size', () => {
      expect(ImageSizes.large).toEqual({ width: 600, height: 600 });
    });

    it('should have avatar size', () => {
      expect(ImageSizes.avatar).toEqual({ width: 100, height: 100 });
    });

    it('should have avatarLarge size', () => {
      expect(ImageSizes.avatarLarge).toEqual({ width: 200, height: 200 });
    });

    it('should have banner size', () => {
      expect(ImageSizes.banner).toBeDefined();
      expect(ImageSizes.banner.height).toBe(200);
    });

    it('should have cover size', () => {
      expect(ImageSizes.cover).toBeDefined();
      expect(ImageSizes.cover.height).toBe(300);
    });

    it('should have card size', () => {
      expect(ImageSizes.card).toBeDefined();
      expect(ImageSizes.card.height).toBe(200);
    });

    it('should have product size', () => {
      expect(ImageSizes.product).toBeDefined();
      expect(ImageSizes.product.height).toBe(200);
    });
  });

  describe('ImageQuality', () => {
    it('should have low quality', () => {
      expect(ImageQuality.low).toBe(50);
    });

    it('should have medium quality', () => {
      expect(ImageQuality.medium).toBe(75);
    });

    it('should have high quality', () => {
      expect(ImageQuality.high).toBe(90);
    });

    it('should have original quality', () => {
      expect(ImageQuality.original).toBe(100);
    });
  });

  describe('preload', () => {
    it('should preload images', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];
      
      await imageService.preload(urls);

      // Should complete without error (Image.prefetch is mocked)
      expect(urls.length).toBe(2);
    });

    it('should handle empty array', async () => {
      await expect(imageService.preload([])).resolves.not.toThrow();
    });
  });

  describe('prefetch', () => {
    it('should prefetch an image', async () => {
      const result = await imageService.prefetch('https://example.com/image.jpg');
      expect(result).toBe(true);
    });
  });

  describe('getImageSize', () => {
    it('should get image size', async () => {
      const url = 'https://example.com/image.jpg';
      
      const size = await imageService.getImageSize(url);
      
      expect(size).toHaveProperty('width');
      expect(size).toHaveProperty('height');
    });
  });

  describe('getAspectRatio', () => {
    it('should get aspect ratio', async () => {
      const url = 'https://example.com/image.jpg';
      
      const ratio = await imageService.getAspectRatio(url);
      
      expect(typeof ratio).toBe('number');
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      await expect(imageService.clearCache()).resolves.not.toThrow();
    });
  });

  describe('getCacheInfo', () => {
    it('should return cache info', () => {
      const info = imageService.getCacheInfo();
      
      expect(info).toHaveProperty('preloadedCount');
    });
  });

  describe('getFastImageSource', () => {
    it('should return FastImage source with normal priority', () => {
      const source = imageService.getFastImageSource('https://example.com/image.jpg');
      
      expect(source.uri).toBe('https://example.com/image.jpg');
      expect(source.priority).toBe('normal');
    });

    it('should return FastImage source with low priority', () => {
      const source = imageService.getFastImageSource('https://example.com/image.jpg', 'low');
      
      expect(source.priority).toBe('low');
    });

    it('should return FastImage source with high priority', () => {
      const source = imageService.getFastImageSource('https://example.com/image.jpg', 'high');
      
      expect(source.priority).toBe('high');
    });
  });

  describe('getResponsiveSize', () => {
    it('should return responsive size', () => {
      const size = imageService.getResponsiveSize(400, 1.5);
      
      expect(size).toHaveProperty('width');
      expect(size).toHaveProperty('height');
    });

    it('should use default aspect ratio of 1', () => {
      const size = imageService.getResponsiveSize(400);
      
      // With aspect ratio 1, width and height should be equal
      expect(size.width).toBe(size.height);
    });
  });

  describe('calculateOptimalDimensions', () => {
    it('should calculate dimensions with container width only', () => {
      const dims = imageService.calculateOptimalDimensions(1000, 500, 300);
      
      expect(dims.width).toBe(300);
      expect(dims.height).toBe(150);
    });

    it('should calculate dimensions with container width and height', () => {
      const dims = imageService.calculateOptimalDimensions(1000, 500, 300, 200);
      
      expect(dims.width).toBeDefined();
      expect(dims.height).toBeDefined();
    });

    it('should handle wider images', () => {
      // Image is wider than container aspect ratio
      const dims = imageService.calculateOptimalDimensions(2000, 500, 300, 200);
      
      expect(dims.width).toBeLessThanOrEqual(300);
      expect(dims.height).toBeLessThanOrEqual(200);
    });

    it('should handle taller images', () => {
      // Image is taller than container aspect ratio
      const dims = imageService.calculateOptimalDimensions(500, 2000, 300, 200);
      
      expect(dims.width).toBeLessThanOrEqual(300);
      expect(dims.height).toBeLessThanOrEqual(200);
    });
  });

  describe('Cloudinary Transformations', () => {
    it('should apply crop fill', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const result = imageService.getOptimizedUrl(url, { width: 200, height: 200 });
      
      expect(result).toContain('c_fill');
    });

    it('should handle URLs without /upload/', () => {
      const url = 'https://res.cloudinary.com/demo/sample.jpg';
      const result = imageService.getOptimizedUrl(url);
      
      // Should return original URL if no /upload/ found
      expect(result).toBe(url);
    });
  });

  describe('Imgix Transformations', () => {
    it('should add fit=crop parameter', () => {
      const url = 'https://demo.imgix.net/sample.jpg';
      const result = imageService.getOptimizedUrl(url);
      
      expect(result).toContain('fit=crop');
    });

    it('should handle URLs with existing query params', () => {
      const url = 'https://demo.imgix.net/sample.jpg?auto=format';
      const result = imageService.getOptimizedUrl(url);
      
      expect(result).toContain('&');
    });

    it('should handle URLs without query params', () => {
      const url = 'https://demo.imgix.net/sample.jpg';
      const result = imageService.getOptimizedUrl(url);
      
      expect(result).toContain('?');
    });
  });

  describe('Transformable Domains', () => {
    it('should transform cloudinary.com URLs', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const result = imageService.getOptimizedUrl(url);
      expect(result).not.toBe(url);
    });

    it('should transform imgix.net URLs', () => {
      const url = 'https://demo.imgix.net/sample.jpg';
      const result = imageService.getOptimizedUrl(url);
      expect(result).not.toBe(url);
    });

    it('should not transform unknown domains', () => {
      const url = 'https://example.com/image.jpg';
      const result = imageService.getOptimizedUrl(url);
      expect(result).toBe(url);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string URL', () => {
      const result = imageService.getOptimizedUrl('');
      expect(result).toBe('');
    });

    it('should handle falsy URL', () => {
      const result = imageService.getOptimizedUrl('' as string);
      expect(result).toBe('');
    });

    it('should handle malformed URL', () => {
      const result = imageService.getOptimizedUrl('not-a-url');
      expect(result).toBe('not-a-url');
    });
  });
});
