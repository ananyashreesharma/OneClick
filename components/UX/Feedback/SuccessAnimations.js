import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Success Checkmark Animation
export const SuccessCheckmark = ({
  visible,
  size = 80,
  color = '#00C851',
  duration = 1000,
  onComplete,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pathAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate the circle scaling
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Animate rotation
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Animate checkmark path
      Animated.timing(pathAnim, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: false,
      }).start(() => {
        if (onComplete) {
          setTimeout(onComplete, duration - 600);
        }
      });
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      pathAnim.setValue(0);
    }
  }, [visible]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const checkmarkPath = pathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0 0', '20 20'],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.checkmarkContainer,
        {
          width: size,
          height: size,
          transform: [{ scale: scaleAnim }, { rotate: rotation }],
        },
      ]}
    >
      <View
        style={[
          styles.checkmarkCircle,
          {
            width: size,
            height: size,
            borderColor: color,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.checkmark,
          {
            borderColor: color,
            transform: [{ scale: pathAnim }],
          },
        ]}
      />
    </Animated.View>
  );
};

// Celebration Animation
export const CelebrationAnimation = ({
  visible,
  type = 'confetti', // 'confetti', 'stars', 'hearts'
  duration = 2000,
  onComplete,
}) => {
  const particles = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Create particles
      particles.current = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        anim: new Animated.Value(0),
        x: Math.random() * width,
        y: height / 2,
      }));

      // Animate particles
      particles.current.forEach((particle, index) => {
        Animated.timing(particle.anim, {
          toValue: 1,
          duration: duration,
          delay: index * 50,
          useNativeDriver: true,
        }).start();
      });

      if (onComplete) {
        setTimeout(onComplete, duration);
      }
    } else {
      fadeAnim.setValue(0);
      particles.current = [];
    }
  }, [visible]);

  const getParticleEmoji = () => {
    switch (type) {
      case 'stars': return '⭐';
      case 'hearts': return '❤️';
      default: return '🎉';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.celebrationContainer, { opacity: fadeAnim }]}
      pointerEvents="none"
    >
      {particles.current.map((particle) => {
        const translateY = particle.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -height],
        });

        const translateX = particle.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, (Math.random() - 0.5) * 200],
        });

        const scale = particle.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 1, 0],
        });

        const rotation = particle.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '720deg'],
        });

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                transform: [
                  { translateX },
                  { translateY },
                  { scale },
                  { rotate: rotation },
                ],
              },
            ]}
          >
            <Text style={styles.particleEmoji}>{getParticleEmoji()}</Text>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
};

// Progress Success Animation
export const ProgressSuccess = ({
  visible,
  progress = 100,
  message = 'Complete!',
  onComplete,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Animate progress
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      }).start(() => {
        if (onComplete) {
          setTimeout(onComplete, 1000);
        }
      });
    } else {
      progressAnim.setValue(0);
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, progress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.progressContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.progressContent}>
        <Text style={styles.progressMessage}>{message}</Text>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>
          
          <Text style={styles.progressPercentage}>
            {Math.round(progress)}%
          </Text>
        </View>
        
        {progress >= 100 && (
          <Text style={styles.successText}>🎉 Success!</Text>
        )}
      </View>
    </Animated.View>
  );
};

// Floating Success Message
export const FloatingSuccessMessage = ({
  visible,
  message,
  icon = '✅',
  duration = 3000,
  position = 'top',
  onComplete,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide
      const timer = setTimeout(() => {
        hideMessage();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideMessage = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  if (!visible) return null;

  const containerStyle = position === 'top' 
    ? styles.floatingTop
    : styles.floatingBottom;

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.floatingContent}>
        <Text style={styles.floatingIcon}>{icon}</Text>
        <Text style={styles.floatingMessage}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkCircle: {
    position: 'absolute',
    borderRadius: 40,
    borderWidth: 4,
  },
  checkmark: {
    width: 20,
    height: 12,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#00C851',
    transform: [{ rotate: '-45deg' }],
    marginTop: 8,
  },
  celebrationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  particle: {
    position: 'absolute',
  },
  particleEmoji: {
    fontSize: 24,
  },
  progressContainer: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    transform: [{ translateY: -50 }],
    zIndex: 1000,
  },
  progressContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  progressMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00C851',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  successText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00C851',
    marginTop: 8,
  },
  floatingTop: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  floatingBottom: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  floatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C851',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  floatingMessage: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});

export default {
  SuccessCheckmark,
  CelebrationAnimation,
  ProgressSuccess,
  FloatingSuccessMessage,
};
