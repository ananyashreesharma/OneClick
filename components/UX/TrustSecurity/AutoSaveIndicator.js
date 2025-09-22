import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const AutoSaveIndicator = ({
  isSaving = false,
  lastSaved = null,
  saveError = null,
  position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  showTimestamp = true,
}) => {
  const [showIndicator, setShowIndicator] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSaving || lastSaved || saveError) {
      setShowIndicator(true);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();

      // Auto-hide after 3 seconds (except for errors)
      if (!saveError && !isSaving) {
        setTimeout(() => {
          hideIndicator();
        }, 3000);
      }
    }
  }, [isSaving, lastSaved, saveError]);

  const hideIndicator = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start(() => {
      setShowIndicator(false);
    });
  };

  const getStatusInfo = () => {
    if (saveError) {
      return {
        icon: '⚠️',
        text: 'Save failed',
        color: '#FF4444',
        backgroundColor: '#FFF5F5',
        borderColor: '#FFE5E5',
      };
    }
    
    if (isSaving) {
      return {
        icon: '💾',
        text: 'Saving...',
        color: '#FF9800',
        backgroundColor: '#FFF8F0',
        borderColor: '#FFE5CC',
      };
    }
    
    if (lastSaved) {
      return {
        icon: '✅',
        text: 'Saved',
        color: '#00C851',
        backgroundColor: '#F5FFF5',
        borderColor: '#E5FFE5',
      };
    }
    
    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo || !showIndicator) return null;

  const getPositionStyles = () => {
    const basePosition = {
      position: 'absolute',
      zIndex: 1000,
    };

    switch (position) {
      case 'top-left':
        return { ...basePosition, top: 50, left: 20 };
      case 'top-right':
        return { ...basePosition, top: 50, right: 20 };
      case 'bottom-left':
        return { ...basePosition, bottom: 100, left: 20 };
      case 'bottom-right':
        return { ...basePosition, bottom: 100, right: 20 };
      default:
        return { ...basePosition, top: 50, right: 20 };
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const savedTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - savedTime) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
  };

  const slideTransform = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyles(),
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideTransform }],
          backgroundColor: statusInfo.backgroundColor,
          borderColor: statusInfo.borderColor,
        },
      ]}
    >
      <Text style={styles.icon}>{statusInfo.icon}</Text>
      
      <View style={styles.textContainer}>
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>
        
        {showTimestamp && lastSaved && !isSaving && !saveError && (
          <Text style={styles.timestamp}>
            {formatTimestamp(lastSaved)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: width * 0.6,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default AutoSaveIndicator;
