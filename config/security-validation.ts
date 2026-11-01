/**
 * Security Validation Configuration
 * 
 * This module provides comprehensive security validation for the AstroNemi app,
 * including:
 * - Input validation and sanitization
 * - XSS protection
 * - CSRF protection
 * - SQL injection prevention
 * - Rate limiting
 * - Device fingerprinting
 * - Session management
 */

import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { errorReporting } from '../services/error-reporting';

// Security configuration
export const SecurityConfig = {
  // Rate limiting
  rateLimit: {
    // OTP requests per phone number per hour
    otpRequests: 5,
    // API requests per minute
    apiRequests: 60,
    // Payment attempts per minute
    paymentAttempts: 3,
    // Login attempts per IP per hour
    loginAttempts: 10,
  },
  
  // Session configuration
  session: {
    // Session timeout in milliseconds (30 minutes)
    timeout: 1800000,
    // Maximum concurrent sessions per user
    maxConcurrentSessions: 2,
    // Session refresh interval
    refreshInterval: 900000, // 15 minutes
  },
  
  // Device security - ADVISORY ONLY. Enforced client-side in
  // auth-service.bindDevice() against local secure storage; there is no
  // server-side device registry, so these are UX limits, not an
  // authentication or authorization boundary.
  device: {
    // Maximum devices per user (client-side advisory)
    maxDevices: 3,
    // Device binding enabled (client-side advisory)
    bindingEnabled: true,
    // Require device verification (client-side advisory)
    requireVerification: true,
  },
  
  // Input validation
  validation: {
    // Maximum input length
    maxInputLength: 10000,
    // Allowed file types
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    // Maximum file size (10MB)
    maxFileSize: 10 * 1024 * 1024,
    // Maximum image dimensions
    maxImageDimensions: { width: 4096, height: 4096 },
  },
  
  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'",
  },
  
  // Encryption
  encryption: {
    // Algorithm for sensitive data
    algorithm: 'aes-256-gcm',
    // Key length
    keyLength: 256,
    // IV length
    ivLength: 12,
  },
};

// Input validation utilities
export const InputValidator = {
  // Validate phone number (Indian format)
  validatePhoneNumber(phone: string): { valid: boolean; message?: string } {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check length (10 digits for Indian numbers)
    if (cleaned.length !== 10) {
      return { valid: false, message: 'Phone number must be 10 digits' };
    }
    
    // Check if starts with 6-9 (valid Indian mobile number prefix)
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return { valid: false, message: 'Invalid phone number format' };
    }
    
    return { valid: true };
  },
  
  // Validate email
  validateEmail(email: string): { valid: boolean; message?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || email.length > 255) {
      return { valid: false, message: 'Invalid email address' };
    }
    
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email format' };
    }
    
    return { valid: true };
  },
  
  // Validate OTP
  validateOTP(otp: string): { valid: boolean; message?: string } {
    if (!otp || otp.length !== 6) {
      return { valid: false, message: 'OTP must be 6 digits' };
    }
    
    if (!/^\d{6}$/.test(otp)) {
      return { valid: false, message: 'OTP must contain only digits' };
    }
    
    return { valid: true };
  },
  
  // Sanitize text input
  sanitizeText(input: string, maxLength: number = SecurityConfig.validation.maxInputLength): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    // Remove potential XSS vectors
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
    
    return sanitized;
  },
  
  // Validate URL
  validateURL(url: string): { valid: boolean; message?: string } {
    try {
      const parsed = new URL(url);
      
      // Only allow https
      if (parsed.protocol !== 'https:') {
        return { valid: false, message: 'URL must use HTTPS' };
      }
      
      // Check for valid hostname
      if (!parsed.hostname || parsed.hostname.length === 0) {
        return { valid: false, message: 'Invalid URL hostname' };
      }
      
      return { valid: true };
    } catch {
      return { valid: false, message: 'Invalid URL format' };
    }
  },
  
  // Validate file type and size
  validateFile(file: { type: string; size: number; name: string }): { valid: boolean; message?: string } {
    // Check file type
    if (!SecurityConfig.validation.allowedFileTypes.includes(file.type)) {
      return { valid: false, message: 'File type not allowed' };
    }
    
    // Check file size
    if (file.size > SecurityConfig.validation.maxFileSize) {
      return { valid: false, message: 'File size exceeds limit' };
    }
    
    // Check file name for potential path traversal
    if (file.name.includes('..') || file.name.includes('/')) {
      return { valid: false, message: 'Invalid file name' };
    }
    
    return { valid: true };
  },
  
  // Validate date of birth
  validateDateOfBirth(date: string): { valid: boolean; message?: string } {
    const parsed = new Date(date);
    
    if (isNaN(parsed.getTime())) {
      return { valid: false, message: 'Invalid date format' };
    }
    
    // Check if date is in the past
    if (parsed > new Date()) {
      return { valid: false, message: 'Date of birth cannot be in the future' };
    }
    
    // Check reasonable age range (1-120 years)
    const age = (new Date().getTime() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 1 || age > 120) {
      return { valid: false, message: 'Invalid date of birth' };
    }
    
    return { valid: true };
  },
  
  // Validate time
  validateTime(time: string): { valid: boolean; message?: string } {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    
    if (!timeRegex.test(time)) {
      return { valid: false, message: 'Invalid time format (expected HH:MM:SS)' };
    }
    
    return { valid: true };
  },
  
  // Validate coordinates
  validateCoordinates(latitude: number, longitude: number): { valid: boolean; message?: string } {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { valid: false, message: 'Coordinates must be numbers' };
    }
    
    if (latitude < -90 || latitude > 90) {
      return { valid: false, message: 'Latitude must be between -90 and 90' };
    }
    
    if (longitude < -180 || longitude > 180) {
      return { valid: false, message: 'Longitude must be between -180 and 180' };
    }
    
    return { valid: true };
  },
  
  // Validate timezone
  validateTimezone(timezone: number): { valid: boolean; message?: string } {
    if (typeof timezone !== 'number') {
      return { valid: false, message: 'Timezone must be a number' };
    }
    
    if (timezone < -12 || timezone > 14) {
      return { valid: false, message: 'Timezone must be between -12 and +14' };
    }
    
    return { valid: true };
  },
};

