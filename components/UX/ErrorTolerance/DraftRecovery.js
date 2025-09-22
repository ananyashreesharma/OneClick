import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Draft Recovery Context
const DraftContext = createContext();

// Draft Recovery Hook
export const useDraftRecovery = () => {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraftRecovery must be used within a DraftProvider');
  }
  return context;
};

// Draft Provider Component
export const DraftProvider = ({ children }) => {
  const [drafts, setDrafts] = useState([]);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Load drafts on app start
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const savedDrafts = await AsyncStorage.getItem('draft_recovery');
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts);
        // Filter out drafts older than 7 days
        const validDrafts = parsedDrafts.filter(draft => {
          const draftAge = Date.now() - draft.timestamp;
          return draftAge < 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        });
        setDrafts(validDrafts);
        
        // Show recovery modal if there are valid drafts
        if (validDrafts.length > 0) {
          setShowRecoveryModal(true);
        }
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const saveDraft = async (draftData, type = 'note') => {
    try {
      const draft = {
        id: Date.now().toString(),
        type,
        data: draftData,
        timestamp: Date.now(),
        preview: generatePreview(draftData, type),
      };

      const updatedDrafts = [draft, ...drafts.slice(0, 9)]; // Keep last 10 drafts
      setDrafts(updatedDrafts);
      
      await AsyncStorage.setItem('draft_recovery', JSON.stringify(updatedDrafts));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const deleteDraft = async (draftId) => {
    try {
      const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
      setDrafts(updatedDrafts);
      
      await AsyncStorage.setItem('draft_recovery', JSON.stringify(updatedDrafts));
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const clearAllDrafts = async () => {
    try {
      setDrafts([]);
      await AsyncStorage.removeItem('draft_recovery');
    } catch (error) {
      console.error('Error clearing drafts:', error);
    }
  };

  const generatePreview = (data, type) => {
    switch (type) {
      case 'note':
        return data.content?.substring(0, 50) + (data.content?.length > 50 ? '...' : '') || 'Empty note';
      case 'drawing':
        return 'Drawing with ' + (data.strokes?.length || 0) + ' strokes';
      case 'voice':
        return 'Voice note (' + (data.duration || 0) + 's)';
      default:
        return 'Draft content';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const value = {
    drafts,
    saveDraft,
    deleteDraft,
    clearAllDrafts,
    showRecoveryModal,
    setShowRecoveryModal,
    formatTimestamp,
  };

  return (
    <DraftContext.Provider value={value}>
      {children}
      <DraftRecoveryModal />
    </DraftContext.Provider>
  );
};

// Draft Recovery Modal Component
const DraftRecoveryModal = () => {
  const {
    drafts,
    deleteDraft,
    clearAllDrafts,
    showRecoveryModal,
    setShowRecoveryModal,
    formatTimestamp,
  } = useDraftRecovery();

  const [selectedDrafts, setSelectedDrafts] = useState([]);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showRecoveryModal) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
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
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showRecoveryModal]);

  const handleDraftSelect = (draftId) => {
    setSelectedDrafts(prev => 
      prev.includes(draftId) 
        ? prev.filter(id => id !== draftId)
        : [...prev, draftId]
    );
  };

  const handleRecoverSelected = () => {
    // This would typically trigger a callback to the parent component
    // For now, we'll just close the modal
    setShowRecoveryModal(false);
  };

  const handleDeleteSelected = async () => {
    for (const draftId of selectedDrafts) {
      await deleteDraft(draftId);
    }
    setSelectedDrafts([]);
    
    if (drafts.length === selectedDrafts.length) {
      setShowRecoveryModal(false);
    }
  };

  const handleClearAll = async () => {
    await clearAllDrafts();
    setSelectedDrafts([]);
    setShowRecoveryModal(false);
  };

  if (!showRecoveryModal) return null;

  return (
    <Modal
      transparent
      visible={showRecoveryModal}
      animationType="none"
      onRequestClose={() => setShowRecoveryModal(false)}
    >
      <Animated.View
        style={[styles.overlay, { opacity: opacityAnim }]}
      >
        <Animated.View
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Recover Drafts</Text>
            <Text style={styles.subtitle}>
              Found {drafts.length} unsaved draft{drafts.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <ScrollView style={styles.draftsList}>
            {drafts.map((draft) => (
              <DraftItem
                key={draft.id}
                draft={draft}
                isSelected={selectedDrafts.includes(draft.id)}
                onSelect={() => handleDraftSelect(draft.id)}
                onDelete={() => deleteDraft(draft.id)}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleClearAll}
            >
              <Text style={styles.secondaryButtonText}>Clear All</Text>
            </TouchableOpacity>
            
            <View style={styles.primaryButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRecoveryModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.recoverButton,
                  selectedDrafts.length === 0 && styles.disabledButton,
                ]}
                onPress={handleRecoverSelected}
                disabled={selectedDrafts.length === 0}
              >
                <Text style={styles.recoverButtonText}>
                  Recover ({selectedDrafts.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Draft Item Component
const DraftItem = ({ draft, isSelected, onSelect, onDelete, formatTimestamp }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'drawing': return '🎨';
      case 'voice': return '🎤';
      case 'photo': return '📷';
      default: return '📝';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.draftItem, isSelected && styles.selectedDraftItem]}
      onPress={onSelect}
    >
      <View style={styles.draftContent}>
        <Text style={styles.draftIcon}>{getTypeIcon(draft.type)}</Text>
        
        <View style={styles.draftInfo}>
          <Text style={styles.draftPreview}>{draft.preview}</Text>
          <Text style={styles.draftTimestamp}>
            {formatTimestamp(draft.timestamp)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  draftsList: {
    maxHeight: 300,
  },
  draftItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedDraftItem: {
    backgroundColor: '#F5F9FF',
  },
  draftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  draftInfo: {
    flex: 1,
  },
  draftPreview: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  draftTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
  },
  primaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  recoverButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#8B4513',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  recoverButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DraftRecovery;
