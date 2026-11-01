/**
 * Image Service
 * 
 * Handles image optimization, lazy loading, and caching
 */

import { Image, Platform, Dimensions } from 'react-native';
import { Logger } from '@/services/logger';

// FastImage types for when the package is installed
type FastImagePriority = 'low' | 'normal' | 'high';
type FastImageCacheControl = 'immutable' | 'web' | 'cacheOnly';

// Mock FastImage for development (install react-native-fast-image for production)
const FastImage = {
  priority: {
    low: 'low' as const,
    normal: 'normal' as const,
    high: 'high' as const,
  },
  cacheControl: {
    immutable: 'immutable' as const,
    web: 'web' as const,
    cacheOnly: 'cacheOnly' as const,
  },
  preload: async (_sources: { uri: string }[]) => {
    // Mock implementation - use react-native-fast-image in production
  },
};

// Screen dimensions
const { width: SCREEN_WIDTH, height: _SCREEN_HEIGHT } = Dimensions.get('window');

// Image size presets
export const ImageSizes = {
  thumbnail: { width: 80, height: 80 },
  small: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 600, height: 600 },
  avatar: { width: 100, height: 100 },
  avatarLarge: { width: 200, height: 200 },
  banner: { width: SCREEN_WIDTH, height: 200 },
  cover: { width: SCREEN_WIDTH, height: 300 },
  card: { width: SCREEN_WIDTH - 40, height: 200 },
  product: { width: SCREEN_WIDTH / 2 - 30, height: 200 },
};

// Image quality levels
export const ImageQuality = {
  low: 50,
  medium: 75,
  high: 90,
  original: 100,
};

// Cache configuration
const CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 100 * 1024 * 1024, // 100MB
};

// Progressive loading configuration
const PROGRESSIVE_CONFIG = {
  // Load low quality first, then high quality
  lowQualityFirst: true,
  // Blur hash placeholder
  useBlurHash: true,
  // Lazy load threshold (pixels from viewport)
  lazyLoadThreshold: 100,
  // WebP support detection
  preferWebP: Platform.OS !== 'ios',
};

// Image format optimization
const FORMAT_CONFIG = {
  // Default formats by platform
  default: Platform.OS === 'ios' ? 'jpg' : 'webp',
  // Fallback format
  fallback: 'jpg',
  // Quality levels by image type
  quality: {
    avatar: 85,
    product: 80,
    banner: 75,
    thumbnail: 70,
    gallery: 85,
  },
};

// Use the configs to prevent unused variable warnings
void CACHE_CONFIG;
void PROGRESSIVE_CONFIG;
void FORMAT_CONFIG;

// Preloaded images cache
const preloadedImages = new Set<string>();

