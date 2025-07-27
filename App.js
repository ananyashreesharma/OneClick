// this is the main app file for the notes app
// here you can type, draw, record voice, and add a mood to your note
// all your notes show up in a stream, newest first

import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Alert,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons, Feather, FontAwesome } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Swipeable, GestureHandlerRootView, RectButton } from 'react-native-gesture-handler';
import { TouchableWithoutFeedback } from 'react-native';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

const { width, height } = Dimensions.get('window');

// Constants
const KINDLE_BG = '#f7efe7';
const KINDLE_CARD = '#fff';
const KINDLE_BORDER = '#e0d5c7';
const KINDLE_TEXT = '#2c2c2c';
const KINDLE_ACCENT = '#8B4513';
const DRAWING_CANVAS_WIDTH = width - 30;
const SWIPE_ACTION_WIDTH = 120;
const CARD_HEIGHT = 120;

export default function App() {
  const [thoughts, setThoughts] = useState([]);
  const [currentThought, setCurrentThought] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMood, setCurrentMood] = useState(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const svgCaptureRef = useRef();
  const [drawingImageUri, setDrawingImageUri] = useState(null);
  const [isDrawingFullscreen, setIsDrawingFullscreen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [floatingDate, setFloatingDate] = useState('');
  const [showFloatingDate, setShowFloatingDate] = useState(false);
  const floatingDateOpacity = useRef(new Animated.Value(0)).current;
  const floatingDateTimeout = useRef(null);
  const [playingSound, setPlayingSound] = useState(null);
  const [playingNoteId, setPlayingNoteId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceNoteDrafts, setVoiceNoteDrafts] = useState([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingInterval = useRef(null);
  const [photoDrafts, setPhotoDrafts] = useState([]);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [pinnedNotes, setPinnedNotes] = useState([]);
  const [archivedNotes, setArchivedNotes] = useState([]);
  const [showMetadata, setShowMetadata] = useState({});
  const [toast, setToast] = useState(null);
  let toastTimeout = useRef(null);
  const [showArchived, setShowArchived] = useState(false);
  const [exportSvgProps, setExportSvgProps] = useState(null);
  const exportSvgRef = useRef();
  const [lastInputMode, setLastInputMode] = useState('text');
  const [drawingData, setDrawingData] = useState([]);
  const [noteTypeFilter, setNoteTypeFilter] = useState('all');
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [audioStatus, setAudioStatus] = useState('idle');
  const [recordingObj, setRecordingObj] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlayback, setAudioPlayback] = useState(null);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const [privateNotes, setPrivateNotes] = useState([]);
  const [privateModalVisible, setPrivateModalVisible] = useState(false);
  const scoopAnimation = useRef(new Animated.Value(0)).current;
  const [scoopingNote, setScoopingNote] = useState(null);
  const [scoopPosition, setScoopPosition] = useState({ x: 0, y: 0 });

  const moods = [
    { emoji: '😊', name: 'happy', color: '#FFE5B4' },
    { emoji: '😢', name: 'sad', color: '#E3F2FD' },
    { emoji: '🔥', name: 'excited', color: '#FFEBEE' },
    { emoji: '😴', name: 'tired', color: '#F3E5F5' },
    { emoji: '💡', name: 'inspired', color: '#E8F5E8' },
    { emoji: '😤', name: 'frustrated', color: '#FFF3E0' },
  ];

  const drawingRef = useRef();

  // Load thoughts on app start
  useEffect(() => {
    loadThoughts();
    loadPrivateNotes();
    loadPinnedNotes();
  }, []);

  const loadThoughts = async () => {
    try {
      const savedThoughts = await AsyncStorage.getItem('thoughts');
      if (savedThoughts) {
        const parsedThoughts = JSON.parse(savedThoughts);
        const cleanedThoughts = dedupeNotes(parsedThoughts);
        setThoughts(cleanedThoughts);
        if (cleanedThoughts.length !== parsedThoughts.length) {
          await saveThoughts(cleanedThoughts);
        }
      }
    } catch (error) {
      console.log('Error loading thoughts:', error);
    }
  };

  const saveThoughts = async (newThoughts) => {
    try {
      await AsyncStorage.setItem('thoughts', JSON.stringify(newThoughts));
    } catch (error) {
      console.log('Error saving thoughts:', error);
    }
  };

  function generateUniqueId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  const addThought = async (newThought) => {
    if (!newThought) return;
    
    const thought = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      text: newThought.text || '',
      drawingPaths: newThought.drawingData || [],
      voiceNotes: newThought.voiceNotes || [],
      mood: currentMood,
    };

    const updatedThoughts = [thought, ...thoughts];
    setThoughts(updatedThoughts);
    await saveThoughts(updatedThoughts);
    
    setCurrentThought('');
    setCurrentMood(null);
    setDrawingData([]);
  };

  function dedupeNotes(notes) {
    if (!notes || !Array.isArray(notes)) return [];
    const seen = new Set();
    return notes.filter(note => {
      if (!note || !note.id) return false;
      if (seen.has(note.id)) return false;
      seen.add(note.id);
      return true;
    });
  }

  const handleStartTyping = () => {
    setIsTyping(true);
    setCurrentThought('');
  };

  const handleDoneTyping = () => {
    if (currentThought.trim()) {
      addThought({ text: currentThought.trim() });
    }
    setIsTyping(false);
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setLastInputMode('drawing');
  };

  const handleDoneDrawing = () => {
    if (drawingData && drawingData.length > 0) {
      addThought({ drawingData: drawingData });
    }
    setIsDrawing(false);
  };

  const handleStartRecording = () => {
    setAudioModalVisible(true);
    setLastInputMode('recording');
  };

  const handleLockPress = () => {
    setPrivateModalVisible(true);
  };

  const loadPrivateNotes = async () => {
    try {
      const savedPrivateNotes = await AsyncStorage.getItem('privateNotes');
      if (savedPrivateNotes) {
        const parsedPrivateNotes = JSON.parse(savedPrivateNotes);
        const cleanedPrivateNotes = dedupeNotes(parsedPrivateNotes);
        setPrivateNotes(cleanedPrivateNotes);
        if (cleanedPrivateNotes.length !== parsedPrivateNotes.length) {
          await savePrivateNotes(cleanedPrivateNotes);
        }
      }
    } catch (error) {
      console.log('Error loading private notes:', error);
    }
  };

  const savePrivateNotes = async (notes) => {
    try {
      await AsyncStorage.setItem('privateNotes', JSON.stringify(notes));
    } catch (error) {
      console.log('Error saving private notes:', error);
    }
  };

  const loadPinnedNotes = async () => {
    try {
      const savedPinnedNotes = await AsyncStorage.getItem('pinnedNotes');
      if (savedPinnedNotes) {
        const parsedPinnedNotes = JSON.parse(savedPinnedNotes);
        const cleanedPinnedNotes = dedupeNotes(parsedPinnedNotes);
        setPinnedNotes(cleanedPinnedNotes);
        if (cleanedPinnedNotes.length !== parsedPinnedNotes.length) {
          await savePinnedNotes(cleanedPinnedNotes);
        }
      }
    } catch (error) {
      console.log('Error loading pinned notes:', error);
    }
  };

  const savePinnedNotes = async (notes) => {
    try {
      await AsyncStorage.setItem('pinnedNotes', JSON.stringify(notes));
    } catch (error) {
      console.log('Error saving pinned notes:', error);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 }}>
          <View style={{ width: 32 }} />
          <Text style={{ fontSize: 22, fontWeight: 'bold', textAlign: 'center', flex: 1, fontFamily: 'Georgia' }}>Lao Note</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity style={{ marginRight: 8 }} onPress={() => Alert.alert('Search', 'Search functionality will be added back soon!')}>
              <Feather name="search" size={24} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLockPress}>
              <MaterialCommunityIcons name="lock-outline" size={26} color="#222" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented control */}
        <View style={{ flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 4, justifyContent: 'center' }}>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={handleStartTyping}
          >
            <View style={{ backgroundColor: '#222', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 18 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Write</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={handleStartRecording}
          >
            <View style={{ backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 18 }}>
              <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 16 }}>Record</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={handleStartDrawing}
          >
            <View style={{ backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 18 }}>
              <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 16 }}>Draw</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Notes list */}
        {!(isTyping || isDrawing) && (
          <ScrollView style={{ flex: 1, backgroundColor: '#f7efe7' }} contentContainerStyle={{ padding: 16 }}>
            {thoughts.length === 0 ? (
              <Text style={{ padding: 20, textAlign: 'center', color: '#666' }}>Your notes will appear here</Text>
            ) : (
              thoughts.map((thought, index) => (
                <View key={thought.id || index} style={styles.noteCard}>
                  <Text style={styles.noteText}>{thought.text}</Text>
                  <Text style={styles.noteTime}>{new Date(thought.timestamp).toLocaleString()}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Write modal */}
        <Modal visible={isTyping} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={styles.fullScreenModal}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
              <TouchableOpacity onPress={handleDoneTyping} style={{ padding: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.fullScreenTextInput}
              placeholder="jot something down..."
              value={currentThought}
              onChangeText={setCurrentThought}
              multiline
              autoFocus
            />
          </SafeAreaView>
        </Modal>

        {/* Drawing modal */}
        <Modal visible={isDrawing} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={styles.fullScreenModal}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
              <TouchableOpacity onPress={handleDoneDrawing} style={{ padding: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', margin: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, color: '#666' }}>Drawing canvas will be added back soon!</Text>
              <TouchableOpacity 
                style={{ marginTop: 20, backgroundColor: '#007bff', padding: 12, borderRadius: 8 }}
                onPress={() => {
                  addThought({ text: 'Drawing note' });
                  setIsDrawing(false);
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>Add Drawing Note</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Audio Recording Modal */}
        <Modal visible={audioModalVisible} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={styles.fullScreenModal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <TouchableOpacity onPress={() => setAudioModalVisible(false)} style={{ padding: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  addThought({ text: 'Voice note' });
                  setAudioModalVisible(false);
                }} 
                style={{ padding: 16 }}
              >
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, color: '#666', marginBottom: 20 }}>🎤 Voice Recording</Text>
              <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', paddingHorizontal: 40 }}>
                Audio recording functionality will be added back soon!
              </Text>
              <TouchableOpacity 
                style={{ marginTop: 30, backgroundColor: '#007bff', padding: 15, borderRadius: 25 }}
                onPress={() => {
                  addThought({ text: 'Voice note' });
                  setAudioModalVisible(false);
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18 }}>Add Voice Note</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Private Notes Modal */}
        <Modal
          visible={privateModalVisible}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <SafeAreaView style={[styles.container, { backgroundColor: '#8B4513' }]}>
            <StatusBar style="light" />
            
            <View style={[styles.header, { backgroundColor: '#8B4513' }]}>
              <TouchableOpacity onPress={() => setPrivateModalVisible(false)} style={styles.headerButton}>
                <Feather name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.title, { color: '#fff' }]}>Private Notes</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerButton}>
                  <Feather name="search" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton}>
                  <MaterialCommunityIcons name="lock" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {privateNotes.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="lock-outline" size={64} color="#fff" style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyStateText, { color: '#fff' }]}>No locked notes yet</Text>
                  <Text style={[styles.emptyStateSubtext, { color: '#fff', opacity: 0.7 }]}>
                    Swipe right on any note and tap "Hide" to lock it here
                  </Text>
                </View>
              ) : (
                <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>Private notes will appear here</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KINDLE_BG,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: KINDLE_BG,
    borderBottomWidth: 1,
    borderBottomColor: KINDLE_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: KINDLE_TEXT,
    fontFamily: 'Georgia',
    textTransform: 'lowercase',
    letterSpacing: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: KINDLE_BG,
  },
  fullScreenTextInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    color: KINDLE_TEXT,
    fontFamily: 'Georgia',
    padding: 20,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  noteTime: {
    fontSize: 12,
    color: '#999',
  },
});
