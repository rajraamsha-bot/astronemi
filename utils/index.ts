/**
 * Utils Index
 * 
 * Central export for all utility functions
 */

// Validation utilities
export {
  // Basic validators
  required,
  minLength,
  maxLength,
  exactLength,
  range,
  
  // String validators
  email,
  phone,
  password,
  name,
  username,
  url,
  pincode,

  // Sanitization
  sanitizeInput,
  sanitizeString,
  sanitizeHtml,
  sanitizeForDatabase,
  sanitizeSearchQuery,
  sanitizeProfileUpdate,
  sanitizeConsultationData,
  sanitizeReviewData,
  stripHtml,

  // Validation helpers
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl,
  isValidOTP,
  isValidReferralCode,
  isValidPAN,
  isValidAadhar,

  // Formatting
  formatPhoneNumber,
  maskPhoneNumber,
  maskEmail,
} from './validation';

// Re-export validation types
export type { SanitizeOptions } from './validation';

// Hindu calendar engine
export {
  computePanchang,
  getMuhurat,
  computeFestivalsForYear,
  computeMuhurtas,
  isAuspicious,
  getSunriseSunset,
  gregorianToJD,
  sunLongitude,
  moonLongitude,
  norm360,
  NAKSHATRA_NAMES,
  RASHI_NAMES,
} from './hindu-calendar-engine';

export type {
  PanchangData,
  FestivalData,
  MuhurtaTimings,
  PanchangDay,
} from './hindu-calendar-engine';
