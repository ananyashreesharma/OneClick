// UX Enhancement System - Main Export File
// This file provides easy access to all UX enhancement components

// Main Wrapper and Hooks
export { 
  default as UXEnhancementWrapper,
  useUX,
  withUXEnhancements,
  UXEnhancements,
} from './UXEnhancementWrapper';

// Trust & Security Components
export { default as ConfirmationDialog } from './TrustSecurity/ConfirmationDialog';
export { default as ProgressIndicator } from './TrustSecurity/ProgressIndicator';
export { default as AutoSaveIndicator } from './TrustSecurity/AutoSaveIndicator';

// Error Tolerance Components
export { 
  UndoProvider,
  useUndo,
  useUndoActions,
} from './ErrorTolerance/UndoManager';
export { 
  DraftProvider,
  useDraftRecovery,
} from './ErrorTolerance/DraftRecovery';

// Guidance & Onboarding Components
export { default as WelcomeWizard } from './Guidance/WelcomeWizard';
export { 
  default as ContextualTooltip,
  useTooltip,
} from './Guidance/ContextualTooltip';

// Positive Feedback Components
export { 
  SuccessCheckmark,
  CelebrationAnimation,
  ProgressSuccess,
  FloatingSuccessMessage,
} from './Feedback/SuccessAnimations';
export { 
  AchievementProvider,
  useAchievements,
  AchievementBadge,
  AchievementList,
} from './Feedback/AchievementSystem';

// Re-export everything for convenience
export * from './TrustSecurity/ConfirmationDialog';
export * from './TrustSecurity/ProgressIndicator';
export * from './TrustSecurity/AutoSaveIndicator';
export * from './ErrorTolerance/UndoManager';
export * from './ErrorTolerance/DraftRecovery';
export * from './Guidance/WelcomeWizard';
export * from './Guidance/ContextualTooltip';
export * from './Feedback/SuccessAnimations';
export * from './Feedback/AchievementSystem';
