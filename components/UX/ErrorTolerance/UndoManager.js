import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// Undo Context
const UndoContext = createContext();

// Undo Action Types
const UNDO_ACTIONS = {
  ADD_ACTION: 'ADD_ACTION',
  REMOVE_ACTION: 'REMOVE_ACTION',
  CLEAR_ACTIONS: 'CLEAR_ACTIONS',
};

// Undo Manager Hook
export const useUndo = () => {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
};

// Undo Reducer
const undoReducer = (state, action) => {
  switch (action.type) {
    case UNDO_ACTIONS.ADD_ACTION:
      return {
        ...state,
        actions: [action.payload, ...state.actions.slice(0, 9)], // Keep last 10 actions
        showUndo: true,
      };
    case UNDO_ACTIONS.REMOVE_ACTION:
      return {
        ...state,
        actions: state.actions.filter(action => action.id !== action.payload),
        showUndo: state.actions.length > 1,
      };
    case UNDO_ACTIONS.CLEAR_ACTIONS:
      return {
        ...state,
        actions: [],
        showUndo: false,
      };
    default:
      return state;
  }
};

// Undo Provider Component
export const UndoProvider = ({ children }) => {
  const [state, dispatch] = useReducer(undoReducer, {
    actions: [],
    showUndo: false,
  });

  const addUndoAction = (action) => {
    const undoAction = {
      id: Date.now().toString(),
      ...action,
      timestamp: Date.now(),
    };
    
    dispatch({ type: UNDO_ACTIONS.ADD_ACTION, payload: undoAction });
  };

  const removeUndoAction = (actionId) => {
    dispatch({ type: UNDO_ACTIONS.REMOVE_ACTION, payload: actionId });
  };

  const clearUndoActions = () => {
    dispatch({ type: UNDO_ACTIONS.CLEAR_ACTIONS });
  };

  const value = {
    actions: state.actions,
    showUndo: state.showUndo,
    addUndoAction,
    removeUndoAction,
    clearUndoActions,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
      <UndoNotification />
    </UndoContext.Provider>
  );
};

// Undo Notification Component
const UndoNotification = () => {
  const { actions, showUndo, removeUndoAction } = useUndo();
  const [visible, setVisible] = React.useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showUndo && actions.length > 0) {
      setVisible(true);
      
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        hideNotification();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      hideNotification();
    }
  }, [showUndo, actions.length]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const handleUndo = () => {
    const latestAction = actions[0];
    if (latestAction && latestAction.undoFunction) {
      latestAction.undoFunction();
      removeUndoAction(latestAction.id);
    }
    hideNotification();
  };

  if (!visible || actions.length === 0) return null;

  const latestAction = actions[0];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.message}>
          {latestAction.message || 'Action completed'}
        </Text>
        
        <TouchableOpacity
          style={styles.undoButton}
          onPress={handleUndo}
        >
          <Text style={styles.undoButtonText}>Undo</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  undoButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  undoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Hook for common undo actions
export const useUndoActions = () => {
  const { addUndoAction } = useUndo();

  const createDeleteUndo = (item, deleteFunction, restoreFunction) => {
    addUndoAction({
      message: `${item.title || 'Item'} deleted`,
      undoFunction: restoreFunction,
      actionType: 'delete',
    });
  };

  const createEditUndo = (item, oldData, restoreFunction) => {
    addUndoAction({
      message: `${item.title || 'Item'} edited`,
      undoFunction: restoreFunction,
      actionType: 'edit',
    });
  };

  const createMoveUndo = (item, oldPosition, restoreFunction) => {
    addUndoAction({
      message: `${item.title || 'Item'} moved`,
      undoFunction: restoreFunction,
      actionType: 'move',
    });
  };

  return {
    createDeleteUndo,
    createEditUndo,
    createMoveUndo,
  };
};

export default UndoManager;
