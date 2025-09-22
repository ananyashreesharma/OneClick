import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

// Import all UX components
import { UndoProvider } from './ErrorTolerance/UndoManager';
import { DraftProvider } from './ErrorTolerance/DraftRecovery';
import { AchievementProvider } from './Feedback/AchievementSystem';
import ConfirmationDialog from './TrustSecurity/ConfirmationDialog';
import ProgressIndicator from './TrustSecurity/ProgressIndicator';
import AutoSaveIndicator from './TrustSecurity/AutoSaveIndicator';
import WelcomeWizard from './Guidance/WelcomeWizard';
import { useTooltip } from './Guidance/ContextualTooltip';
import { 
  SuccessCheckmark, 
  CelebrationAnimation, 
  ProgressSuccess, 
  FloatingSuccessMessage 
} from './Feedback/SuccessAnimations';

// UX Enhancement Context
const UXContext = React.createContext();

export const useUXEnhancements = () => {
  const context = React.useContext(UXContext);
  if (!context) {
    throw new Error('useUXEnhancements must be used within UXEnhancementWrapper');
  }
  return context;
};

// Main UX Enhancement Wrapper
const UXEnhancementWrapper = ({ children }) => {
  // State for various UX features
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationConfig, setConfirmationConfig] = useState({});
  const [showProgress, setShowProgress] = useState(false);
  const [progressConfig, setProgressConfig] = useState({});
  const [showAutoSave, setShowAutoSave] = useState(false);
  const [autoSaveConfig, setAutoSaveConfig] = useState({});
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successConfig, setSuccessConfig] = useState({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationConfig, setCelebrationConfig] = useState({});

  // Tooltip system
  const tooltipSystem = useTooltip();

  // Check if user is new (first time opening app)
  useEffect(() => {
    // This would typically check AsyncStorage or user preferences
    // For now, we'll show the wizard on first load
    const isFirstTime = true; // Replace with actual check
    if (isFirstTime) {
      setShowWelcomeWizard(true);
    }
  }, []);

  // UX Enhancement Functions
  const showConfirmationDialog = (config) => {
    setConfirmationConfig(config);
    setShowConfirmation(true);
  };

  const hideConfirmationDialog = () => {
    setShowConfirmation(false);
    setConfirmationConfig({});
  };

  const showProgressIndicator = (config) => {
    setProgressConfig(config);
    setShowProgress(true);
  };

  const hideProgressIndicator = () => {
    setShowProgress(false);
    setProgressConfig({});
  };

  const showAutoSaveIndicator = (config) => {
    setAutoSaveConfig(config);
    setShowAutoSave(true);
  };

  const hideAutoSaveIndicator = () => {
    setShowAutoSave(false);
    setAutoSaveConfig({});
  };

  const showSuccessAnimation = (config) => {
    setSuccessConfig(config);
    setShowSuccessAnimation(true);
    
    // Auto-hide after animation duration
    setTimeout(() => {
      setShowSuccessAnimation(false);
    }, config.duration || 2000);
  };

  const showCelebrationAnimation = (config) => {
    setCelebrationConfig(config);
    setShowCelebration(true);
    
    // Auto-hide after animation duration
    setTimeout(() => {
      setShowCelebration(false);
    }, config.duration || 2000);
  };

  const showFloatingSuccess = (message, config = {}) => {
    // This would trigger the FloatingSuccessMessage component
    console.log('Floating success:', message, config);
  };

  // Quick action functions for common UX patterns
  const confirmAction = (title, message, onConfirm, type = 'warning') => {
    showConfirmationDialog({
      title,
      message,
      type,
      onConfirm: () => {
        onConfirm();
        hideConfirmationDialog();
      },
      onCancel: hideConfirmationDialog,
    });
  };

  const showLoading = (message = 'Loading...', progress = 0) => {
    showProgressIndicator({
      message,
      progress,
      visible: true,
    });
  };

  const hideLoading = () => {
    hideProgressIndicator();
  };

  const showSaving = () => {
    showAutoSaveIndicator({
      isSaving: true,
      message: 'Saving...',
    });
  };

  const showSaved = (timestamp) => {
    showAutoSaveIndicator({
      isSaving: false,
      lastSaved: timestamp,
      message: 'Saved',
    });
  };

  const showSaveError = () => {
    showAutoSaveIndicator({
      isSaving: false,
      saveError: true,
      message: 'Save failed',
    });
  };

  const celebrateAchievement = (achievement) => {
    showCelebrationAnimation({
      type: 'confetti',
      duration: 3000,
    });
  };

  const showTaskComplete = (message) => {
    showSuccessAnimation({
      message,
      duration: 2000,
    });
  };

  const value = {
    // Confirmation dialogs
    showConfirmationDialog,
    hideConfirmationDialog,
    confirmAction,
    
    // Progress indicators
    showProgressIndicator,
    hideProgressIndicator,
    showLoading,
    hideLoading,
    
    // Auto-save indicators
    showAutoSaveIndicator,
    hideAutoSaveIndicator,
    showSaving,
    showSaved,
    showSaveError,
    
    // Welcome wizard
    showWelcomeWizard,
    setShowWelcomeWizard,
    
    // Success animations
    showSuccessAnimation,
    showCelebrationAnimation,
    showFloatingSuccess,
    celebrateAchievement,
    showTaskComplete,
    
    // Tooltip system
    ...tooltipSystem,
    
    // State
    showConfirmation,
    confirmationConfig,
    showProgress,
    progressConfig,
    showAutoSave,
    autoSaveConfig,
    showSuccessAnimation,
    successConfig,
    showCelebration,
    celebrationConfig,
  };

  return (
    <UXContext.Provider value={value}>
      <UndoProvider>
        <DraftProvider>
          <AchievementProvider>
            {children}
            
            {/* UX Enhancement Overlays */}
            <ConfirmationDialog
              visible={showConfirmation}
              {...confirmationConfig}
            />
            
            <ProgressIndicator
              visible={showProgress}
              {...progressConfig}
            />
            
            <AutoSaveIndicator
              visible={showAutoSave}
              {...autoSaveConfig}
            />
            
            <WelcomeWizard
              visible={showWelcomeWizard}
              onComplete={() => setShowWelcomeWizard(false)}
              onSkip={() => setShowWelcomeWizard(false)}
            />
            
            <SuccessCheckmark
              visible={showSuccessAnimation}
              {...successConfig}
            />
            
            <CelebrationAnimation
              visible={showCelebration}
              {...celebrationConfig}
            />
          </AchievementProvider>
        </DraftProvider>
      </UndoProvider>
    </UXContext.Provider>
  );
};

