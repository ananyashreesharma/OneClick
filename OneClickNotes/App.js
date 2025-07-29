// OneClick Notes App with Firebase Authentication
// Seamless multi-mode note-taking with secure user authentication

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
  ActivityIndicator,
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

// Firebase imports
import { auth } from './firebase';
import { onAuthStateChange, logoutUser } from './services/authService';
import { 
  createNote, 
  getUserNotes, 
  updateNote, 
  deleteNote, 
  togglePinNote, 
  searchNotes,
  subscribeToNotes 
} from './services/notesService';
import AuthScreen from './screens/AuthScreen';

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
  // Authentication state
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Notes state
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

  // SuperNote state
  const [superNoteModalVisible, setSuperNoteModalVisible] = useState(false);
  const [superNoteText, setSuperNoteText] = useState('');
  const [superNoteDrawing, setSuperNoteDrawing] = useState([]);
  const [superNoteRecording, setSuperNoteRecording] = useState(null);
  const [superNoteIsRecording, setSuperNoteIsRecording] = useState(false);
  const [superNoteRecordingDuration, setSuperNoteRecordingDuration] = useState(0);
  const [superNoteRecordedUri, setSuperNoteRecordedUri] = useState(null);
  const [superNoteIsPaused, setSuperNoteIsPaused] = useState(false);
  const [superNoteDrawingDimensions, setSuperNoteDrawingDimensions] = useState({ width: 0, height: 0 });
  const superNoteDrawingRef = useRef(null);
  const superNoteRecordingInterval = useRef(null);

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
    setupAudio();
  }, []);

  // Cleanup SuperNote recording interval on unmount
  useEffect(() => {
    return () => {
      if (superNoteRecordingInterval.current) {
        clearInterval(superNoteRecordingInterval.current);
      }
    };
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





  const addThought = async (newThought) => {
    if (!newThought) return;
    
    try {
      const result = await createNote(newThought);
      if (result.success) {
        // Note will be automatically added to thoughts via real-time subscription
        setToast('Note saved! ✨');
        setTimeout(() => setToast(null), 2000);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  };



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



  // SuperNote functions
  const handleSuperNoteStartRecording = async () => {
    try {
      console.log('Starting SuperNote recording...');
      await setupAudio();
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      setSuperNoteRecording(recording);
      setSuperNoteIsRecording(true);
      setSuperNoteRecordingDuration(0);
      setSuperNoteIsPaused(false);
      
      // Start timer
      superNoteRecordingInterval.current = setInterval(() => {
        setSuperNoteRecordingDuration(prev => prev + 1);
      }, 1000);
      console.log('SuperNote recording started successfully');
    } catch (error) {
      console.error('Error starting SuperNote recording:', error);
    }
  };

  const handleSuperNotePauseRecording = async () => {
    try {
      if (superNoteRecording) {
        await superNoteRecording.pauseAsync();
        setSuperNoteIsPaused(true);
        if (superNoteRecordingInterval.current) {
          clearInterval(superNoteRecordingInterval.current);
        }
      }
    } catch (error) {
      console.error('Error pausing SuperNote recording:', error);
    }
  };

  const handleSuperNoteResumeRecording = async () => {
    try {
      if (superNoteRecording) {
        await superNoteRecording.startAsync();
        setSuperNoteIsPaused(false);
        superNoteRecordingInterval.current = setInterval(() => {
          setSuperNoteRecordingDuration(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Error resuming SuperNote recording:', error);
    }
  };

  const handleSuperNoteStopRecording = async () => {
    try {
      console.log('Stopping SuperNote recording...');
      if (superNoteRecording) {
        await superNoteRecording.stopAndUnloadAsync();
        const uri = superNoteRecording.getURI();
        console.log('SuperNote recording stopped, URI:', uri);
        setSuperNoteRecordedUri(uri);
        setSuperNoteIsRecording(false);
        setSuperNoteIsPaused(false);
        if (superNoteRecordingInterval.current) {
          clearInterval(superNoteRecordingInterval.current);
          superNoteRecordingInterval.current = null;
        }
        setSuperNoteRecording(null);
        console.log('SuperNote recording state reset successfully');
      }
    } catch (error) {
      console.error('Error stopping SuperNote recording:', error);
      // Reset state even if there's an error
      setSuperNoteIsRecording(false);
      setSuperNoteIsPaused(false);
      if (superNoteRecordingInterval.current) {
        clearInterval(superNoteRecordingInterval.current);
        superNoteRecordingInterval.current = null;
      }
      setSuperNoteRecording(null);
    }
  };

  const handleSuperNoteSave = async () => {
    if (!superNoteText.trim() && superNoteDrawing.length === 0 && !superNoteRecordedUri) {
      Alert.alert('Empty Note', 'Please add some content before saving.');
      return;
    }

    const superNote = {
      text: superNoteText.trim(),
      drawingPaths: superNoteDrawing,
      drawingDimensions: superNoteDrawingDimensions,
      voiceNotes: superNoteRecordedUri ? [{
        uri: superNoteRecordedUri,
        duration: superNoteRecordingDuration * 1000,
        timestamp: new Date().toISOString()
      }] : [],
      timestamp: new Date().toISOString(),
      originalTimestamp: new Date().toISOString(),
      type: 'supernote',
      isPinned: false,
      pinTimestamp: null
    };

    try {
      const result = await createNote(superNote);
      if (result.success) {
        // Reset SuperNote state
        setSuperNoteText('');
        setSuperNoteDrawing([]);
        setSuperNoteRecording(null);
        setSuperNoteIsRecording(false);
        setSuperNoteRecordingDuration(0);
        setSuperNoteRecordedUri(null);
        setSuperNoteIsPaused(false);
        setSuperNoteDrawingDimensions({ width: 0, height: 0 });
        setSuperNoteModalVisible(false);

        setToast('SuperNote saved! 🚀');
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(() => setToast(null), 2000);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save SuperNote');
    }
  };

  const handleSuperNoteCancel = () => {
    // Stop recording if active
    if (superNoteIsRecording) {
      if (superNoteRecording) {
        superNoteRecording.stopAndUnloadAsync().catch(console.error);
      }
      if (superNoteRecordingInterval.current) {
        clearInterval(superNoteRecordingInterval.current);
        superNoteRecordingInterval.current = null;
      }
    }
    
    // Reset all SuperNote state
    setSuperNoteText('');
    setSuperNoteDrawing([]);
    setSuperNoteRecording(null);
    setSuperNoteIsRecording(false);
    setSuperNoteRecordingDuration(0);
    setSuperNoteRecordedUri(null);
    setSuperNoteIsPaused(false);
    setSuperNoteDrawingDimensions({ width: 0, height: 0 });
    setSuperNoteModalVisible(false);
  };

  const handleSuperNoteDrawingChange = (paths) => {
    setSuperNoteDrawing(paths);
  };

  const handleSuperNoteCanvasLayout = (dimensions) => {
    if (dimensions && dimensions.width && dimensions.height) {
      setSuperNoteDrawingDimensions(dimensions);
    }
  };

  // Function to sort notes: pinned at top, unpinned in chronological order
  const getSortedThoughts = () => {
    const pinnedNotes = thoughts.filter(thought => thought.isPinned);
    const unpinnedNotes = thoughts.filter(thought => !thought.isPinned);
    
    // Sort pinned notes by pin timestamp (most recently pinned first)
    const sortedPinnedNotes = pinnedNotes.sort((a, b) => {
      const aPinTime = a.pinTimestamp || a.timestamp;
      const bPinTime = b.pinTimestamp || b.timestamp;
      return new Date(bPinTime) - new Date(aPinTime);
    });
    
    // Sort unpinned notes by original timestamp (newest first)
    const sortedUnpinnedNotes = unpinnedNotes.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    return [...sortedPinnedNotes, ...sortedUnpinnedNotes];
  };

  // Function to handle pinning/unpinning with position tracking
  const handlePinToggle = async (thoughtId) => {
    try {
      const result = await togglePinNote(thoughtId);
      if (result.success) {
        setToast(`Note ${result.isPinned ? 'pinned' : 'unpinned'}! 📌`);
        setTimeout(() => setToast(null), 2000);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pin/unpin note');
    }
  };

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
      
      if (user) {
        // Load user's notes when authenticated
        loadUserNotes();
        // Subscribe to real-time updates
        subscribeToUserNotes();
      } else {
        // Clear notes when logged out
        setThoughts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load user notes from Firestore
  const loadUserNotes = async () => {
    if (!user) return;
    
    try {
      const result = await getUserNotes();
      if (result.success) {
        setThoughts(result.notes);
      } else {
        console.error('Failed to load notes:', result.error);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  // Subscribe to real-time notes updates
  const subscribeToUserNotes = () => {
    if (!user) return;
    
    const unsubscribe = subscribeToNotes((result) => {
      if (result.success) {
        setThoughts(result.notes);
      }
    });

    return unsubscribe;
  };

  // Handle authentication success
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticating(false);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const result = await logoutUser();
      if (result.success) {
        setUser(null);
        setThoughts([]);
        Alert.alert('Success', 'Logged out successfully');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading OneClick Notes...</Text>
      </View>
    );
  }

  // Show authentication screen
  if (!user) {
    return (
      <AuthScreen onAuthSuccess={handleAuthSuccess} />
    );
  }

  // Rest of your existing App.js code continues here...
  // (All the existing functions and JSX remain the same, just update the data persistence to use Firebase)



  // Continue with all your existing functions and JSX...
  // (The rest of the App.js code remains the same, just update data persistence calls)

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="auto" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header with user info and logout */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>OneClick Notes</Text>
            <Text style={styles.userInfo}>Welcome, {user.displayName || user.email}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {/* Rest of your existing JSX continues here... */}
        {/* (All the existing UI components remain the same) */}

        {/* Toast notification */}
        {toast && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // Add new styles for authentication
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: KINDLE_BG,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: KINDLE_TEXT,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: KINDLE_CARD,
    borderBottomWidth: 1,
    borderBottomColor: KINDLE_BORDER,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: KINDLE_TEXT,
  },
  userInfo: {
    fontSize: 14,
    color: KINDLE_ACCENT,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // ... rest of your existing styles
});
