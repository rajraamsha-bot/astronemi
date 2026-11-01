/**
 * Security Configuration for AstroNemi App
 * 
 * Client-side security utilities:
 * - Input validation and sanitization
 * - Security header definitions (for reference / web fallback)
 * - Rate limiting configuration (client-side enforcement)
 * 
 * NOTE: Express/Node.js middleware has been moved to the backend server.
 * This file contains ONLY React Native-compatible utilities.
 */

// Security headers configuration (for web fallback / reference)
export const securityHeadersConfig = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Rate limiting configuration
export const rateLimitConfig = {
  api: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
    blockDuration: 30 * 60 * 1000,
  },
  endpoints: {
    login: { windowMs: 15 * 60 * 1000, max: 5 },
    registration: { windowMs: 60 * 60 * 1000, max: 3 },
    passwordReset: { windowMs: 60 * 60 * 1000, max: 3 },
  }
};

// Input validation patterns
export const validationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  phoneNumber: /^[0-9]{10,15}$/,
  dateOfBirth: /^\d{4}-\d{2}-\d{2}$/,
  amount: /^\d+(\.\d{1,2})?$/,
  otp: /^\d{6}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
};

// Input sanitization functions
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();
  
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
};

// Input validation functions
export const validateInput = {
  email: (email: string): boolean => {
    return validationPatterns.email.test(email);
  },
  
  phone: (phone: string): boolean => {
    return validationPatterns.phone.test(phone);
  },
  
  password: (password: string): boolean => {
    return validationPatterns.password.test(password);
  },
  
  name: (name: string): boolean => {
    return validationPatterns.name.test(name);
  },
  
  sanitizeAndValidate: (input: string, type: keyof typeof validationPatterns): string => {
    const sanitized = sanitizeInput(input);
    const pattern = validationPatterns[type];
    
    if (!pattern) {
      throw new Error(`Invalid validation type: ${type}`);
    }
    
    if (!pattern.test(sanitized)) {
      throw new Error(`Invalid ${type} format`);
    }
    
    return sanitized;
  }
};

// CORS configuration for web fallback
export const corsOptions = {
  origin: [
    'https://astronemi.app',
    'https://www.astronemi.app',
    'https://api.astronemi.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

export default {
  securityHeadersConfig,
  rateLimitConfig,
  validationPatterns,
  sanitizeInput,
  validateInput,
  corsOptions,
};