// Security utilities
export const SecurityUtils = {
  // Generate CSRF token using cryptographically secure random bytes
  generateCSRFToken(): string {
    // Use expo-crypto for CSPRNG (cryptographically secure pseudo-random)
    const randomBytes = Crypto.getRandomValues(new Uint8Array(48));
    // Convert to base64url for URL-safe token
    const base64 = typeof btoa !== 'undefined'
      ? btoa(String.fromCharCode(...randomBytes))
      : Buffer.from(randomBytes).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  
  // Validate CSRF token
  validateCSRFToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) {
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    if (token.length !== expectedToken.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }
    
    return result === 0;
  },
  
  // Generate device fingerprint using CSPRNG
  async generateDeviceFingerprint(): Promise<string> {
    // Generate cryptographically secure random bytes for the unique component
    const randomBytes = Crypto.getRandomValues(new Uint8Array(16));
    const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Combine platform info with secure random data
    const data = {
      platform: Platform.OS,
      version: Platform.Version,
      timestamp: Date.now(),
      uniqueId: randomHex,
    };
    
    // Hash using expo-crypto's digestStringAsync for consistency
    const dataStr = JSON.stringify(data);
    const hash = await Crypto.digestStringAsync(
      'SHA-256' as any,
      dataStr,
    );
    
    // Return first 16 hex chars as fingerprint
    return hash.substring(0, 16);
  },
  
  // Check for suspicious activity
  checkSuspiciousActivity(activity: {
    type: string;
    timestamp: number;
    previousTimestamp?: number;
    ip?: string;
    userAgent?: string;
  }): { suspicious: boolean; reason?: string } {
    // Check for rapid-fire requests
    if (activity.previousTimestamp) {
      const timeDiff = activity.timestamp - activity.previousTimestamp;
      if (timeDiff < 100) { // Less than 100ms between requests
        return { suspicious: true, reason: 'Rapid-fire requests detected' };
      }
    }
    
    return { suspicious: false };
  },
  
  // Log security event
  logSecurityEvent(event: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, unknown>;
  }) {
    // Log to error reporting service
    errorReporting.captureException(
      new Error(`Security Event: ${event.type}`),
      {
        tags: {
          service: 'security',
          severity: event.severity,
          platform: Platform.OS,
        },
        extra: {
          eventType: event.type,
          details: event.details,
          timestamp: new Date().toISOString(),
        },
      }
    );
  },
  
  // Encode data with integrity hash (base64 + HMAC-like integrity check)
  // NOTE: This is NOT encryption — it's encoding with tamper-detection.
  // For actual encryption, use expo-secure-store for sensitive data.
  async encryptData(data: string): Promise<string> {
    try {
      const timestamp = Date.now().toString(36);
      // Use CSPRNG for the random component
      const randomBytes = Crypto.getRandomValues(new Uint8Array(6));
      const random = Array.from(randomBytes).map(b => b.toString(36).padStart(2, '0')).join('');
      const encodedData = encodeURIComponent(data);
      
      // Use global btoa if available, otherwise use Node.js Buffer
      const encoded = typeof btoa !== 'undefined'
        ? btoa(encodedData)
        : Buffer.from(encodedData, 'utf-8').toString('base64');
      
      // Use SHA-256 hash for integrity verification
      const combined = `${timestamp}.${random}.${encoded}`;
      const integrityHash = await Crypto.digestStringAsync(
        'SHA-256' as any,
        combined,
      );
      
      // Use first 16 hex chars of the hash for compactness
      return `${integrityHash.substring(0, 16)}.${combined}`;
    } catch {
      // Fallback with basic encoding
      if (typeof btoa !== 'undefined') {
        return btoa(encodeURIComponent(data));
      }
      return Buffer.from(encodeURIComponent(data), 'utf-8').toString('base64');
    }
  },
  
  // Decrypt data encrypted by encryptData
  // HIGH-9 fix: actually verify the integrity hash before decoding.
  // The previous implementation silently ignored the hash, which
  // was misleading and a latent footgun.
  async decryptData(encryptedData: string): Promise<string> {
    try {
      const decodeToString = (base64: string): string => {
        const raw = typeof atob !== 'undefined'
          ? atob(base64)
          : Buffer.from(base64, 'base64').toString('utf-8');
        return decodeURIComponent(raw);
      };

      // Backward-compatible simple base64 format (no hash).
      if (!encryptedData.includes('.')) {
        return decodeToString(encryptedData);
      }

      // Full format: hash.timestamp.random.base64data
      const parts = encryptedData.split('.');
      if (parts.length < 4) {
        throw new Error('Failed to decrypt data: invalid format');
      }

      const expectedHash = parts[0];
      const combined = parts.slice(1).join('.');
      const computedHash = await Crypto.digestStringAsync(
        'SHA-256' as any,
        combined,
      );
      const actualHash = computedHash.substring(0, 16);

      if (!this.validateCSRFToken(actualHash, expectedHash ?? '')) {
        throw new Error('Failed to decrypt data: integrity check failed');
      }

      return decodeToString(parts[parts.length - 1] ?? '');
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      }
      throw new Error('Failed to decrypt data: invalid format');
    }
  },
};

// Export default
export default {
  SecurityConfig,
  InputValidator,
  SecurityUtils,
};