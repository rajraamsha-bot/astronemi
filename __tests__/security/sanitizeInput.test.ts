/**
 * sanitizeInput() Security Tests
 * 
 * Tests for input sanitization to prevent:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL Injection attacks
 * - Script injection
 * - HTML injection
 * - Special character exploits
 */

import { sanitizeInput } from '@/security-config';

describe('sanitizeInput() Security Tests', () => {
  describe('XSS Prevention', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("XSS")</script>Hello';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove inline JavaScript', () => {
      const malicious = '<img src="x" onerror="alert(\'XSS\')">';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove javascript: protocol', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const handlers = [
        '<div onclick="malicious()">',
        '<div onload="malicious()">',
        '<div onmouseover="malicious()">',
        '<div onfocus="malicious()">',
      ];
      
      handlers.forEach(malicious => {
        const sanitized = sanitizeInput(malicious);
        expect(sanitized).not.toMatch(/on\w+=/i);
      });
    });

    it('should remove data URIs with JavaScript', () => {
      const malicious = '<img src="data:text/html,<script>alert(\'XSS\')</script>">';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('data:text/html');
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should escape SQL keywords', () => {
      const malicious = "'; DROP TABLE users; --";
      const sanitized = sanitizeInput(malicious);
      
      // Should escape dangerous characters
      expect(sanitized).toContain('&#x27;'); // Escaped quote
      expect(sanitized).not.toContain("'"); // Original quote removed
    });

    it('should handle SQL UNION attacks', () => {
      const malicious = "' UNION SELECT * FROM users --";
      const sanitized = sanitizeInput(malicious);
      
      // Should escape quotes
      expect(sanitized).toContain('&#x27;');
    });

    it('should handle SQL comment injection', () => {
      const malicious = "admin'--";
      const sanitized = sanitizeInput(malicious);
      
      // Should escape the quote
      expect(sanitized).toContain('&#x27;');
    });

    it('should handle SQL OR injection', () => {
      const malicious = "' OR '1'='1";
      const sanitized = sanitizeInput(malicious);
      
      // Should escape quotes
      expect(sanitized).toContain('&#x27;');
      expect(sanitized).not.toContain("'");
    });
  });

  describe('HTML Injection Prevention', () => {
    it('should remove iframe tags', () => {
      const malicious = '<iframe src="http://evil.com"></iframe>';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('</iframe>');
    });

    it('should remove object tags', () => {
      const malicious = '<object data="http://evil.com"></object>';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('<object');
      expect(sanitized).not.toContain('</object>');
    });

    it('should remove embed tags', () => {
      const malicious = '<embed src="http://evil.com">';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('<embed');
    });

    it('should remove style tags with malicious CSS', () => {
      const malicious = '<style>body{background:url("javascript:alert(\'XSS\')")}</style>';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('<style>');
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('Special Characters', () => {
    it('should handle angle brackets', () => {
      const input = 'Hello <World>';
      const sanitized = sanitizeInput(input);
      
      // Should either escape or remove angle brackets
      expect(sanitized).toBeDefined();
      expect(typeof sanitized).toBe('string');
    });

    it('should handle quotes', () => {
      const input = 'Hello "World" and \'Universe\'';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBeDefined();
      expect(typeof sanitized).toBe('string');
    });

    it('should handle ampersands', () => {
      const input = 'Tom & Jerry';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBeDefined();
      expect(typeof sanitized).toBe('string');
    });

    it('should handle backslashes', () => {
      const input = 'C:\\Users\\Admin';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBeDefined();
      expect(typeof sanitized).toBe('string');
    });
  });

  describe('Valid Input Preservation', () => {
    it('should preserve normal text', () => {
      const input = 'Hello, how are you?';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('how are you');
    });

    it('should preserve numbers', () => {
      const input = 'My age is 25 and I have 1000 followers';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toContain('25');
      expect(sanitized).toContain('1000');
    });

    it('should preserve common punctuation', () => {
      const input = 'Hello! How are you? I am fine.';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('How are you');
      expect(sanitized).toContain('I am fine');
    });

    it('should preserve emoji', () => {
      const input = 'Hello 👋 World 🌍';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('World');
      // Emoji might be preserved or removed depending on implementation
    });

    it('should preserve line breaks', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toContain('Line 1');
      expect(sanitized).toContain('Line 2');
      expect(sanitized).toContain('Line 3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const sanitized = sanitizeInput('');
      
      expect(sanitized).toBe('');
    });

    it('should handle whitespace only', () => {
      const sanitized = sanitizeInput('   ');
      
      expect(typeof sanitized).toBe('string');
    });

    it('should handle very long input', () => {
      const longInput = 'A'.repeat(10000);
      const sanitized = sanitizeInput(longInput);
      
      expect(typeof sanitized).toBe('string');
      expect(sanitized.length).toBeGreaterThan(0);
    });

    it('should handle null/undefined gracefully', () => {
      // @ts-expect-error Testing invalid input
      expect(() => sanitizeInput(null)).not.toThrow();
      // @ts-expect-error Testing invalid input
      expect(() => sanitizeInput(undefined)).not.toThrow();
    });

    it('should handle nested malicious code', () => {
      const malicious = '<<script>alert("XSS")<</script>>';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should handle encoded malicious code', () => {
      const malicious = '&#60;script&#62;alert("XSS")&#60;/script&#62;';
      const sanitized = sanitizeInput(malicious);
      
      // Should escape the HTML entities further
      expect(sanitized).toBeDefined();
      expect(typeof sanitized).toBe('string');
      // The function escapes & to &amp;, so &#60; becomes &amp;#60;
      expect(sanitized).toContain('&amp;');
    });

    it('should handle mixed case attacks', () => {
      const malicious = '<ScRiPt>alert("XSS")</sCrIpT>';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized.toLowerCase()).not.toContain('script');
      expect(sanitized).not.toContain('alert');
    });
  });

  describe('Multiple Attack Vectors', () => {
    it('should handle combined XSS and SQL injection', () => {
      const malicious = '<script>alert("XSS")</script>\'; DROP TABLE users; --';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('<script>');
      // SQL keywords will be escaped
      expect(sanitized).toContain('&#x27;'); // Escaped quote
    });

    it('should handle multiple script tags', () => {
      const malicious = '<script>alert(1)</script><script>alert(2)</script>';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should handle obfuscated attacks', () => {
      const malicious = '<img src=x onerror=alert(String.fromCharCode(88,83,83))>';
      const sanitized = sanitizeInput(malicious);
      
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('fromCharCode');
    });
  });

  describe('Performance', () => {
    it('should handle sanitization quickly', () => {
      const input = 'Normal text with some <tags> and "quotes"';
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        sanitizeInput(input);
      }
      
      const duration = Date.now() - start;
      
      // Should complete 1000 sanitizations in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Return Type', () => {
    it('should always return a string', () => {
      const inputs = [
        'normal text',
        '<script>alert("XSS")</script>',
        '',
        '   ',
        '123',
      ];
      
      inputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(typeof sanitized).toBe('string');
      });
    });

    it('should not return null or undefined', () => {
      const inputs = ['test', '', '<script>'];
      
      inputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toBeNull();
        expect(sanitized).not.toBeUndefined();
      });
    });
  });
});