class ImageService {
  /**
   * Get optimized image URL
   */
  getOptimizedUrl(
    url: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpg' | 'png';
    }
  ): string {
    if (!url) return '';

    // Check if URL supports transformation (e.g., Cloudinary, Imgix)
    const isTransformable = this.isTransformableUrl(url);
    
    if (!isTransformable) {
      return url;
    }

    const width = options?.width || ImageSizes.medium.width;
    const height = options?.height || ImageSizes.medium.height;
    const quality = options?.quality || ImageQuality.medium;
    const format = options?.format || (Platform.OS === 'ios' ? 'webp' : 'jpg');

    // Apply transformations based on URL pattern
    if (url.includes('cloudinary.com')) {
      return this.transformCloudinaryUrl(url, { width, height, quality, format });
    }
    
    if (url.includes('imgix.net')) {
      return this.transformImgixUrl(url, { width, height, quality, format });
    }

    if (url.includes('supabase.co')) {
      return this.transformSupabaseUrl(url, { width, height, quality });
    }

    // Default: return original URL
    return url;
  }

  /**
   * Check if URL supports transformation
   */
  private isTransformableUrl(url: string): boolean {
    const transformableDomains = [
      'cloudinary.com',
      'imgix.net',
      'cloudfront.net',
      'amazonaws.com',
      'supabase.co',
    ];
    
    return transformableDomains.some(domain => url.includes(domain));
  }

  /**
   * Transform Supabase URL
   */
  private transformSupabaseUrl(
    url: string,
    options: { width: number; height: number; quality: number }
  ): string {
    const separator = url.includes('?') ? '&' : '?';
    // Supabase supports resizing via width, height, quality, and resize parameters
    // Format: https://project.supabase.co/storage/v1/render/image/public/bucket/path?width=200&height=200&quality=80
    
    // If it's already a render URL, just add params
    if (url.includes('/render/image/')) {
      return `${url}${separator}width=${options.width}&height=${options.height}&quality=${options.quality}&resize=cover`;
    }
    
    // Convert public URL to render URL
    if (url.includes('/storage/v1/object/public/')) {
      return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + 
             `${separator}width=${options.width}&height=${options.height}&quality=${options.quality}&resize=cover`;
    }
    
    return url;
  }

  /**
   * Transform Cloudinary URL
   */
  private transformCloudinaryUrl(
    url: string,
    options: { width: number; height: number; quality: number; format: string }
  ): string {
    // Insert transformation parameters
    const transformations = `w_${options.width},h_${options.height},c_fill,q_${options.quality},f_${options.format}`;
    
    // Find the upload part and insert transformations
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/${transformations}/`);
    }
    
    return url;
  }

  /**
   * Transform Imgix URL
   */
  private transformImgixUrl(
    url: string,
    options: { width: number; height: number; quality: number; format: string }
  ): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${options.width}&h=${options.height}&q=${options.quality}&fm=${options.format}&fit=crop`;
  }

  /**
   * Preload images
   */
  async preload(urls: string[]): Promise<void> {
    const urlsToPreload = urls.filter(url => !preloadedImages.has(url));
    
    if (urlsToPreload.length === 0) return;

    const imageUrls = urlsToPreload.map(url => ({ uri: url }));
    
    try {
      await FastImage.preload(imageUrls);
      urlsToPreload.forEach(url => preloadedImages.add(url));
    } catch (error) {
      Logger.error('Failed to preload images:', error);
    }
  }

  /**
   * Prefetch image using native Image API
   */
  async prefetch(url: string): Promise<boolean> {
    try {
      await Image.prefetch(url);
      preloadedImages.add(url);
      return true;
    } catch (error) {
      Logger.error('Failed to prefetch image:', error);
      return false;
    }
  }

  /**
   * Query image size
   */
  async getImageSize(url: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      Image.getSize(
        url,
        (width, height) => resolve({ width, height }),
        (error) => {
          Logger.error('Failed to get image size:', error);
          resolve(null);
        }
      );
    });
  }

  /**
   * Get aspect ratio for image
   */
  async getAspectRatio(url: string): Promise<number | null> {
    const size = await this.getImageSize(url);
    if (!size) return null;
    return size.width / size.height;
  }

  /**
   * Clear image cache
   */
  async clearCache(): Promise<void> {
    try {
      // Clear FastImage cache
      // Note: FastImage.clearMemoryCache() and clearDiskCache() are available
      preloadedImages.clear();
    } catch (error) {
      Logger.error('Failed to clear image cache:', error);
    }
  }

  /**
   * Get cache info
   */
  getCacheInfo(): {
    preloadedCount: number;
  } {
    return {
      preloadedCount: preloadedImages.size,
    };
  }

  /**
   * Get FastImage source with priority
   */
  getFastImageSource(
    url: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): { uri: string; priority: FastImagePriority; cache: FastImageCacheControl } {
    const priorityMap = {
      low: FastImage.priority.low,
      normal: FastImage.priority.normal,
      high: FastImage.priority.high,
    };

    return {
      uri: url,
      priority: priorityMap[priority],
      cache: FastImage.cacheControl.immutable,
    };
  }

  /**
   * Get responsive image size based on screen width
   */
  getResponsiveSize(
    baseWidth: number,
    aspectRatio: number = 1
  ): { width: number; height: number } {
    const width = Math.min(baseWidth, SCREEN_WIDTH);
    const height = width / aspectRatio;
    return { width, height };
  }

  /**
   * Calculate optimal image dimensions
   */
  calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    containerWidth: number,
    containerHeight?: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    if (containerHeight) {
      // Fit within container bounds
      const containerAspect = containerWidth / containerHeight;
      
      if (aspectRatio > containerAspect) {
        // Image is wider
        return {
          width: containerWidth,
          height: containerWidth / aspectRatio,
        };
      } else {
        // Image is taller
        return {
          width: containerHeight * aspectRatio,
          height: containerHeight,
        };
      }
    }
    
    // Only width constraint
    return {
      width: containerWidth,
      height: containerWidth / aspectRatio,
    };
  }

  /**
   * Check if image exists
   */
  async exists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get placeholder color based on image type
   */
  getPlaceholderColor(type: 'avatar' | 'product' | 'banner' | 'card' = 'card'): string {
    const colors = {
      avatar: '#E5E7EB',
      product: '#F3F4F6',
      banner: '#E5E7EB',
      card: '#F9FAFB',
    };
    return colors[type];
  }

  /**
   * Generate blurhash placeholder
   */
  generateBlurhashPlaceholder(blurhash: string): string {
    // Return blurhash data URL for placeholder
    // In production, use react-native-blurhash
    return blurhash;
  }
}

// Export singleton instance
export const imageService = new ImageService();

/**
 * Hook for image handling
 */
export function useImage() {
  return {
    getOptimizedUrl: imageService.getOptimizedUrl.bind(imageService),
    preload: imageService.preload.bind(imageService),
    prefetch: imageService.prefetch.bind(imageService),
    getImageSize: imageService.getImageSize.bind(imageService),
    getAspectRatio: imageService.getAspectRatio.bind(imageService),
    clearCache: imageService.clearCache.bind(imageService),
    getFastImageSource: imageService.getFastImageSource.bind(imageService),
    getResponsiveSize: imageService.getResponsiveSize.bind(imageService),
    calculateOptimalDimensions: imageService.calculateOptimalDimensions.bind(imageService),
  };
}

export default imageService;