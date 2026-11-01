/**
 * Animations Service
 * 
 * Provides micro-interactions and animations for the app
 */

import { Animated, Easing } from 'react-native';
import { accessibilityService } from './accessibility';

// Animation presets
export const AnimationPresets = {
  // Durations
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  
  // Easing functions
  easing: {
    linear: Easing.linear,
    ease: Easing.ease,
    easeIn: Easing.in(Easing.ease),
    easeOut: Easing.out(Easing.ease),
    easeInOut: Easing.inOut(Easing.ease),
    spring: Easing.elastic(1),
    bounce: Easing.bounce,
  },
  
  // Spring configs
  spring: {
    gentle: {
      friction: 7,
      tension: 40,
    },
    bouncy: {
      friction: 5,
      tension: 100,
    },
    stiff: {
      friction: 10,
      tension: 200,
    },
  },
};

// Animation types
export type AnimationType = 
  | 'fadeIn'
  | 'fadeOut'
  | 'slideInRight'
  | 'slideInLeft'
  | 'slideInUp'
  | 'slideInDown'
  | 'scaleIn'
  | 'scaleOut'
  | 'bounce'
  | 'shake'
  | 'pulse'
  | 'rotate'
  | 'wiggle';

/**
 * Create a fade animation
 */
export function createFadeAnimation(
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = AnimationPresets.duration.normal
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue,
    duration: accessibilityService.getAnimationDuration(duration),
    easing: AnimationPresets.easing.easeInOut,
    useNativeDriver: true,
  });
}

/**
 * Create a slide animation
 */
export function createSlideAnimation(
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = AnimationPresets.duration.normal
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue,
    duration: accessibilityService.getAnimationDuration(duration),
    easing: AnimationPresets.easing.easeOut,
    useNativeDriver: true,
  });
}

/**
 * Create a scale animation
 */
export function createScaleAnimation(
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = AnimationPresets.duration.fast
): Animated.CompositeAnimation {
  return Animated.timing(animatedValue, {
    toValue,
    duration: accessibilityService.getAnimationDuration(duration),
    easing: AnimationPresets.easing.easeOut,
    useNativeDriver: true,
  });
}

/**
 * Create a spring animation
 */
export function createSpringAnimation(
  animatedValue: Animated.Value,
  toValue: number,
  config: typeof AnimationPresets.spring.gentle = AnimationPresets.spring.gentle
): Animated.CompositeAnimation {
  return Animated.spring(animatedValue, {
    toValue,
    friction: config.friction,
    tension: config.tension,
    useNativeDriver: true,
  });
}

/**
 * Create a shake animation
 */
export function createShakeAnimation(
  animatedValue: Animated.Value
): Animated.CompositeAnimation {
  const duration = accessibilityService.getAnimationDuration(400);
  
  if (duration === 0) {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    });
  }

  return Animated.sequence([
    Animated.timing(animatedValue, { toValue: 10, duration: duration / 6, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: duration / 6, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 10, duration: duration / 6, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: duration / 6, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 5, duration: duration / 6, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 0, duration: duration / 6, useNativeDriver: true }),
  ]);
}

/**
 * Create a pulse animation
 */
export function createPulseAnimation(
  animatedValue: Animated.Value,
  scale: number = 1.1
): Animated.CompositeAnimation {
  const duration = accessibilityService.getAnimationDuration(600);
  
  if (duration === 0) {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: 0,
      useNativeDriver: true,
    });
  }

  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: scale,
        duration: duration / 2,
        easing: AnimationPresets.easing.easeIn,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration / 2,
        easing: AnimationPresets.easing.easeOut,
        useNativeDriver: true,
      }),
    ])
  );
}

/**
 * Create a rotate animation
 */
export function createRotateAnimation(
  animatedValue: Animated.Value,
  rotations: number = 1
): Animated.CompositeAnimation {
  const duration = accessibilityService.getAnimationDuration(1000);
  
  return Animated.timing(animatedValue, {
    toValue: rotations,
    duration,
    easing: AnimationPresets.easing.linear,
    useNativeDriver: true,
  });
}

/**
 * Create a wiggle animation
 */
export function createWiggleAnimation(
  animatedValue: Animated.Value
): Animated.CompositeAnimation {
  const duration = accessibilityService.getAnimationDuration(500);
  
  if (duration === 0) {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    });
  }

  return Animated.sequence([
    Animated.timing(animatedValue, { toValue: 5, duration: duration / 8, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -5, duration: duration / 8, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 3, duration: duration / 8, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -3, duration: duration / 8, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 1, duration: duration / 8, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 0, duration: duration / 8, useNativeDriver: true }),
  ]);
}

/**
 * Create entrance animation
 */
