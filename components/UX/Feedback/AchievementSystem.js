import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Achievement Context
const AchievementContext = createContext();

// Achievement Hook
export const useAchievements = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
};

// Achievement Provider
export const AchievementProvider = ({ children }) => {
  const [achievements, setAchievements] = useState([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);

  // Load achievements on app start
  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const savedAchievements = await AsyncStorage.getItem('unlocked_achievements');
      if (savedAchievements) {
        setUnlockedAchievements(JSON.parse(savedAchievements));
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const saveAchievements = async (newAchievements) => {
    try {
      await AsyncStorage.setItem('unlocked_achievements', JSON.stringify(newAchievements));
    } catch (error) {
      console.error('Error saving achievements:', error);
    }
  };

  const unlockAchievement = (achievementId) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (achievement && !unlockedAchievements.includes(achievementId)) {
      const newUnlocked = [...unlockedAchievements, achievementId];
      setUnlockedAchievements(newUnlocked);
      saveAchievements(newUnlocked);
      
      // Show achievement modal
      setCurrentAchievement(achievement);
      setShowAchievementModal(true);
      
      return true; // Achievement was newly unlocked
    }
    return false; // Achievement was already unlocked
  };

  const checkAchievements = (stats) => {
    const newlyUnlocked = [];

    achievements.forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id)) {
        let shouldUnlock = false;

        switch (achievement.condition.type) {
          case 'notes_created':
            shouldUnlock = stats.totalNotes >= achievement.condition.value;
            break;
          case 'drawings_created':
            shouldUnlock = stats.totalDrawings >= achievement.condition.value;
            break;
          case 'voice_notes_created':
            shouldUnlock = stats.totalVoiceNotes >= achievement.condition.value;
            break;
          case 'photos_created':
            shouldUnlock = stats.totalPhotos >= achievement.condition.value;
            break;
          case 'supernotes_created':
            shouldUnlock = stats.totalSuperNotes >= achievement.condition.value;
            break;
          case 'streak_days':
            shouldUnlock = stats.streakDays >= achievement.condition.value;
            break;
          case 'total_words':
            shouldUnlock = stats.totalWords >= achievement.condition.value;
            break;
          default:
            break;
        }

        if (shouldUnlock) {
          newlyUnlocked.push(achievement.id);
          unlockAchievement(achievement.id);
        }
      }
    });

    return newlyUnlocked;
  };

  const getAchievementProgress = (achievementId) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement) return 0;

    // This would typically come from user stats
    // For now, return a placeholder
    return 0;
  };

  const value = {
    achievements,
    unlockedAchievements,
    unlockAchievement,
    checkAchievements,
    getAchievementProgress,
    setAchievements,
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
      <AchievementModal
        visible={showAchievementModal}
        achievement={currentAchievement}
        onClose={() => setShowAchievementModal(false)}
      />
    </AchievementContext.Provider>
  );
};

// Achievement Modal Component
const AchievementModal = ({ visible, achievement, onClose }) => {
  const [showModal, setShowModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      setShowModal(true);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  }, [visible, achievement]);

  const handleClose = () => {
    Animated.spring(scaleAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  if (!showModal || !achievement) return null;

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Sparkle effects */}
          <Animated.View
            style={[
              styles.sparkle,
              styles.sparkle1,
              { opacity: sparkleOpacity },
            ]}
          >
            <Text style={styles.sparkleText}>✨</Text>
          </Animated.View>
          
          <Animated.View
            style={[
              styles.sparkle,
              styles.sparkle2,
              { opacity: sparkleOpacity },
            ]}
          >
            <Text style={styles.sparkleText}>⭐</Text>
          </Animated.View>
          
          <Animated.View
            style={[
              styles.sparkle,
              styles.sparkle3,
              { opacity: sparkleOpacity },
            ]}
          >
            <Text style={styles.sparkleText}>💫</Text>
          </Animated.View>

          {/* Achievement content */}
          <View style={styles.content}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ rotate: rotation }],
                },
              ]}
            >
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            </Animated.View>
            
            <Text style={styles.title}>Achievement Unlocked!</Text>
            <Text style={styles.achievementName}>{achievement.name}</Text>
            <Text style={styles.description}>{achievement.description}</Text>
            
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsText}>+{achievement.points} points</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Achievement Badge Component
export const AchievementBadge = ({ achievementId, size = 40, showProgress = false }) => {
  const { achievements, unlockedAchievements, getAchievementProgress } = useAchievements();
  
  const achievement = achievements.find(a => a.id === achievementId);
  const isUnlocked = unlockedAchievements.includes(achievementId);
  const progress = showProgress ? getAchievementProgress(achievementId) : 0;

  if (!achievement) return null;

  return (
    <View style={[styles.badge, { width: size, height: size }]}>
      <Text
        style={[
          styles.badgeIcon,
          {
            fontSize: size * 0.6,
            opacity: isUnlocked ? 1 : 0.3,
          },
        ]}
      >
        {achievement.icon}
      </Text>
      
      {showProgress && !isUnlocked && (
        <View style={styles.progressRing}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

// Achievement List Component
export const AchievementList = ({ onAchievementPress }) => {
  const { achievements, unlockedAchievements, getAchievementProgress } = useAchievements();

  return (
    <View style={styles.achievementList}>
      {achievements.map((achievement) => {
        const isUnlocked = unlockedAchievements.includes(achievement.id);
        const progress = getAchievementProgress(achievement.id);

        return (
          <TouchableOpacity
            key={achievement.id}
            style={[
              styles.achievementItem,
              isUnlocked && styles.unlockedAchievementItem,
            ]}
            onPress={() => onAchievementPress && onAchievementPress(achievement)}
          >
            <View style={styles.achievementItemContent}>
              <Text
                style={[
                  styles.achievementItemIcon,
                  { opacity: isUnlocked ? 1 : 0.3 },
                ]}
              >
                {achievement.icon}
              </Text>
              
              <View style={styles.achievementItemInfo}>
                <Text
                  style={[
                    styles.achievementItemName,
                    { opacity: isUnlocked ? 1 : 0.5 },
                  ]}
                >
                  {achievement.name}
                </Text>
                
                <Text
                  style={[
                    styles.achievementItemDescription,
                    { opacity: isUnlocked ? 1 : 0.5 },
                  ]}
                >
                  {achievement.description}
                </Text>
                
                {!isUnlocked && (
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progress}%` },
                      ]}
                    />
                  </View>
                )}
              </View>
              
              <Text style={styles.achievementItemPoints}>
                {achievement.points}pts
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width * 0.9,
    maxWidth: 350,
    backgroundColor: '#f7efe7',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 20,
    right: 20,
  },
  sparkle2: {
    top: 20,
    left: 20,
  },
  sparkle3: {
    bottom: 20,
    right: 30,
  },
  sparkleText: {
    fontSize: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  achievementIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  pointsContainer: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pointsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeIcon: {
    textAlign: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#8B4513',
    borderRadius: 18,
  },
  achievementList: {
    padding: 16,
  },
  achievementItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unlockedAchievementItem: {
    backgroundColor: '#F5FFF5',
    borderWidth: 2,
    borderColor: '#00C851',
  },
  achievementItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementItemIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementItemInfo: {
    flex: 1,
  },
  achievementItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  achievementItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B4513',
    borderRadius: 2,
  },
  achievementItemPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginLeft: 12,
  },
});

export default AchievementSystem;
