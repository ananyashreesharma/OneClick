import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  ScrollView,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const WelcomeWizard = ({
  visible,
  onComplete,
  onSkip,
  steps = [],
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const defaultSteps = [
    {
      id: 'welcome',
      title: 'Welcome to OneClickNotes!',
      description: 'Your personal note-taking companion with supernote capabilities.',
      icon: '📝',
      image: null,
      features: [
        'Create text, drawing, voice, and photo notes',
        'Combine them into powerful supernotes',
        'Keep your thoughts organized and accessible',
      ],
    },
    {
      id: 'features',
      title: 'Supernote Magic',
      description: 'Create rich, multi-media notes that capture your complete thoughts.',
      icon: '✨',
      image: null,
      features: [
        'Mix text with drawings and voice',
        'Add photos to enhance your notes',
        'Everything syncs across your devices',
      ],
    },
    {
      id: 'security',
      title: 'Your Privacy Matters',
      description: 'Your notes are encrypted and stored securely in the cloud.',
      icon: '🔒',
      image: null,
      features: [
        'End-to-end encryption',
        'Secure cloud backup',
        'Private note options',
      ],
    },
    {
      id: 'ready',
      title: "You're All Set!",
      description: 'Start capturing your thoughts and ideas right away.',
      icon: '🚀',
      image: null,
      features: [
        'Tap the + button to create your first note',
        'Swipe to access different note types',
        'Your notes auto-save as you type',
      ],
    },
  ];

  const wizardSteps = steps.length > 0 ? steps : defaultSteps;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [visible]);

  const handleNext = () => {
    if (currentStep < wizardSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Animate scroll to next step
      scrollViewRef.current?.scrollTo({
        x: nextStep * width,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // Animate scroll to previous step
      scrollViewRef.current?.scrollTo({
        x: prevStep * width,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
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
      onSkip && onSkip();
    });
  };

  const handleComplete = () => {
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
      onComplete && onComplete();
    });
  };

  const renderStep = (step, index) => (
    <View key={step.id} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Text style={styles.stepIcon}>{step.icon}</Text>
        
        {step.image && (
          <Image source={step.image} style={styles.stepImage} />
        )}
        
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDescription}>{step.description}</Text>
        
        {step.features && (
          <View style={styles.featuresContainer}>
            {step.features.map((feature, featureIndex) => (
              <View key={featureIndex} style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderProgressDots = () => (
    <View style={styles.progressContainer}>
      {wizardSteps.map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index === currentStep && styles.activeProgressDot,
            index < currentStep && styles.completedProgressDot,
          ]}
        />
      ))}
    </View>
  );

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          transform: [{ scale: slideAnim }],
        },
      ]}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Dots */}
        {renderProgressDots()}

        {/* Steps Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.stepsContainer}
        >
          {wizardSteps.map((step, index) => renderStep(step, index))}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePrevious}
            >
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              { marginLeft: currentStep === 0 ? 'auto' : 12 }
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === wizardSteps.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#f7efe7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButtonText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 69, 19, 0.3)',
    marginHorizontal: 4,
  },
  activeProgressDot: {
    backgroundColor: '#8B4513',
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  completedProgressDot: {
    backgroundColor: '#8B4513',
  },
  stepsContainer: {
    flex: 1,
  },
  stepContainer: {
    width: width,
    paddingHorizontal: 40,
    justifyContent: 'center',
  },
  stepContent: {
    alignItems: 'center',
  },
  stepIcon: {
    fontSize: 80,
    marginBottom: 30,
  },
  stepImage: {
    width: 200,
    height: 200,
    marginBottom: 30,
    borderRadius: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
  },
  featuresContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  featureBullet: {
    fontSize: 18,
    color: '#8B4513',
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
  },
  previousButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  previousButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: '#8B4513',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelcomeWizard;
