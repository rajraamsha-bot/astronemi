/**
 * Input Validation and Sanitization Utilities
 * 
 * Provides functions to sanitize user inputs and validate data
 * to prevent XSS, injection attacks, and other security issues
 */

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Strip HTML tags from string to prevent XSS
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize string for safe display - removes dangerous HTML/JS
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  let sanitized = input;
  
  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs
  sanitized = sanitized.replace(/data:/gi, '');
  
  // Remove HTML entities that could be used for injection
  sanitized = sanitized.replace(/<script/gi, '<!--script');
  sanitized = sanitized.replace(/<\/script/gi, '<!--/script');
  
  return sanitized.trim();
}

/**
 * Sanitize HTML content - allows safe HTML tags only
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // List of allowed tags
  const allowedTags = ['p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  
  let sanitized = input;
  
  // Remove script tags completely
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  
  // Only keep allowed tags
  const tagPattern = new RegExp(`<(?!\/?(?:${allowedTags.join('|')})\\b)[^>]*>`, 'gi');
  sanitized = sanitized.replace(tagPattern, '');
  
  return sanitized.trim();
}

/**
 * Sanitize for database storage
 */
export function sanitizeForDatabase(input: string): string {
  if (!input) return '';
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  
  return sanitized;
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(input: string): string {
  if (!input) return '';
  
  // Remove special regex characters
  let sanitized = input.replace(/[.*+?^${}()|[\]\\]/g, '');
  
  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 200);
  
  return sanitized;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (India format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Indian mobile: 10 digits, starts with 6-9
  const indianPhoneRegex = /^[6-9]\d{9}$/;
  return indianPhoneRegex.test(phone);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate OTP (6 digit number)
 */
export function isValidOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Validate referral code
 */
export function isValidReferralCode(code: string): boolean {
  // Alphanumeric, 6-12 characters
  return /^[A-Z0-9]{6,12}$/i.test(code);
}

/**
 * Validate PIN code (Indian postal code)
 */
export function pincode(code: string): { isValid: boolean; error?: string } {
  // PIN code must be exactly 6 digits and not start with 0
  if (!/^\d{6}$/.test(code)) {
    return { isValid: false, error: 'PIN code must be exactly 6 digits' };
  }

  if (code.startsWith('0')) {
    return { isValid: false, error: 'PIN code cannot start with 0' };
  }

  return { isValid: true };
}

/**
 * Validate PAN card number (Indian Permanent Account Number)
 */
export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

/**
 * Validate Aadhar card number (Indian Unique Identification Number)
 */
export function isValidAadhar(aadhar: string): boolean {
  return /^\d{12}$/.test(aadhar);
}

/**
 * Required field validation
 */
export function required(value: unknown, fieldName: string): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  if (Array.isArray(value) && value.length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

/**
 * Minimum length validation
 */
export function minLength(value: string, min: number, fieldName: string): { isValid: boolean; error?: string } {
  if (!value || value.length < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  return { isValid: true };
}

/**
 * Maximum length validation
 */
export function maxLength(value: string, max: number, fieldName: string): { isValid: boolean; error?: string } {
  if (value && value.length > max) {
    return { isValid: false, error: `${fieldName} must be at most ${max} characters` };
  }
  return { isValid: true };
}

/**
 * Exact length validation
 */
export function exactLength(value: string, length: number, fieldName: string): { isValid: boolean; error?: string } {
  if (!value || value.length !== length) {
    return { isValid: false, error: `${fieldName} must be exactly ${length} characters` };
  }
  return { isValid: true };
}

/**
 * Range validation for numbers
 */
export function range(value: number, min: number, max: number, fieldName: string): { isValid: boolean; error?: string } {
  if (value < min || value > max) {
    return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  return { isValid: true };
}

/**
 * Email validation
 */
export function email(value: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
}

/**
 * Phone validation (India format)
 */
export function phone(value: string): { isValid: boolean; error?: string } {
  // Allow spaces, dashes, and parentheses
  const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
  if (cleanPhone.length !== 10) {
    return { isValid: false, error: 'Please enter a valid 10-digit mobile number' };
  }
  if (!/^[6-9]/.test(cleanPhone)) {
    return { isValid: false, error: 'Please enter a valid 10-digit mobile number' };
  }
  // Additional check: must be all digits
  if (!/^\d+$/.test(cleanPhone)) {
    return { isValid: false, error: 'Please enter a valid 10-digit mobile number' };
  }
  return { isValid: true };
}

/**
 * Password validation
 */
export function password(value: string): { isValid: boolean; error?: string } {
  if (value.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(value)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(value)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/\d/.test(value)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }
  return { isValid: true };
}

/**
 * Name validation
 */
export function name(value: string, fieldName: string): { isValid: boolean; error?: string } {
  if (!value || value.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` };
  }
  if (!/^[a-zA-Z\s]+$/.test(value)) {
    return { isValid: false, error: `${fieldName} can only contain letters and spaces` };
  }
  return { isValid: true };
}

/**
 * Username validation
 */
export function username(value: string): { isValid: boolean; error?: string } {
  if (!value || value.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  if (value.length > 20) {
    return { isValid: false, error: 'Username must be at most 20 characters long' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  return { isValid: true };
}

/**
 * URL validation
 */
export function url(value: string): { isValid: boolean; error?: string } {
  try {
    new URL(value);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  }
  return phone;
}

/**
 * Mask phone number for privacy
 */
export function maskPhoneNumber(phone: string): string {
  if (phone.length >= 10) {
    return `******${phone.slice(-4)}`;
  }
  return '****';
}

/**
 * Mask email for privacy
 */
export function maskEmail(email: string): string {
  const [userPart, domain] = email.split('@');
  if (!domain || !userPart) return '****';
  
  const visibleChars = Math.min(3, Math.floor(userPart.length / 2));
  const masked = userPart.slice(0, visibleChars) + '***';
  return `${masked}@${domain}`;
}

// ============================================
// SANITIZE USER INPUT - MAIN FUNCTION
// ============================================

export interface SanitizeOptions {
  stripHtml?: boolean;
  trim?: boolean;
  maxLength?: number;
  allowEmpty?: boolean;
}

const defaultOptions: SanitizeOptions = {
  stripHtml: true,
  trim: true,
  maxLength: 1000,
  allowEmpty: false,
};

/**
 * Main sanitization function with options
 */
export function sanitizeInput(input: string, options: SanitizeOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  
  if (!input) {
    return opts.allowEmpty ? '' : '';
  }
  
  let sanitized = input;
  
  // Strip HTML if enabled
  if (opts.stripHtml) {
    sanitized = stripHtml(sanitized);
  }
  
  // Trim if enabled
  if (opts.trim) {
    sanitized = sanitized.trim();
  }
  
  // Check max length
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }
  
  // Check empty
  if (!opts.allowEmpty && !sanitized) {
    return '';
  }
  
  return sanitized;
}

/**
 * Validate and sanitize user profile update
 */
export function sanitizeProfileUpdate(updates: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  // Define allowed fields and their sanitization rules
  const fieldRules: Record<string, (value: unknown) => unknown> = {
    name: (v) => sanitizeInput(String(v), { maxLength: 100 }),
    email: (v) => {
      const email = sanitizeInput(String(v), { maxLength: 255 });
      return isValidEmail(email) ? email : null;
    },
    avatarUrl: (v) => {
      const url = String(v);
      return isValidUrl(url) ? url : null;
    },
    birthPlace: (v) => sanitizeInput(String(v), { maxLength: 200 }),
    language: (v) => {
      const lang = String(v);
      return ['en', 'hi', 'ta', 'te', 'kn'].includes(lang) ? lang : null;
    },
    notificationsEnabled: (v) => Boolean(v),
  };
  
  for (const [field, rule] of Object.entries(fieldRules)) {
    if (updates[field] !== undefined) {
      const result = rule(updates[field]);
      if (result !== null) {
        sanitized[field] = result;
      }
    }
  }
  
  return sanitized;
}

/**
 * Validate and sanitize consultation data
 */
export function sanitizeConsultationData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  const fieldRules: Record<string, (value: unknown) => unknown> = {
    type: (v) => ['chat', 'call', 'video'].includes(String(v)) ? String(v) : null,
    question: (v) => sanitizeInput(String(v), { maxLength: 2000 }),
    notes: (v) => sanitizeInput(String(v), { maxLength: 1000 }),
  };
  
  for (const [field, rule] of Object.entries(fieldRules)) {
    if (data[field] !== undefined) {
      const result = rule(data[field]);
      if (result !== null) {
        sanitized[field] = result;
      }
    }
  }
  
  return sanitized;
}

/**
 * Validate and sanitize review data
 */
export function sanitizeReviewData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  const fieldRules: Record<string, (value: unknown) => unknown> = {
    rating: (v) => {
      const num = Number(v);
      return (num >= 1 && num <= 5) ? num : null;
    },
    comment: (v) => sanitizeInput(String(v), { maxLength: 1000 }),
  };
  
  for (const [field, rule] of Object.entries(fieldRules)) {
    if (data[field] !== undefined) {
      const result = rule(data[field]);
      if (result !== null) {
        sanitized[field] = result;
      }
    }
  }
  
  return sanitized;
}
