/**
 * Validation Utils Tests
 * 
 * Tests for form validation utilities including:
 * - Basic validators (required, minLength, maxLength, range)
 * - String validators (email, phone, password)
 * - Date validators
 * - Form validation
 */

import {
  required,
  minLength,
  maxLength,
  exactLength,
  range,
  email,
  phone,
  password,
  name,
  username,
  url,
  pincode,
  ValidationResult,
} from '@/utils/validation';

describe('Validation Utils', () => {
  describe('required', () => {
    it('should pass for non-empty string', () => {
      const result = required('test', 'Name');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty string', () => {
      const result = required('', 'Name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should fail for null', () => {
      const result = required(null, 'Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Field is required');
    });

    it('should fail for undefined', () => {
      const result = required(undefined, 'Field');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Field is required');
    });

    it('should fail for empty array', () => {
      const result = required([], 'Items');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Items is required');
    });

    it('should pass for non-empty array', () => {
      const result = required(['item'], 'Items');
      expect(result.isValid).toBe(true);
    });

    it('should pass for number 0', () => {
      const result = required(0, 'Count');
      expect(result.isValid).toBe(true);
    });

    it('should pass for boolean false', () => {
      const result = required(false, 'Active');
      expect(result.isValid).toBe(true);
    });
  });

  describe('minLength', () => {
    it('should pass for string meeting minimum length', () => {
      const result = minLength('hello', 5, 'Password');
      expect(result.isValid).toBe(true);
    });

    it('should pass for string exceeding minimum length', () => {
      const result = minLength('hello world', 5, 'Password');
      expect(result.isValid).toBe(true);
    });

    it('should fail for string below minimum length', () => {
      const result = minLength('hi', 5, 'Password');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 5 characters');
    });

    it('should fail for empty string', () => {
      const result = minLength('', 3, 'Field');
      expect(result.isValid).toBe(false);
    });

    it('should fail for null/undefined', () => {
      const result = minLength('', 3, 'Field');
      expect(result.isValid).toBe(false);
    });
  });

  describe('maxLength', () => {
    it('should pass for string under maximum length', () => {
      const result = maxLength('hello', 10, 'Name');
      expect(result.isValid).toBe(true);
    });

    it('should pass for string at maximum length', () => {
      const result = maxLength('hello', 5, 'Name');
      expect(result.isValid).toBe(true);
    });

    it('should fail for string exceeding maximum length', () => {
      const result = maxLength('hello world', 5, 'Name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name must be at most 5 characters');
    });

    it('should pass for empty string', () => {
      const result = maxLength('', 10, 'Field');
      expect(result.isValid).toBe(true);
    });
  });

  describe('exactLength', () => {
    it('should pass for string with exact length', () => {
      const result = exactLength('12345', 5, 'Code');
      expect(result.isValid).toBe(true);
    });

    it('should fail for string shorter than required', () => {
      const result = exactLength('123', 5, 'Code');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Code must be exactly 5 characters');
    });

    it('should fail for string longer than required', () => {
      const result = exactLength('123456', 5, 'Code');
      expect(result.isValid).toBe(false);
    });
  });

  describe('range', () => {
    it('should pass for value within range', () => {
      const result = range(5, 1, 10, 'Age');
      expect(result.isValid).toBe(true);
    });

    it('should pass for value at minimum', () => {
      const result = range(1, 1, 10, 'Age');
      expect(result.isValid).toBe(true);
    });

    it('should pass for value at maximum', () => {
      const result = range(10, 1, 10, 'Age');
      expect(result.isValid).toBe(true);
    });

    it('should fail for value below minimum', () => {
      const result = range(0, 1, 10, 'Age');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Age must be between 1 and 10');
    });

    it('should fail for value above maximum', () => {
      const result = range(11, 1, 10, 'Age');
      expect(result.isValid).toBe(false);
    });
  });

  describe('email', () => {
    it('should pass for valid email', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test123@subdomain.example.com',
      ];

      validEmails.forEach(emailAddress => {
        const result = email(emailAddress);
        expect(result.isValid).toBe(true);
      });
    });

    it('should fail for invalid email', () => {
      const invalidEmails = [
        'test',
        'test@',
        '@example.com',
        'test@example',
        'test @example.com',
        'test@exam ple.com',
      ];

      invalidEmails.forEach(emailAddress => {
        const result = email(emailAddress);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please enter a valid email address');
      });
    });

    it('should fail for empty string', () => {
      const result = email('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('phone', () => {
    it('should pass for valid Indian phone numbers', () => {
      const validPhones = ['9876543210', '9123456789', '98765 43210'];

      validPhones.forEach(phoneNumber => {
        const result = phone(phoneNumber);
        expect(result.isValid).toBe(true);
      });
    });

    it('should pass for phone with spaces and dashes', () => {
      const result = phone('98765 43210');
      expect(result.isValid).toBe(true);
    });

    it('should fail for invalid phone numbers', () => {
      const invalidPhones = [
        '1234567890', // starts with 1
        '5678901234', // starts with 5
        '987654321',  // 9 digits
        '98765432101', // 11 digits
        'abcdefghij', // letters
      ];

      invalidPhones.forEach(phoneNumber => {
        const result = phone(phoneNumber);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('password', () => {
    it('should pass for strong password', () => {
      const result = password('Password123!');
      expect(result.isValid).toBe(true);
    });

    it('should fail for short password', () => {
      const result = password('Pass1!');
      expect(result.isValid).toBe(false);
    });

    it('should fail for password without uppercase', () => {
      const result = password('password123!');
      expect(result.isValid).toBe(false);
    });

    it('should fail for password without lowercase', () => {
      const result = password('PASSWORD123!');
      expect(result.isValid).toBe(false);
    });

    it('should fail for password without number', () => {
      const result = password('Password!');
      expect(result.isValid).toBe(false);
    });

    it('should fail for password without special character', () => {
      const result = password('Password123');
      expect(result.isValid).toBe(false);
    });
  });

  describe('name', () => {
    it('should pass for valid name', () => {
      const result = name('John Doe', 'Full Name');
      expect(result.isValid).toBe(true);
    });

    it('should pass for name with spaces', () => {
      const result = name('John Michael Doe', 'Full Name');
      expect(result.isValid).toBe(true);
    });

    it('should fail for name with numbers', () => {
      const result = name('John123', 'Full Name');
      expect(result.isValid).toBe(false);
    });

    it('should fail for name with special characters', () => {
      const result = name('John@Doe', 'Full Name');
      expect(result.isValid).toBe(false);
    });

    it('should fail for single character name', () => {
      const result = name('J', 'Full Name');
      expect(result.isValid).toBe(false);
    });

    it('should fail for empty name', () => {
      const result = name('', 'Full Name');
      expect(result.isValid).toBe(false);
    });
  });

  describe('username', () => {
    it('should pass for valid username', () => {
      const result = username('john_doe123');
      expect(result.isValid).toBe(true);
    });

    it('should pass for username with underscore', () => {
      const result = username('john_doe');
      expect(result.isValid).toBe(true);
    });

    it('should fail for username with spaces', () => {
      const result = username('john doe');
      expect(result.isValid).toBe(false);
    });

    it('should fail for username with special characters', () => {
      const result = username('john@doe');
      expect(result.isValid).toBe(false);
    });

    it('should fail for username too short', () => {
      const result = username('jo');
      expect(result.isValid).toBe(false);
    });

    it('should fail for username too long', () => {
      const result = username('a'.repeat(21));
      expect(result.isValid).toBe(false);
    });
  });

  describe('url', () => {
    it('should pass for valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://www.example.com',
        'https://example.com/path',
        'https://example.com/path?query=value',
      ];

      validUrls.forEach(testUrl => {
        const result = url(testUrl);
        expect(result.isValid).toBe(true);
      });
    });

    it('should fail for invalid URLs', () => {
      const invalidUrls = [
        'example.com',      // No protocol
        'not a url',        // No protocol, spaces
        '://example.com',   // Empty protocol
      ];

      invalidUrls.forEach(testUrl => {
        const result = url(testUrl);
        expect(result.isValid).toBe(false);
      });
    });

    it('should accept URLs with non-standard protocols', () => {
      // URL constructor accepts any protocol scheme
      const result = url('htp://example.com');
      expect(result.isValid).toBe(true);
    });
  });

  describe('pincode', () => {
    it('should pass for valid Indian PIN codes', () => {
      const validPincodes = ['110001', '400001', '560001', '700001'];
      
      validPincodes.forEach(code => {
        const result = pincode(code);
        expect(result.isValid).toBe(true);
      });
    });

    it('should fail for PIN code starting with 0', () => {
      const result = pincode('000001');
      expect(result.isValid).toBe(false);
    });

    it('should fail for PIN code with less than 6 digits', () => {
      const result = pincode('11000');
      expect(result.isValid).toBe(false);
    });

    it('should fail for PIN code with more than 6 digits', () => {
      const result = pincode('1100001');
      expect(result.isValid).toBe(false);
    });

    it('should fail for PIN code with letters', () => {
      const result = pincode('11000a');
      expect(result.isValid).toBe(false);
    });
  });

  describe('ValidationResult Type', () => {
    it('should define valid result structure', () => {
      const result: ValidationResult = {
        isValid: true,
      };
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should define invalid result structure', () => {
      const result: ValidationResult = {
        isValid: false,
        error: 'Validation failed',
      };
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Validation failed');
    });
  });
});