// Hook for easy access to UX enhancements
export const useUX = () => {
  return useUXEnhancements();
};

// Higher-order component for adding UX enhancements to any component
export const withUXEnhancements = (WrappedComponent) => {
  return (props) => (
    <UXEnhancementWrapper>
      <WrappedComponent {...props} />
    </UXEnhancementWrapper>
  );
};

// Pre-configured UX enhancement components for common use cases
export const UXEnhancements = {
  // Quick confirmation dialogs
  confirmDelete: (itemName, onConfirm) => ({
    title: 'Delete Note',
    message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm,
  }),
  
  confirmClearAll: (onConfirm) => ({
    title: 'Clear All Notes',
    message: 'Are you sure you want to delete all notes? This action cannot be undone.',
    confirmText: 'Clear All',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm,
  }),
  
  confirmLogout: (onConfirm) => ({
    title: 'Sign Out',
    message: 'Are you sure you want to sign out?',
    confirmText: 'Sign Out',
    cancelText: 'Cancel',
    type: 'warning',
    onConfirm,
  }),
  
  // Progress indicators
  savingNote: {
    message: 'Saving note...',
    progress: 0,
    showPercentage: false,
  },
  
  uploadingFile: {
    message: 'Uploading file...',
    progress: 0,
    showPercentage: true,
  },
  
  syncingData: {
    message: 'Syncing data...',
    progress: 0,
    showPercentage: true,
  },
  
  // Success messages
  noteSaved: 'Note saved successfully!',
  noteDeleted: 'Note deleted successfully!',
  noteRestored: 'Note restored successfully!',
  fileUploaded: 'File uploaded successfully!',
  dataSynced: 'Data synced successfully!',
  
  // Celebration types
  firstNote: {
    type: 'confetti',
    duration: 2000,
  },
  
  milestone: {
    type: 'stars',
    duration: 3000,
  },
  
  achievement: {
    type: 'hearts',
    duration: 2500,
  },
};

export default UXEnhancementWrapper;
