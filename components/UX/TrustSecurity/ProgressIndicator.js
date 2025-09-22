import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';

const { width } = Dimensions.get('window');

const ProgressIndicator = ({
  visible,
  progress = 0, // 0 to 100
  message = 'Loading...',
  showPercentage = true,
  showSpinner = true,
  type = 'default', // 'default', 'success', 'error'
  onComplete,
}) => {
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();

      // Animate spinner
      if (showSpinner) {
        const spinAnimation = Animated.loop(
          Animated.timing(spinAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        );
        spinAnimation.start();

        return () => spinAnimation.stop();
      }
    }
  }, [visible, progress]);

  React.useEffect(() => {
    if (progress >= 100 && onComplete) {
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  }, [progress, onComplete]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          progressColor: '#00C851',
          backgroundColor: '#F5FFF5',
          textColor: '#00C851',
        };
      case 'error':
        return {
          progressColor: '#FF4444',
          backgroundColor: '#FFF5F5',
          textColor: '#FF4444',
        };
      default:
        return {
          progressColor: '#8B4513',
          backgroundColor: '#f7efe7',
          textColor: '#8B4513',
        };
    }
  };

  const typeStyles = getTypeStyles();

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: typeStyles.backgroundColor }]}>
          {showSpinner && (
            <Animated.View
              style={[
                styles.spinner,
                {
                  transform: [{ rotate: spin }],
                  borderColor: typeStyles.progressColor,
                },
              ]}
            />
          )}
          
          <Text style={[styles.message, { color: typeStyles.textColor }]}>
            {message}
          </Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressWidth,
                    backgroundColor: typeStyles.progressColor,
                  },
                ]}
              />
            </View>
            
            {showPercentage && (
              <Text style={[styles.percentage, { color: typeStyles.textColor }]}>
                {Math.round(progress)}%
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width * 0.8,
    maxWidth: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
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
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderTopColor: 'transparent',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProgressIndicator;
