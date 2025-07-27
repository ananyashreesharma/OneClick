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
import DrawingCanvas from './components/DrawingCanvas';
import Svg, { Path } from 'react-native-svg';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Swipeable, GestureHandlerRootView, RectButton } from 'react-native-gesture-handler';
import { TouchableWithoutFeedback } from 'react-native';
import { differenceInCalendarDays, parseISO } from 'date-fns';
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
  const [currentDrawing, setCurrentDrawing] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingCanvasDimensions, setDrawingCanvasDimensions] = useState({ width: 0, height: 0 });
  const drawingCanvasRef = useRef(null);
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
  const [currentPlaybackPosition, setCurrentPlaybackPosition] = useState(0);
  const [voiceNoteDrafts, setVoiceNoteDrafts] = useState([]);
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
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlayback, setAudioPlayback] = useState(null);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const [privateNotes, setPrivateNotes] = useState([]);
  const [privateModalVisible, setPrivateModalVisible] = useState(false);
  const scoopAnimation = useRef(new Animated.Value(0)).current;
  const lockIconScale = useRef(new Animated.Value(1)).current;
  const [scoopingNote, setScoopingNote] = useState(null);
  const [scoopPosition, setScoopPosition] = useState({ x: 0, y: 0 });
  const [privateNotesCount, setPrivateNotesCount] = useState(0);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingObject, setRecordingObject] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordingTitle, setRecordingTitle] = useState('');
  const recordingInterval = useRef(null);

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
    setupAudio();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (playingSound) {
        playingSound.unloadAsync();
      }
    };
  }, [playingSound]);

  // Setup audio permissions
  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.log('Audio setup error:', error);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Use simpler, more compatible recording options
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      setRecordingObject(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordedUri(null); // Clear any previous recording
      
      // Start timer
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.log('Error starting recording:', error);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  // Pause recording
  const pauseRecording = async () => {
    if (!recordingObject || !isRecording) return;
    
    try {
      await recordingObject.pauseAsync();
      setIsPaused(true);
      setIsRecording(false);
      
      // Pause timer
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      
      // Get the current recording URI for playback
      const uri = recordingObject.getURI();
      setRecordedUri(uri);
    } catch (error) {
      console.log('Error pausing recording:', error);
    }
  };

  // Resume recording
  const resumeRecording = async () => {
    if (!recordingObject || !isPaused) return;
    
    try {
      await recordingObject.startAsync();
      setIsPaused(false);
      setIsRecording(true);
      
      // Resume timer
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.log('Error resuming recording:', error);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (!recordingObject) return;
    
    // Check minimum recording duration
    if (recordingDuration < 1) {
      Alert.alert('Recording Too Short', 'Please record for at least 1 second.');
      return;
    }
    
    try {
      // Stop the recording
      await recordingObject.stopAndUnloadAsync();
      const uri = recordingObject.getURI();
      
      // Verify the file exists and is valid
      if (uri) {
        console.log('Recording stopped, URI:', uri);
        setRecordedUri(uri);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingObject(null);
        
        // Stop timer
        if (recordingInterval.current) {
          clearInterval(recordingInterval.current);
          recordingInterval.current = null;
        }
      } else {
        throw new Error('No recording URI received');
      }
    } catch (error) {
      console.log('Error stopping recording:', error);
      Alert.alert('Error', 'Could not save recording. Please try again.');
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play voice note with retry mechanism
  const playVoiceNote = async (voiceNote, noteId, retryCount = 0) => {
    try {
      console.log('Attempting to play voice note:', voiceNote, 'Retry:', retryCount);
      
      // Stop any currently playing audio
      if (playingSound) {
        await playingSound.unloadAsync();
        setPlayingSound(null);
        setPlayingNoteId(null);
        setIsPlaying(false);
      }

      // Ensure we have a valid URI
      if (!voiceNote.uri) {
        console.log('No URI found in voice note:', voiceNote);
        Alert.alert('Error', 'Voice note file not found');
        return;
      }

      // Check if the file exists (basic validation)
      if (!voiceNote.uri.startsWith('file://') && !voiceNote.uri.startsWith('http')) {
        console.log('Invalid URI format:', voiceNote.uri);
        Alert.alert('Error', 'Invalid voice note file');
        return;
      }

      // Create and load the new audio with error handling
      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceNote.uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setCurrentPlaybackPosition(status.positionMillis / 1000);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlayingNoteId(null);
              setCurrentPlaybackPosition(0);
            }
          } else if (status.error) {
            console.log('Playback error:', status.error);
            setIsPlaying(false);
            setPlayingNoteId(null);
            
            // Retry once if it's the first attempt
            if (retryCount === 0) {
              console.log('Retrying playback...');
              setTimeout(() => {
                playVoiceNote(voiceNote, noteId, 1);
              }, 1000);
            } else {
              Alert.alert('Playback Error', 'Could not play this voice note. The file may be corrupted.');
            }
          }
        }
      );

      setPlayingSound(sound);
      setPlayingNoteId(noteId);
      setIsPlaying(true);
      console.log('Voice note started playing successfully');
    } catch (error) {
      console.log('Error playing voice note:', error);
      
      // Retry once if it's the first attempt
      if (retryCount === 0) {
        console.log('Retrying playback after error...');
        setTimeout(() => {
          playVoiceNote(voiceNote, noteId, 1);
        }, 1000);
      } else {
        Alert.alert('Error', 'Could not play voice note. Please try recording again.');
      }
    }
  };

  // Pause voice note
  const pauseVoiceNote = async () => {
    if (playingSound && isPlaying) {
      await playingSound.pauseAsync();
      setIsPlaying(false);
    }
  };

  // Resume voice note
  const resumeVoiceNote = async () => {
    if (playingSound && !isPlaying) {
      await playingSound.playAsync();
      setIsPlaying(true);
    }
  };

  // Stop voice note
  const stopVoiceNote = async () => {
    if (playingSound) {
      await playingSound.unloadAsync();
      setPlayingSound(null);
      setPlayingNoteId(null);
      setIsPlaying(false);
      setCurrentPlaybackPosition(0);
    }
  };

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
    
    console.log('addThought called with:', newThought);
    
    const thought = {
      id: newThought.id || generateUniqueId(),
      timestamp: newThought.timestamp || new Date().toISOString(),
      text: newThought.text || '',
      drawingPaths: newThought.drawingData || [],
      drawingDimensions: newThought.drawingDimensions || { width: 300, height: 200 },
      voiceNotes: newThought.voiceNotes || [],
      mood: newThought.mood || currentMood,
    };

    console.log('Created thought object:', thought);
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
    if (currentDrawing && currentDrawing.length > 0) {
      addThought({ 
        drawingData: currentDrawing,
        drawingDimensions: drawingCanvasDimensions
      });
    }
    setIsDrawing(false);
    setCurrentDrawing([]);
    setDrawingCanvasDimensions({ width: 0, height: 0 });
  };

  const handleStartRecording = () => {
    setAudioModalVisible(true);
    setLastInputMode('recording');
  };

  const handleLockPress = () => {
    setPrivateModalVisible(true);
  };

  const handleScoopNote = (note, notePosition) => {
    // Calculate the exact position of the lock icon (top-right corner)
    const lockIconPosition = { x: width - 80, y: 60 };
    
    // Set the note to be scooped and its starting position
    setScoopingNote(note);
    setScoopPosition(notePosition);
    
    // Start the scooping animation
    scoopAnimation.setValue(0);
    lockIconScale.setValue(1);
    
    // Create parallel animations for note flying and lock icon swallowing
    Animated.parallel([
      Animated.timing(scoopAnimation, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      // Lock icon scales up when note gets close, then back to normal
      Animated.sequence([
        Animated.delay(800), // Wait for note to get close
        Animated.timing(lockIconScale, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(lockIconScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Animation completed - move note to private notes
      const updatedPrivateNotes = [note, ...privateNotes];
      setPrivateNotes(updatedPrivateNotes);
      setPrivateNotesCount(updatedPrivateNotes.length);
      savePrivateNotes(updatedPrivateNotes);
      
      // Remove from main thoughts
      const updatedThoughts = thoughts.filter(t => t.id !== note.id);
      setThoughts(updatedThoughts);
      saveThoughts(updatedThoughts);
      
      // Reset scooping state
      setScoopingNote(null);
      scoopAnimation.setValue(0);
      lockIconScale.setValue(1);
    });
  };

  const loadPrivateNotes = async () => {
    try {
      const savedPrivateNotes = await AsyncStorage.getItem('privateNotes');
      if (savedPrivateNotes) {
        const parsedPrivateNotes = JSON.parse(savedPrivateNotes);
        const cleanedPrivateNotes = dedupeNotes(parsedPrivateNotes);
        setPrivateNotes(cleanedPrivateNotes);
        setPrivateNotesCount(cleanedPrivateNotes.length);
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
        
        {/* Scooping Animation Overlay */}
        {scoopingNote && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                left: scoopPosition.x,
                top: scoopPosition.y,
                transform: [
                  {
                    translateX: scoopAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, (width - 80 - scoopPosition.x) * 0.5, width - 80 - scoopPosition.x], // Fly to lock icon
                    }),
                  },
                  {
                    translateY: scoopAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, -100, 60 - scoopPosition.y], // Arc up then down to lock icon
                    }),
                  },
                  {
                    scale: scoopAnimation.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [1, 0.6, 0.2], // Shrink as it gets closer
                    }),
                  },
                  {
                    rotate: scoopAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: ['0deg', '180deg', '360deg'], // Spin as it flies
                    }),
                  },
                ],
                opacity: scoopAnimation.interpolate({
                  inputRange: [0, 0.8, 1],
                  outputRange: [1, 0.9, 0],
                }),
              }}
            >
              <View style={styles.scoopingNoteCard}>
                <Text style={styles.scoopingNoteText} numberOfLines={2}>
                  {scoopingNote.text || 'Note'}
                </Text>
                {scoopingNote.drawingPaths && scoopingNote.drawingPaths.length > 0 && (
                  <View style={styles.scoopingDrawing}>
                    <Svg 
                      style={{ width: 40, height: 30 }} 
                      viewBox={`0 0 ${scoopingNote.drawingDimensions?.width || 300} ${scoopingNote.drawingDimensions?.height || 200}`}
                    >
                      {scoopingNote.drawingPaths.slice(0, 3).map((path, pathIndex) => (
                        <Path 
                          key={pathIndex} 
                          d={path} 
                          stroke="#222" 
                          strokeWidth={1} 
                          fill="none" 
                        />
                      ))}
                    </Svg>
                  </View>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        )}
        
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 }}>
          <View style={{ width: 32 }} />
          <Text style={{ fontSize: 22, fontWeight: 'bold', textAlign: 'center', flex: 1, fontFamily: 'Georgia' }}>Lao Note</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity style={{ marginRight: 8 }} onPress={() => Alert.alert('Search', 'Search functionality will be added back soon!')}>
              <Feather name="search" size={24} color="#222" />
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: lockIconScale }] }}>
              <TouchableOpacity onPress={handleLockPress} style={{ position: 'relative' }}>
                <MaterialCommunityIcons name="lock-outline" size={26} color="#222" />
                {privateNotesCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    backgroundColor: '#ff4444',
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}>
                      {privateNotesCount > 99 ? '99+' : privateNotesCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
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
              thoughts.map((thought, index) => {
                console.log('Rendering thought:', thought);
                return (
                  <Swipeable
                    key={thought.id || index}
                    renderRightActions={() => (
                      <View style={styles.swipeRightActions}>
                        <TouchableOpacity
                          style={[styles.swipeAction, styles.pinAction]}
                          onPress={() => {
                            const updatedThoughts = thoughts.map(t => 
                              t.id === thought.id ? { ...t, isPinned: !t.isPinned } : t
                            );
                            setThoughts(updatedThoughts);
                            saveThoughts(updatedThoughts);
                          }}
                        >
                          <Feather 
                            name={thought.isPinned ? "unlock" : "lock"} 
                            size={20} 
                            color="#fff" 
                          />
                          <Text style={styles.swipeActionText}>
                            {thought.isPinned ? "Unpin" : "Pin"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.swipeAction, styles.hideAction]}
                          onPress={() => {
                            // Calculate the note's position in the stream
                            const notePosition = { x: 20, y: 100 + (index * 200) }; // Approximate position based on index
                            handleScoopNote(thought, notePosition);
                          }}
                        >
                          <Feather name="eye-off" size={20} color="#fff" />
                          <Text style={styles.swipeActionText}>Hide</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    renderLeftActions={() => (
                      <View style={styles.swipeLeftActions}>
                        <TouchableOpacity
                          style={[styles.swipeAction, styles.deleteAction]}
                          onPress={() => {
                            Alert.alert(
                              "Delete Note",
                              "Are you sure you want to delete this note?",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () => {
                                    const updatedThoughts = thoughts.filter(t => t.id !== thought.id);
                                    setThoughts(updatedThoughts);
                                    saveThoughts(updatedThoughts);
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Feather name="trash-2" size={20} color="#fff" />
                          <Text style={styles.swipeActionText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    rightThreshold={70}
                    leftThreshold={70}
                  >
                                        <View style={styles.noteCard}>
                      {thought.isPinned && (
                        <View style={styles.pinnedIndicator}>
                          <Feather name="lock" size={12} color={KINDLE_ACCENT} />
                          <Text style={styles.pinnedText}>Pinned</Text>
                        </View>
                      )}
                      <Text style={styles.noteText}>{thought.text}</Text>
                    {thought.drawingPaths && thought.drawingPaths.length > 0 && (
                      <View style={styles.drawingDisplay}>
                        <Svg 
                          style={[
                            styles.drawingSvg, 
                            { 
                              width: '100%',
                              height: thought.drawingDimensions ? 
                                (thought.drawingDimensions.height / thought.drawingDimensions.width) * (width - 64) : 150
                            }
                          ]} 
                          viewBox={`0 0 ${thought.drawingDimensions?.width || 300} ${thought.drawingDimensions?.height || 200}`}
                        >
                          {thought.drawingPaths.map((path, pathIndex) => (
                            <Path 
                              key={pathIndex} 
                              d={path} 
                              stroke="#222" 
                              strokeWidth={2} 
                              fill="none" 
                            />
                          ))}
                        </Svg>
                      </View>
                    )}
                                      {thought.voiceNotes && thought.voiceNotes.length > 0 && (
                    <View style={styles.voiceNoteActions}>
                      <TouchableOpacity
                        style={styles.actionButtonSmall}
                        onPress={() => {
                          const voiceNote = thought.voiceNotes[0];
                          console.log('Playing voice note:', voiceNote);
                          if (playingNoteId === thought.id) {
                            if (isPlaying) {
                              pauseVoiceNote();
                            } else {
                              resumeVoiceNote();
                            }
                          } else {
                            playVoiceNote(voiceNote, thought.id);
                          }
                        }}
                      >
                        <Feather 
                          name={playingNoteId === thought.id && isPlaying ? "pause" : "play"} 
                          size={14} 
                          color="#fff" 
                        />
                        <Text style={styles.actionButtonTextSmall}>
                          {playingNoteId === thought.id && isPlaying ? "Pause" : "Play"}
                        </Text>
                      </TouchableOpacity>
                      

                      
                      {playingNoteId === thought.id && (
                        <View style={styles.playbackProgress}>
                          <View style={styles.progressBar}>
                            <View 
                              style={[
                                styles.progressFill, 
                                { 
                                  width: `${(currentPlaybackPosition / (thought.voiceNotes[0].duration / 1000)) * 100}%` 
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.playbackPosition}>
                            {formatDuration(currentPlaybackPosition)} / {formatDuration(Math.floor(thought.voiceNotes[0].duration / 1000))}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Text style={styles.noteTime}>{new Date(thought.timestamp).toLocaleString()}</Text>
                </View>
                  </Swipeable>
              );
            })
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
            {/* Header */}
            <View style={styles.drawingHeader}>
              <TouchableOpacity onPress={() => setIsDrawing(false)} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.drawingTitle}>Drawing</Text>
              <View style={styles.drawingHeaderActions}>
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => {
                    if (drawingCanvasRef.current) {
                      drawingCanvasRef.current.clear();
                      setCurrentDrawing([]);
                    }
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDoneDrawing} style={styles.headerButton}>
                  <Text style={styles.headerButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Drawing Canvas */}
            <View style={styles.drawingContainer}>
              <DrawingCanvas
                ref={drawingCanvasRef}
                style={styles.drawingCanvas}
                initialPaths={currentDrawing}
                onDrawingChange={setCurrentDrawing}
                onCanvasLayout={setDrawingCanvasDimensions}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* Voice Recording Modal - iPhone Style */}
        <Modal visible={audioModalVisible} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={styles.fullScreenModal}>
            {/* Header */}
            <View style={styles.voiceHeader}>
              <TouchableOpacity onPress={() => setAudioModalVisible(false)} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.voiceTitle}>Voice Memo</Text>
              <TouchableOpacity style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.voiceContent}>
              {/* Waveform Display */}
              <View style={styles.waveformContainer}>
                {isRecording ? (
                  // Animated waveform during recording
                  <View style={styles.waveform}>
                    {[...Array(50)].map((_, i) => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.waveformBar,
                          {
                            height: Math.random() * 60 + 20,
                            backgroundColor: KINDLE_ACCENT,
                          }
                        ]}
                      />
                    ))}
                  </View>
                ) : recordedUri ? (
                  // Static waveform for recorded audio
                  <View style={styles.waveform}>
                    {[...Array(50)].map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.waveformBar,
                          {
                            height: Math.random() * 40 + 15,
                            backgroundColor: KINDLE_ACCENT,
                          }
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  // Empty state
                  <View style={styles.emptyWaveform}>
                    <Feather name="mic" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Tap the record button to start</Text>
                  </View>
                )}
              </View>

              {/* Timer */}
              <Text style={styles.timerText}>
                {formatDuration(recordingDuration)}
              </Text>

              {/* Main Control Button */}
              <TouchableOpacity
                style={[
                  styles.mainControlButton,
                  isRecording && styles.recordingButton,
                  isPaused && styles.pausedButton,
                  recordedUri && styles.playButton
                ]}
                onPress={() => {
                  if (isRecording) {
                    // Auto-save when recording is in progress
                    stopRecording();
                  } else if (isPaused) {
                    // If paused and we have a recording, play it first
                    if (recordedUri) {
                      playVoiceNote({ uri: recordedUri, duration: recordingDuration * 1000 }, 'temp');
                    } else {
                      resumeRecording();
                    }
                  } else if (recordedUri) {
                    // Play the recorded audio
                    playVoiceNote({ uri: recordedUri, duration: recordingDuration * 1000 }, 'temp');
                  } else {
                    startRecording();
                  }
                }}
              >
                <Text style={styles.mainControlButtonText}>
                  {isRecording ? "Save Recording" : isPaused ? "Play What I Recorded" : recordedUri ? "Play Recording" : "Start Recording"}
                </Text>
              </TouchableOpacity>

              {/* Pause Button (only show when recording) */}
              {isRecording && (
                <TouchableOpacity
                  style={styles.pauseButton}
                  onPress={pauseRecording}
                >
                  <Text style={styles.pauseButtonText}>Pause Recording</Text>
                </TouchableOpacity>
              )}

              {/* Resume Button (only show when paused) */}
              {isPaused && (
                <TouchableOpacity
                  style={styles.resumeButton}
                  onPress={resumeRecording}
                >
                  <Text style={styles.resumeButtonText}>Continue Recording</Text>
                </TouchableOpacity>
              )}

                              {/* Action Buttons */}
                {(recordedUri || isRecording || isPaused) && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                                        const newThought = {
                    text: recordingTitle || 'Voice note',
                    voiceNotes: [{
                      uri: recordedUri,
                      duration: recordingDuration * 1000,
                      timestamp: new Date().toISOString(),
                      id: Date.now().toString()
                    }],
                    timestamp: new Date().toISOString(),
                    id: Date.now().toString()
                  };
                  console.log('Saving voice note thought:', newThought);
                  addThought(newThought);
                      setAudioModalVisible(false);
                      setRecordedUri(null);
                      setRecordingTitle('');
                      setRecordingDuration(0);
                    }}
                  >
                                            <Text style={styles.actionButtonText}>
                          {isRecording ? "Save Now" : "Save to Notes"}
                        </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={() => {
                      setRecordedUri(null);
                      setRecordingTitle('');
                      setRecordingDuration(0);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  // Voice recording styles - iPhone style
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: KINDLE_BORDER,
    backgroundColor: KINDLE_BG,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 17,
    color: KINDLE_ACCENT,
    fontWeight: '500',
  },
  voiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: KINDLE_TEXT,
    fontFamily: 'Georgia',
  },
  voiceContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  waveformContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 120,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
    marginHorizontal: 1,
  },
  emptyWaveform: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontFamily: 'Georgia',
  },
  timerText: {
    fontSize: 32,
    fontWeight: '300',
    color: KINDLE_TEXT,
    fontFamily: 'Georgia',
    marginBottom: 60,
  },
  mainControlButton: {
    backgroundColor: KINDLE_ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 200,
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#28a745',
  },
  pausedButton: {
    backgroundColor: '#ffc107',
  },
  playButton: {
    backgroundColor: '#28a745',
  },
  mainControlButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  pauseButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  resumeButton: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: KINDLE_ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: KINDLE_ACCENT,
  },
  secondaryButtonText: {
    color: KINDLE_ACCENT,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Georgia',
  },
  voiceNoteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  voiceNoteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  actionButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: KINDLE_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#28a745',
  },
  actionButtonTextSmall: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  playbackPosition: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  playbackProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: KINDLE_ACCENT,
    borderRadius: 2,
  },
  // Drawing styles
  drawingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: KINDLE_BORDER,
    backgroundColor: KINDLE_BG,
  },
  drawingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: KINDLE_TEXT,
    fontFamily: 'Georgia',
  },
  drawingHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  drawingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  drawingCanvas: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawingDisplay: {
    marginTop: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  drawingSvg: {
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  // Swipe action styles
  swipeRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '70%',
  },
  swipeLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '70%',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    marginHorizontal: 4,
  },
  pinAction: {
    backgroundColor: '#007bff',
  },
  hideAction: {
    backgroundColor: '#6c757d',
  },
  deleteAction: {
    backgroundColor: '#dc3545',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 10,
    color: KINDLE_ACCENT,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Scooping animation styles
  scoopingNoteCard: {
    backgroundColor: KINDLE_CARD,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 80,
    maxWidth: 120,
  },
  scoopingNoteText: {
    fontSize: 10,
    color: KINDLE_TEXT,
    fontWeight: '500',
    marginBottom: 4,
  },
  scoopingDrawing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