export function createEntranceAnimation(
  opacity: Animated.Value,
  translateY: Animated.Value,
  type: 'fadeIn' | 'slideUp' | 'scaleIn' = 'fadeIn'
): Animated.CompositeAnimation {
  const duration = accessibilityService.getAnimationDuration(300);
  
  if (duration === 0) {
    return Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]);
  }

  switch (type) {
    case 'slideUp':
      return Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: AnimationPresets.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: AnimationPresets.easing.easeOut,
          useNativeDriver: true,
        }),
      ]);
    case 'scaleIn':
      return Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]);
    default:
      return Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: AnimationPresets.easing.easeIn,
        useNativeDriver: true,
      });
  }
}

/**
 * Create staggered animations for list items
 */
export function createStaggeredAnimations(
  animatedValues: Animated.Value[],
  staggerDelay: number = 50
): Animated.CompositeAnimation {
  const duration = accessibilityService.getAnimationDuration(300);
  
  if (duration === 0) {
    return Animated.parallel(
      animatedValues.map(value =>
        Animated.timing(value, { toValue: 1, duration: 0, useNativeDriver: true })
      )
    );
  }

  return Animated.stagger(
    staggerDelay,
    animatedValues.map(value =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: AnimationPresets.easing.easeOut,
        useNativeDriver: true,
      })
    )
  );
}

/**
 * Button press animation
 */
export function createButtonPressAnimation(
  scaleValue: Animated.Value,
  onPress?: () => void
): () => void {
  return () => {
    const duration = accessibilityService.getAnimationDuration(100);
    
    if (duration === 0) {
      onPress?.();
      return;
    }

    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress?.();
    });
  };
}

/**
 * Success checkmark animation
 */
export function createSuccessAnimation(
  scaleValue: Animated.Value,
  checkValue: Animated.Value
): Animated.CompositeAnimation {
  const duration = accessibilityService.getAnimationDuration(400);
  
  if (duration === 0) {
    return Animated.parallel([
      Animated.timing(scaleValue, { toValue: 1, duration: 0, useNativeDriver: true }),
      Animated.timing(checkValue, { toValue: 1, duration: 0, useNativeDriver: true }),
    ]);
  }

  return Animated.sequence([
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }),
    Animated.timing(checkValue, {
      toValue: 1,
      duration: duration / 2,
      easing: AnimationPresets.easing.easeOut,
      useNativeDriver: true,
    }),
  ]);
}

/**
 * Loading spinner animation
 */
export function createSpinnerAnimation(
  rotationValue: Animated.Value
): Animated.CompositeAnimation {
  const duration = accessibilityService.getAnimationDuration(1000);
  
  if (duration === 0) {
    return Animated.loop(
      Animated.timing(rotationValue, {
        toValue: 1,
        duration: 1000,
        easing: AnimationPresets.easing.linear,
        useNativeDriver: true,
      })
    );
  }

  return Animated.loop(
    Animated.timing(rotationValue, {
      toValue: 1,
      duration,
      easing: AnimationPresets.easing.linear,
      useNativeDriver: true,
    })
  );
}

/**
 * Interpolate rotation
 */
export function interpolateRotation(
  animatedValue: Animated.Value,
  rotations: number = 1
): Animated.AnimatedInterpolation<string> {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${rotations * 360}deg`],
  });
}

/**
 * Interpolate opacity
 */
export function interpolateOpacity(
  animatedValue: Animated.Value,
  inputRange: number[] = [0, 1],
  outputRange: number[] = [0, 1]
): Animated.AnimatedInterpolation<number> {
  return animatedValue.interpolate({
    inputRange,
    outputRange,
  });
}

/**
 * Interpolate scale
 */
export function interpolateScale(
  animatedValue: Animated.Value,
  inputRange: number[] = [0, 1],
  outputRange: number[] = [0.8, 1]
): Animated.AnimatedInterpolation<number> {
  return animatedValue.interpolate({
    inputRange,
    outputRange,
  });
}

/**
 * Interpolate translate X
 */
export function interpolateTranslateX(
  animatedValue: Animated.Value,
  inputRange: number[],
  outputRange: number[]
): Animated.AnimatedInterpolation<number> {
  return animatedValue.interpolate({
    inputRange,
    outputRange,
  });
}

/**
 * Interpolate translate Y
 */
export function interpolateTranslateY(
  animatedValue: Animated.Value,
  inputRange: number[],
  outputRange: number[]
): Animated.AnimatedInterpolation<number> {
  return animatedValue.interpolate({
    inputRange,
    outputRange,
  });
}

export default {
  presets: AnimationPresets,
  createFadeAnimation,
  createSlideAnimation,
  createScaleAnimation,
  createSpringAnimation,
  createShakeAnimation,
  createPulseAnimation,
  createRotateAnimation,
  createWiggleAnimation,
  createEntranceAnimation,
  createStaggeredAnimations,
  createButtonPressAnimation,
  createSuccessAnimation,
  createSpinnerAnimation,
  interpolateRotation,
  interpolateOpacity,
  interpolateScale,
  interpolateTranslateX,
  interpolateTranslateY,
};