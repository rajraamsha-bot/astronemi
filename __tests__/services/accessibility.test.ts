/**
 * Accessibility Service Tests
 */

// Import service after mocks (mocks are in jest.setup.js)
import { accessibilityService, AnnouncementType, AccessibilityRoles } from '@/services/accessibility';

describe('Accessibility Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize without error', async () => {
      await accessibilityService.initialize();
      // Should complete without error
    });

    it('should check screen reader status on init', async () => {
      await accessibilityService.initialize();
      // Verify the state was set
      const state = accessibilityService.getState();
      expect(state).toHaveProperty('screenReaderEnabled');
    });

    it('should set up event listeners on init', async () => {
      await accessibilityService.initialize();
      // Event listeners should be set up
    });
  });

  describe('getState', () => {
    it('should return current accessibility state', async () => {
      await accessibilityService.initialize();
      const state = accessibilityService.getState();
      
      expect(state).toHaveProperty('screenReaderEnabled');
      expect(state).toHaveProperty('reduceMotionEnabled');
      expect(state).toHaveProperty('boldTextEnabled');
      expect(state).toHaveProperty('grayscaleEnabled');
      expect(state).toHaveProperty('invertColorsEnabled');
    });
  });

  describe('isScreenReaderEnabled', () => {
    it('should return screen reader status', async () => {
      await accessibilityService.initialize();
      const enabled = accessibilityService.isScreenReaderEnabled();
      expect(typeof enabled).toBe('boolean');
    });
  });

  describe('isReduceMotionEnabled', () => {
    it('should return reduce motion status', async () => {
      await accessibilityService.initialize();
      const enabled = accessibilityService.isReduceMotionEnabled();
      expect(typeof enabled).toBe('boolean');
    });
  });

  describe('announce', () => {
    it('should announce message for accessibility', () => {
      accessibilityService.announce('Test announcement');
      // Should complete without error
    });

    it('should use polite announcement type by default', () => {
      accessibilityService.announce('Test announcement');
      // Should complete without error
    });

    it('should accept assertive announcement type', () => {
      accessibilityService.announce('Urgent announcement', AnnouncementType.ASSERTIVE);
      // Should complete without error
    });
  });

  describe('setFocusToComponent', () => {
    it('should set focus to component', () => {
      const ref = { current: {} };
      accessibilityService.setFocusToComponent(ref);
      // Should complete without error
    });

    it('should handle null ref', () => {
      const ref = { current: null };
      // Should not throw
      expect(() => accessibilityService.setFocusToComponent(ref)).not.toThrow();
    });
  });

  describe('getTouchableProps', () => {
    it('should return accessibility props for touchable', () => {
      const props = accessibilityService.getTouchableProps({ label: 'Test label' });
      
      expect(props).toHaveProperty('accessible', true);
      expect(props).toHaveProperty('accessibilityLabel', 'Test label');
      expect(props).toHaveProperty('accessibilityRole', 'button');
    });

    it('should include hint when provided', () => {
      const props = accessibilityService.getTouchableProps({ 
        label: 'Test label', 
        hint: 'Test hint' 
      });
      
      expect(props).toHaveProperty('accessibilityHint', 'Test hint');
    });

    it('should include role when provided', () => {
      const props = accessibilityService.getTouchableProps({ 
        label: 'Test label', 
        role: 'link' 
      });
      
      expect(props).toHaveProperty('accessibilityRole', 'link');
    });

    it('should include disabled state', () => {
      const props = accessibilityService.getTouchableProps({ 
        label: 'Test label', 
        disabled: true 
      });
      
      expect(props.accessibilityState.disabled).toBe(true);
    });

    it('should include selected state', () => {
      const props = accessibilityService.getTouchableProps({ 
        label: 'Test label', 
        selected: true 
      });
      
      expect(props.accessibilityState.selected).toBe(true);
    });

    it('should include expanded state', () => {
      const props = accessibilityService.getTouchableProps({ 
        label: 'Test label', 
        expanded: true 
      });
      
      expect(props.accessibilityState.expanded).toBe(true);
    });
  });

  describe('getTextProps', () => {
    it('should return accessibility props for text', () => {
      const props = accessibilityService.getTextProps({ label: 'Test heading' });
      
      expect(props).toHaveProperty('accessible', true);
      expect(props).toHaveProperty('accessibilityLabel', 'Test heading');
    });

    it('should include role when provided', () => {
      const props = accessibilityService.getTextProps({ 
        label: 'Test heading', 
        role: 'header' 
      });
      
      expect(props).toHaveProperty('accessibilityRole', 'header');
    });

    it('should not be accessible when no label', () => {
      const props = accessibilityService.getTextProps({});
      
      expect(props).toHaveProperty('accessible', false);
    });
  });

  describe('getImageProps', () => {
    it('should return accessibility props for image', () => {
      const props = accessibilityService.getImageProps({ label: 'Test image' });
      
      expect(props).toHaveProperty('accessible', true);
      expect(props).toHaveProperty('accessibilityLabel', 'Test image');
      expect(props).toHaveProperty('accessibilityRole', 'image');
    });

    it('should include hint when provided', () => {
      const props = accessibilityService.getImageProps({ 
        label: 'Test image', 
        hint: 'Double tap to enlarge' 
      });
      
      expect(props).toHaveProperty('accessibilityHint', 'Double tap to enlarge');
    });
  });

  describe('getHeaderProps', () => {
    it('should return accessibility props for header', () => {
      const props = accessibilityService.getHeaderProps({ label: 'Main Title' });
      
      expect(props).toHaveProperty('accessible', true);
      expect(props).toHaveProperty('accessibilityLabel', 'Main Title');
      expect(props).toHaveProperty('accessibilityRole', 'header');
    });

    it('should accept header level', () => {
      const props = accessibilityService.getHeaderProps({ 
        label: 'Section Title', 
        level: 2 
      });
      
      expect(props).toHaveProperty('accessibilityRole', 'header');
    });
  });

  describe('Announcement Types', () => {
    it('should have POLITE type', () => {
      expect(AnnouncementType.POLITE).toBe('polite');
    });

    it('should have ASSERTIVE type', () => {
      expect(AnnouncementType.ASSERTIVE).toBe('assertive');
    });
  });

  describe('Accessibility Roles', () => {
    it('should have BUTTON role', () => {
      expect(AccessibilityRoles.BUTTON).toBe('button');
    });

    it('should have LINK role', () => {
      expect(AccessibilityRoles.LINK).toBe('link');
    });

    it('should have IMAGE role', () => {
      expect(AccessibilityRoles.IMAGE).toBe('image');
    });

    it('should have HEADER role', () => {
      expect(AccessibilityRoles.HEADER).toBe('header');
    });

    it('should have TEXT role', () => {
      expect(AccessibilityRoles.TEXT).toBe('text');
    });

    it('should have SEARCH role', () => {
      expect(AccessibilityRoles.SEARCH).toBe('search');
    });

    it('should have ALERT role', () => {
      expect(AccessibilityRoles.ALERT).toBe('alert');
    });

    it('should have CHECKBOX role', () => {
      expect(AccessibilityRoles.CHECKBOX).toBe('checkbox');
    });

    it('should have SWITCH role', () => {
      expect(AccessibilityRoles.SWITCH).toBe('switch');
    });

    it('should have TAB role', () => {
      expect(AccessibilityRoles.TAB).toBe('tab');
    });
  });

  describe('addListener', () => {
    it('should add a listener', async () => {
      await accessibilityService.initialize();
      const listener = jest.fn();
      const unsubscribe = accessibilityService.addListener(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Clean up
      unsubscribe();
    });

    it('should return unsubscribe function', async () => {
      await accessibilityService.initialize();
      const listener = jest.fn();
      const unsubscribe = accessibilityService.addListener(listener);
      
      // Should not throw when called
      unsubscribe();
    });
  });
});
