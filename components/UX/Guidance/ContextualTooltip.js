import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const ContextualTooltip = ({
  visible,
  title,
  message,
  position = 'bottom', // 'top', 'bottom', 'left', 'right'
  targetPosition = { x: 0, y: 0, width: 0, height: 0 },
  onClose,
  onNext,
  onPrevious,
  showNavigation = false,
  currentStep = 0,
  totalSteps = 0,
}) => {
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      calculatePosition();
      
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
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [visible, targetPosition]);

  const calculatePosition = () => {
    const tooltipWidth = width * 0.8;
    const tooltipHeight = 120;
    const margin = 20;
    
    let x = targetPosition.x;
    let y = targetPosition.y;

    switch (position) {
      case 'top':
        x = targetPosition.x + (targetPosition.width / 2) - (tooltipWidth / 2);
        y = targetPosition.y - tooltipHeight - 20;
        break;
      case 'bottom':
        x = targetPosition.x + (targetPosition.width / 2) - (tooltipWidth / 2);
        y = targetPosition.y + targetPosition.height + 20;
        break;
      case 'left':
        x = targetPosition.x - tooltipWidth - 20;
        y = targetPosition.y + (targetPosition.height / 2) - (tooltipHeight / 2);
        break;
      case 'right':
        x = targetPosition.x + targetPosition.width + 20;
        y = targetPosition.y + (targetPosition.height / 2) - (tooltipHeight / 2);
        break;
    }

    // Ensure tooltip stays within screen bounds
    x = Math.max(margin, Math.min(x, width - tooltipWidth - margin));
    y = Math.max(margin, Math.min(y, height - tooltipHeight - margin));

    setTooltipPosition({ x, y });
  };

  const getArrowStyle = () => {
    const arrowSize = 8;
    const baseStyle = {
      position: 'absolute',
      width: 0,
      height: 0,
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          bottom: -arrowSize,
          left: '50%',
          marginLeft: -arrowSize,
          borderLeftWidth: arrowSize,
          borderRightWidth: arrowSize,
          borderTopWidth: arrowSize,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: '#333',
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: -arrowSize,
          left: '50%',
          marginLeft: -arrowSize,
          borderLeftWidth: arrowSize,
          borderRightWidth: arrowSize,
          borderBottomWidth: arrowSize,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: '#333',
        };
      case 'left':
        return {
          ...baseStyle,
          right: -arrowSize,
          top: '50%',
          marginTop: -arrowSize,
          borderTopWidth: arrowSize,
          borderBottomWidth: arrowSize,
          borderLeftWidth: arrowSize,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: '#333',
        };
      case 'right':
        return {
          ...baseStyle,
          left: -arrowSize,
          top: '50%',
          marginTop: -arrowSize,
          borderTopWidth: arrowSize,
          borderBottomWidth: arrowSize,
          borderRightWidth: arrowSize,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: '#333',
        };
      default:
        return baseStyle;
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim },
        ]}
      >
        {/* Highlighted target area */}
        <View
          style={[
            styles.highlight,
            {
              left: targetPosition.x,
              top: targetPosition.y,
              width: targetPosition.width,
              height: targetPosition.height,
            },
          ]}
        />

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            {
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.tooltipContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.message}>{message}</Text>
            
            {showNavigation && (
              <View style={styles.navigation}>
                <View style={styles.stepIndicator}>
                  <Text style={styles.stepText}>
                    {currentStep + 1} of {totalSteps}
                  </Text>
                </View>
                
                <View style={styles.navButtons}>
                  {onPrevious && (
                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={onPrevious}
                    >
                      <Text style={styles.navButtonText}>←</Text>
                    </TouchableOpacity>
                  )}
                  
                  {onNext && (
                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={onNext}
                    >
                      <Text style={styles.navButtonText}>→</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
          
          {/* Arrow */}
          <View style={getArrowStyle()} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Tooltip Manager Hook
export const useTooltip = () => {
  const [tooltips, setTooltips] = useState([]);
  const [currentTooltip, setCurrentTooltip] = useState(null);

  const showTooltip = (tooltipConfig) => {
    const tooltip = {
      id: Date.now().toString(),
      ...tooltipConfig,
    };
    
    setTooltips(prev => [...prev, tooltip]);
    setCurrentTooltip(tooltip);
  };

  const hideTooltip = (tooltipId) => {
    setTooltips(prev => prev.filter(t => t.id !== tooltipId));
    setCurrentTooltip(null);
  };

  const showTooltipSequence = (tooltipSequence, onComplete) => {
    let currentIndex = 0;
    
    const showNext = () => {
      if (currentIndex < tooltipSequence.length) {
        const tooltip = tooltipSequence[currentIndex];
        showTooltip({
          ...tooltip,
          onNext: currentIndex < tooltipSequence.length - 1 ? showNext : onComplete,
          onPrevious: currentIndex > 0 ? () => {
            currentIndex--;
            showNext();
          } : null,
          showNavigation: tooltipSequence.length > 1,
          currentStep: currentIndex,
          totalSteps: tooltipSequence.length,
        });
        currentIndex++;
      }
    };
    
    showNext();
  };

  return {
    tooltips,
    currentTooltip,
    showTooltip,
    hideTooltip,
    showTooltipSequence,
  };
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  tooltip: {
    position: 'absolute',
    width: width * 0.8,
    maxWidth: 300,
    backgroundColor: '#333',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
    marginBottom: 12,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepIndicator: {
    flex: 1,
  },
  stepText: {
    fontSize: 12,
    color: '#CCC',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ContextualTooltip;
