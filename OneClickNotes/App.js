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
  Alert,
  Dimensions,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  FlatList,
  Animated,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawingCanvas from './components/DrawingCanvas';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Swipeable, GestureHandlerRootView, RectButton } from 'react-native-gesture-handler';
import { TouchableWithoutFeedback } from 'react-native';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { MaterialCommunityIcons, Feather, FontAwesome } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';

// get the width and height of the screen
const { width, height } = Dimensions.get('window');

// Define a constant for the drawing canvas size
const DRAWING_CANVAS_WIDTH = Dimensions.get('window').width - 60;
const DRAWING_CANVAS_HEIGHT = 200;
// Add constants for fullscreen canvas size
const FULLSCREEN_CANVAS_WIDTH = Dimensions.get('window').width;
const FULLSCREEN_CANVAS_HEIGHT = Dimensions.get('window').height - (Platform.OS === 'ios' ? 90 : 60);

// kindle-like, paper-minimal style changes
const KINDLE_BG = '#f5f5e6'; // soft, warm off-white
const KINDLE_TEXT = '#333'; // dark gray for text
const KINDLE_CARD = '#fafaf3'; // slightly lighter for cards
const KINDLE_BORDER = '#e0e0d6'; // subtle border
const KINDLE_ACCENT = '#bdbdb2'; // for underlines, etc.
const KINDLE_GREEN = '#b6c7a8'; // soft green for add button

// Add swipe width constants
const CARD_WIDTH = Dimensions.get('window').width - 32;
const SWIPE_ACTION_WIDTH = CARD_WIDTH * 0.7;

// Get card border radius and height from styles
const CARD_BORDER_RADIUS = 12; // or styles.card.borderRadius if defined
const CARD_HEIGHT = 120; // or whatever your card height is, or calculate dynamically if needed

// this is the main app function
export default function App() {
  // these are all the things we keep track of
  // thoughts is the list of all notes
  const [thoughts, setThoughts] = useState([]);
  // currentThought is what you are typing right now
  const [currentThought, setCurrentThought] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // recording is the audio object when you are recording
  const [recording, setRecording] = useState(null);
  // isRecording is true when you are recording
  const [isRecording, setIsRecording] = useState(false);
  // currentDrawing is the drawing you are making right now
  const [currentDrawing, setCurrentDrawing] = useState([]);
  // isDrawing is true when the drawing area is open
  const [isDrawing, setIsDrawing] = useState(false);
  // currentMood is the mood you picked for this note
  const [currentMood, setCurrentMood] = useState(null);
  // showMoodPicker is true when the mood picker is open
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  // Ref for the hidden SVG view
  const svgCaptureRef = useRef();
  // State to hold the PNG URI
  const [drawingImageUri, setDrawingImageUri] = useState(null);
  // Add state for fullscreen drawing
  const [isDrawingFullscreen, setIsDrawingFullscreen] = useState(false);
  // Add state to track expanded notes
  const [expandedNotes, setExpandedNotes] = useState({});
  // Add state for floating date label
  const [floatingDate, setFloatingDate] = useState('');
  const [showFloatingDate, setShowFloatingDate] = useState(false);
  const floatingDateOpacity = useRef(new Animated.Value(0)).current;
  const floatingDateTimeout = useRef(null);
  // Add state for currently playing sound
  const [playingSound, setPlayingSound] = useState(null);
  const [playingNoteId, setPlayingNoteId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // Add state for current voice note drafts
  const [voiceNoteDrafts, setVoiceNoteDrafts] = useState([]);
  // Add state for recording timer
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingInterval = useRef(null);
  // Add state for photo drafts
  const [photoDrafts, setPhotoDrafts] = useState([]);
  // Add state for fullscreen photo viewer
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  // Add state for pinned and archived notes
  const [pinnedNotes, setPinnedNotes] = useState([]);
  const [archivedNotes, setArchivedNotes] = useState([]);
  const [showMetadata, setShowMetadata] = useState({});
  const [toast, setToast] = useState(null);
  let toastTimeout = useRef(null);
  // Add state for showing archived modal
  const [showArchived, setShowArchived] = useState(false);
  // Add state and ref for export SVG
  const [exportSvgProps, setExportSvgProps] = useState(null);
  const exportSvgRef = useRef();
  // Add state for last used input mode
  const [lastInputMode, setLastInputMode] = useState('text'); // 'text', 'drawing', 'recording'
  // Add drawingData state to persist the drawing
  const [drawingData, setDrawingData] = useState([]);
  // Add state for note type filter
  const [noteTypeFilter, setNoteTypeFilter] = useState('all');
  // Add state for dropdown modal
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  // Add state for search modal and query
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- AUDIO MODAL STATE ---
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [audioStatus, setAudioStatus] = useState('idle'); // 'idle' | 'recording' | 'paused' | 'stopped'
  const [recordingObj, setRecordingObj] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlayback, setAudioPlayback] = useState(null);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);

  // these are the moods you can pick for your note
  const moods = [
    { emoji: '😊', name: 'happy', color: '#FFE5B4' },
    { emoji: '😢', name: 'sad', color: '#E3F2FD' },
    { emoji: '🔥', name: 'excited', color: '#FFEBEE' },
    { emoji: '😴', name: 'tired', color: '#F3E5F5' },
    { emoji: '💡', name: 'inspired', color: '#E8F5E8' },
    { emoji: '😤', name: 'frustrated', color: '#FFF3E0' },
  ];

  // Add a ref to always get the latest drawing from DrawingCanvas
  const drawingRef = useRef();

  // Debug: log drawing when Done is tappe


  // this runs once when the app starts
  useEffect(() => {
    loadThoughts(); // get saved notes from storage
    setupAudio(); // ask for permission to use the mic
  }, []);

  // this asks for audio permissions so you can record
  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.log('audio setup error:', error);
    }
  };

  // this loads your notes from your phone storage
  const loadThoughts = async () => {
    try {
      const savedThoughts = await AsyncStorage.getItem('thoughts');
      if (savedThoughts) {
        setThoughts(JSON.parse(savedThoughts));
      }
    } catch (error) {
      console.log('error loading thoughts:', error);
    }
  };

  // this saves your notes to your phone storage
  const saveThoughts = async (newThoughts) => {
    try {
      await AsyncStorage.setItem('thoughts', JSON.stringify(newThoughts));
    } catch (error) {
      console.log('error saving thoughts:', error);
    }
  };

  // this starts recording your voice
  const startRecording = async () => {
    try {
      console.log('Attempting to start recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started:', recording);
    } catch (error) {
      console.log('error starting recording:', error);
    }
  };

  // this stops recording and adds a voice note to your note
  const stopRecording = async () => {
    if (!recording) {
      console.log('No recording in progress.');
      return null;
    }
    try {
      console.log('stopRecording: called');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const { sound, status } = await recording.createNewLoadedSoundAsync();
      const duration = status.durationMillis;
      setRecording(null);
      setIsRecording(false);
      const newVoiceNote = { uri, duration, timestamp: new Date().toISOString(), id: Date.now().toString() };
      setVoiceNoteDrafts((drafts) => [...drafts, newVoiceNote]);
      console.log('Recording stopped. URI:', uri, 'Duration:', duration, 'VoiceNote:', newVoiceNote);
      return newVoiceNote;
    } catch (error) {
      console.log('error stopping recording:', error);
      return null;
    }
  };

  // Helper to format duration in mm:ss
  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Play/pause audio for a note
  const handlePlayPauseAudio = async (note) => {
    console.log('handlePlayPauseAudio called:', note);
    if (playingNoteId === note.id && playingSound) {
      if (isPlaying) {
        await playingSound.pauseAsync();
        setIsPlaying(false);
        console.log('Paused playback for note', note.id);
      } else {
        await playingSound.playAsync();
        setIsPlaying(true);
        console.log('Resumed playback for note', note.id);
      }
      return;
    }
    // Stop previous sound
    if (playingSound) {
      await playingSound.unloadAsync();
      setPlayingSound(null);
      setPlayingNoteId(null);
      setIsPlaying(false);
      console.log('Unloaded previous sound');
    }
    if (note.voiceNote && note.voiceNote.uri) {
      console.log('Attempting to play URI:', note.voiceNote.uri);
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: note.voiceNote.uri },
          {},
          (status) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlayingNoteId(null);
              setPlayingSound(null);
              console.log('Playback finished for note', note.id);
            }
          }
        );
        await sound.setVolumeAsync(1.0); // Set volume to max
        setPlayingSound(sound);
        setPlayingNoteId(note.id);
        setIsPlaying(true);
        await sound.playAsync();
        console.log('Started playback for note', note.id);
      } catch (e) {
        console.log('Error playing audio for note', note.id, e);
      }
    } else {
      console.log('No valid voiceNote or URI for note', note);
    }
  };

  // Camera handler
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is required to take photos.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoDrafts((drafts) => [
        ...drafts,
        { uri: result.assets[0].uri, id: Date.now().toString() },
      ]);
    }
  };

  // Add a helper to scale drawing dimensions to fit the stream width
  function getScaledDrawingSize(origWidth, origHeight, maxWidth, maxHeight) {
    if (!origWidth || !origHeight) return { width: maxWidth, height: maxHeight };
    const widthRatio = maxWidth / origWidth;
    const heightRatio = maxHeight / origHeight;
    const scale = Math.min(widthRatio, heightRatio, 1);
    return {
      width: Math.round(origWidth * scale),
      height: Math.round(origHeight * scale),
    };
  }

  // Utility: Parse SVG path strings and compute bounding box
  function getDrawingBoundingBox(paths, padding = 12) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const coordRegex = /[ML] ?(-?\d+(?:\.\d+)?) ?(-?\d+(?:\.\d+)?)/g;
    for (const path of paths) {
      let match;
      while ((match = coordRegex.exec(path))) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        if (!isNaN(x) && !isNaN(y)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
      // fallback: no points
      return { minX: 0, minY: 0, width: 1, height: 1 };
    }
    return {
      minX: Math.max(0, minX - padding),
      minY: Math.max(0, minY - padding),
      width: (maxX - minX) + 2 * padding,
      height: (maxY - minY) + 2 * padding,
    };
  }

  // Helper to generate a unique string ID
  function generateUniqueId() {
    return Date.now().toString() + '-' + Math.floor(Math.random() * 1e8).toString();
  }

  // this adds your note to the stream
  const addThought = async (newVoiceNote = null) => {
    setIsDrawing(false);
    const latestDrawing = drawingRef.current?.getPaths ? drawingRef.current.getPaths() : currentDrawing;
    let imageUri = null;
    let drawingWidth = 1;
    let drawingHeight = 1;
    let cropBox = null;
    // If there is a drawing, rasterize it to PNG
    if (latestDrawing && latestDrawing.length > 0) {
      cropBox = getDrawingBoundingBox(latestDrawing, 12);
      drawingWidth = cropBox.width;
      drawingHeight = cropBox.height;
      try {
        // Render a hidden SVG with the correct viewBox and size for cropping
        // We'll use a temporary component for this
        setExportSvgProps({
          paths: latestDrawing,
          viewBox: `${cropBox.minX} ${cropBox.minY} ${cropBox.width} ${cropBox.height}`,
          width: cropBox.width,
          height: cropBox.height,
        });
        await new Promise(res => setTimeout(res, 50)); // let React render
        imageUri = await captureRef(exportSvgRef, {
          format: 'png',
          quality: 1,
        });
        setDrawingImageUri(imageUri);
        console.log('Auto-cropped drawing image URI:', imageUri);
      } catch (e) {
        console.log('Error capturing drawing:', e);
      }
    }
    const allVoiceNotes = newVoiceNote ? [newVoiceNote] : voiceNoteDrafts;
    console.log('addThought: allVoiceNotes', allVoiceNotes);
    if (!currentThought && (!latestDrawing || latestDrawing.length === 0) && !currentMood && !imageUri && allVoiceNotes.length === 0 && photoDrafts.length === 0) return;
    const newThought = {
      text: currentThought,
      drawing: latestDrawing,
      drawingImageUri: imageUri,
      drawingWidth,
      drawingHeight,
      mood: null, // mood removed
      voiceNotes: allVoiceNotes.map(vn => ({ ...vn, id: vn.id || generateUniqueId() })),
      photos: photoDrafts.map(p => ({ ...p, id: p.id || generateUniqueId() })),
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
    };
    console.log('addThought: newThought', newThought);
    setThoughts([newThought, ...thoughts]);
    saveThoughts([newThought, ...thoughts]);
    setCurrentThought('');
    setCurrentDrawing([]);
    setDrawingImageUri(null);
    setExportSvgProps(null);
    setCurrentMood(null);
    setShowMoodPicker(false);
    setVoiceNoteDrafts([]);
    setPhotoDrafts([]);
    Keyboard.dismiss();
  };

  // this shows each note in the list
  // it shows the time, mood, text, and drawing if there is one
  const MAX_NOTE_PREVIEW_LENGTH = 1000;
  const MAX_NOTE_LENGTH = 3000;
  const MAX_NOTE_EXPANDED_LENGTH = 3000;
  // Track open swipeable refs
  const swipeableRefs = useRef({});

  const closeSwipeable = (id) => {
    if (swipeableRefs.current[id]) {
      swipeableRefs.current[id].close();
    }
  };

  // Helper to deduplicate notes by id
  function dedupeNotes(notes) {
    const seen = new Set();
    return notes.filter(n => {
      if (!n.id || seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }

  function renderThoughtCard(thought) {
    const badge = getNoteTypeBadge(thought);
    const isPinned = pinnedNotes.some((n) => n.id === thought.id);
    return (
      <Swipeable
        ref={ref => { if (ref) swipeableRefs.current[thought.id] = ref; }}
        renderLeftActions={() => renderLeftActions(thought, isPinned)}
        renderRightActions={() => renderRightActions(thought)}
        leftThreshold={SWIPE_ACTION_WIDTH}
        rightThreshold={SWIPE_ACTION_WIDTH}
        overshootLeft={false}
        overshootRight={false}
      >
        <View key={thought.id} style={styles.card}>
          {/* Time ago and badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.timeAgo}>{timeAgo(thought.timestamp)}</Text>
            <View style={[styles.badge, { backgroundColor: badge.color }]}> 
              <Text style={{ color: badge.textColor, fontWeight: 'bold', fontSize: 13 }}>{badge.label}</Text>
            </View>
          </View>
          {/* Content: text, drawing, audio */}
          {thought.text ? (
            <Text style={styles.thoughtText}>{thought.text}</Text>
          ) : null}
          {thought.drawingImageUri && (
            <View style={[styles.drawingContainer, { alignItems: 'center', marginVertical: 8 }]}> 
              <Image
                source={{ uri: thought.drawingImageUri }}
                style={{ width: DRAWING_CANVAS_WIDTH, height: 120, borderRadius: 8, backgroundColor: '#fff', resizeMode: 'contain' }}
              />
            </View>
          )}
          {thought.voiceNotes && thought.voiceNotes.length > 0 && (
            <View style={{ marginVertical: 8 }}>
              {thought.voiceNotes.map((vn) => (
                <View key={vn.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <TouchableOpacity onPress={() => handlePlayPauseAudio({ id: vn.id, voiceNote: vn })} style={{ marginRight: 8 }}>
                    <Text style={{ fontSize: 24 }}>{playingNoteId === vn.id && isPlaying ? '⏸️' : '▶️'}</Text>
                  </TouchableOpacity>
                  {/* Simple waveform placeholder */}
                  <View style={{ width: 40, height: 16, backgroundColor: '#eaf6f3', borderRadius: 8, marginRight: 8 }} />
                  <Text style={{ fontSize: 16, color: '#333' }}>{formatDuration(vn.duration || 0)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Swipeable>
    );
  }

  // Helper to format month/year
  function formatMonthYear(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  // Handler for FlatList viewable items
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const topItem = viewableItems[0].item;
      const label = formatMonthYear(topItem.timestamp);
      setFloatingDate(label);
      setShowFloatingDate(true);
      Animated.timing(floatingDateOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      if (floatingDateTimeout.current) clearTimeout(floatingDateTimeout.current);
      floatingDateTimeout.current = setTimeout(() => {
        Animated.timing(floatingDateOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowFloatingDate(false));
      }, 1200);
    }
  }).current;

  const viewabilityConfig = { itemVisiblePercentThreshold: 10 };

  // Start timer when recording starts
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
    }
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
    };
  }, [isRecording]);

  // Helper to format seconds as mm:ss
  function formatSeconds(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Handler to save photo to device
  const handleSavePhoto = async (uri) => {
    setSavingPhoto(true);
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library permission is required to save photos.');
      setSavingPhoto(false);
      return;
    }
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'Photo saved to your camera roll.');
    } catch (e) {
      Alert.alert('Error', 'Could not save photo.');
    }
    setSavingPhoto(false);
  };

  // Archive, pin, delete handlers
  const handleArchive = (note) => {
    setThoughts(thoughts.filter((n) => n.id !== note.id));
    setArchivedNotes([note, ...archivedNotes]);
    showToast('Note archived');
  };
  const handleDelete = (note) => {
    setThoughts(prev => {
      const updated = prev.filter((n) => n.id !== note.id);
      saveThoughts(updated);
      return updated;
    });
    setPinnedNotes(prev => prev.filter((n) => n.id !== note.id));
    closeSwipeable(note.id);
    showToast('Note deleted');
  };
  const handlePin = (note) => {
    setPinnedNotes(prev => [note, ...prev.filter(n => n.id !== note.id)]);
    setThoughts(prev => prev.filter(n => n.id !== note.id));
    closeSwipeable(note.id);
  };
  const handleUnpin = (note) => {
    setPinnedNotes(prev => prev.filter(n => n.id !== note.id));
    setThoughts(prev => {
      const newList = [...prev, note];
      return newList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });
    closeSwipeable(note.id);
  };
  function showToast(message, undo) {
    setToast({ message, undo });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2500);
  }

  // Update renderLeftActions to use black/white backgrounds and colored text
  const renderLeftActions = (note, isPinned) => (
    <View style={{
      flexDirection: 'row',
      width: SWIPE_ACTION_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: CARD_BORDER_RADIUS,
      overflow: 'hidden',
      marginVertical: 0, // match card margin if any
    }}>
      <RectButton
        style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', flex: 1, height: '100%' }}
        onPress={() => isPinned ? handleUnpin(note) : handlePin(note)}
      >
        <Text style={{ color: '#007bff', fontWeight: 'bold', fontSize: 18 }}>{isPinned ? 'Unpin' : '📌 Pin'}</Text>
      </RectButton>
      <RectButton
        style={{ backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', flex: 1, height: '100%' }}
        onPress={() => handleHide(note)}
      >
        <Text style={{ color: '#8B4513', fontWeight: 'bold', fontSize: 18 }}>🙈 Hide</Text>
      </RectButton>
    </View>
  );
  // Update renderRightActions to use SWIPE_ACTION_WIDTH and black background, red text
  const renderRightActions = (note) => (
    <View style={{ flexDirection: 'row', width: SWIPE_ACTION_WIDTH, height: '100%' }}>
      <RectButton
        style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', flex: 1 }}
        onPress={() => {
          Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => handleDelete(note) },
            ]
          );
        }}
      >
        <Text style={{ color: '#ff3b30', fontWeight: 'bold', fontSize: 18 }}>Delete</Text>
      </RectButton>
    </View>
  );

  // save last input mode to storage whenever it changes
  useEffect(() => {
    AsyncStorage.setItem('lastInputMode', lastInputMode);
  }, [lastInputMode]);

  // on app load, restore last input mode
  useEffect(() => {
    AsyncStorage.getItem('lastInputMode').then(mode => {
      if (mode === 'drawing') setIsDrawing(true);
      else if (mode === 'recording') setIsRecording(true);
      else setIsDrawing(false);
    });
  }, []);

  // handler functions for opening modals
  const handleStartTyping = () => {
    setIsTyping(true);
    setLastInputMode('text');
  };
  // handleStartDrawing: do NOT clear the drawing when opening the modal
  const handleStartDrawing = () => {
    setIsDrawing(true);
    setLastInputMode('drawing');
  };
  const handleStartRecording = () => {
    setIsRecording(true);
    setLastInputMode('recording');
  };

  // handler functions for closing modals and saving notes
  const handleDoneTyping = () => {
    setIsTyping(false);
    addThought();
  };
  // handleDoneDrawing: clear the drawing ONLY after posting
  const handleDoneDrawing = () => {
    addThought(); // add the note
    setIsDrawing(false);
    setDrawingData([]); // clear after posting
    drawingRef.current?.clear(); // clear the canvas
  };
  const handleDoneRecording = async () => {
    const newVoiceNote = await stopRecording();
    console.log('handleDoneRecording: newVoiceNote', newVoiceNote);
    setIsRecording(false);
    addThought(newVoiceNote);
  };

  // --- AUDIO MODAL LOGIC ---
  const openAudioModal = () => {
    setAudioModalVisible(true);
    setAudioStatus('idle');
    setRecordingObj(null);
    setRecordedUri(null);
    setAudioDuration(0);
    setAudioPlayback(null);
    setAudioIsPlaying(false);
  };
  const closeAudioModal = () => {
    setAudioModalVisible(false);
    setAudioStatus('idle');
    setRecordingObj(null);
    setRecordedUri(null);
    setAudioDuration(0);
    setAudioPlayback(null);
    setAudioIsPlaying(false);
  };
  const startAudioRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecordingObj(recording);
      setAudioStatus('recording');
      setAudioDuration(0);
    } catch (e) {
      Alert.alert('Error', 'Could not start recording.');
    }
  };
  const pauseAudioRecording = async () => {
    if (recordingObj) {
      await recordingObj.pauseAsync();
      setAudioStatus('paused');
    }
  };
  const resumeAudioRecording = async () => {
    if (recordingObj) {
      await recordingObj.startAsync();
      setAudioStatus('recording');
    }
  };
  const stopAudioRecording = async () => {
    if (recordingObj) {
      await recordingObj.stopAndUnloadAsync();
      const uri = recordingObj.getURI();
      setRecordedUri(uri);
      setAudioStatus('stopped');
      setRecordingObj(null);
    }
  };
  const reRecordAudio = async () => {
    if (audioPlayback) {
      await audioPlayback.unloadAsync();
      setAudioPlayback(null);
    }
    setRecordedUri(null);
    setAudioStatus('idle');
    setAudioDuration(0);
  };
  const playAudio = async () => {
    if (recordedUri) {
      if (audioPlayback) {
        await audioPlayback.replayAsync();
        setAudioIsPlaying(true);
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: recordedUri }, {}, (status) => {
        if (status.didJustFinish) setAudioIsPlaying(false);
      });
      setAudioPlayback(sound);
      setAudioIsPlaying(true);
      await sound.playAsync();
    }
  };
  const pauseAudio = async () => {
    if (audioPlayback) {
      await audioPlayback.pauseAsync();
      setAudioIsPlaying(false);
    }
  };
  // Timer for recording
  useEffect(() => {
    let interval = null;
    if (audioStatus === 'recording') {
      interval = setInterval(() => setAudioDuration((d) => d + 1), 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [audioStatus]);

  // --- AUDIO MODAL UI ---
  // Replace the old Record modal logic with: onPress={openAudioModal} for the Record tab.
  // When posting a note, use voiceNoteDrafts as before.

  // Add state for selected tab
  // const [selectedTab, setSelectedTab] = useState('write'); // Removed

  // 1. home screen: show only header and three input mode tabs
  // 2. when a tab is tapped, open a full-screen modal/page for that mode
  // 3. each full-screen mode has its own page with a 'Done' button
  // 4. remove inline input, drawing, and recording controls from home
  // 5. only one mode visible at a time; main stream only on home

  // Filter notes based on noteTypeFilter
  const getFilteredNotes = () => {
    const allNotes = dedupeNotes([...pinnedNotes, ...thoughts]).filter(n => !n.hidden);
    if (noteTypeFilter === 'all') return allNotes;
    if (noteTypeFilter === 'voice') {
      return allNotes.filter(
        note => (note.voiceNotes && note.voiceNotes.length > 0) || note.uri // support both array and single uri
      );
    }
    if (noteTypeFilter === 'handdrawn') {
      return allNotes.filter(
        note => note.drawingImageUri || note.drawing // support both image uri and drawing data
      );
    }
    return allNotes;
  };

  // Add handleHide function
  function handleHide(note) {
    // Set hidden property and update notes
    setThoughts(prev => {
      const updated = prev.map(n => n.id === note.id ? { ...n, hidden: true } : n);
      saveThoughts(updated);
      return updated;
    });
    setPinnedNotes(prev => prev.map(n => n.id === note.id ? { ...n, hidden: true } : n));
    closeSwipeable(note.id);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f7efe7' }}>
        <StatusBar style="auto" />
        {/* Top bar with centered title and icons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 }}>
          <View style={{ width: 32 }} /> {/* Spacer for symmetry */}
          <Text style={{ fontSize: 22, fontWeight: 'bold', textAlign: 'center', flex: 1, fontFamily: 'Georgia' }}>Lao Note</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity style={{ marginRight: 8 }} onPress={() => setSearchModalVisible(true)}>
              <Feather name="search" size={24} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity>
              <MaterialCommunityIcons name="lock-outline" size={26} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Segmented control/tab bar for Write, Record, Draw (just triggers modal/page) */}
        <View style={{ flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 4, justifyContent: 'center' }}>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => setIsTyping(true)}
          >
            <View style={{ backgroundColor: '#222', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 18 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Write</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => setAudioModalVisible(true)}
          >
            <View style={{ backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 18 }}>
              <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 16 }}>Record</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => setIsDrawing(true)}
          >
            <View style={{ backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 18 }}>
              <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 16 }}>Draw</Text>
            </View>
          </TouchableOpacity>
        </View>
        {/* Toast notification */}
        {toast && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast.message}</Text>
            {toast.undo && (
              <TouchableOpacity onPress={toast.undo} style={styles.undoText}>
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* Render hidden export SVG for cropping */}
        {exportSvgProps && (
          <View
            ref={exportSvgRef}
            style={{ position: 'absolute', left: -1000, width: exportSvgProps.width, height: exportSvgProps.height, backgroundColor: '#fff' }}
            collapsable={false}
          >
            <Svg
              width={exportSvgProps.width}
              height={exportSvgProps.height}
              viewBox={exportSvgProps.viewBox}
            >
              {exportSvgProps.paths.map((d, idx) => (
                <Path key={idx} d={d} stroke="#000" strokeWidth={2} fill="none" />
              ))}
            </Svg>
          </View>
        )}
        {/* Write full-screen modal */}
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
        {/* Draw full-screen modal */}
        <Modal visible={isDrawing} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={styles.fullScreenModal}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
              <TouchableOpacity onPress={handleDoneDrawing} style={{ padding: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DrawingCanvas
              ref={drawingRef}
              style={styles.fullScreenDrawingCanvas}
              initialPaths={drawingData}
              onDrawingChange={setDrawingData}
            />
          </SafeAreaView>
        </Modal>
        {/* Record full-screen modal */}
        <Modal visible={audioModalVisible} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={styles.fullScreenModal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              {audioStatus === 'stopped' && (
                <TouchableOpacity onPress={reRecordAudio} style={{ padding: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>Re-record</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={async () => {
                console.log('AUDIO MODAL: Done pressed');
                console.log('AUDIO MODAL: recordedUri', recordedUri);
                console.log('AUDIO MODAL: audioDuration', audioDuration);
                if (audioStatus === 'recording') await stopAudioRecording();
                if (recordedUri) {
                  // Build the new voice note object
                  const newVoiceNote = { uri: recordedUri, duration: audioDuration * 1000, timestamp: new Date().toISOString(), id: Date.now().toString() };
                  // Post directly to stream
                  addThought(newVoiceNote);
                  // Optionally update drafts for consistency
                  setVoiceNoteDrafts([newVoiceNote]);
                  closeAudioModal();
                } else {
                  closeAudioModal();
                }
              }} style={{ padding: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontFamily: 'Georgia', color: '#333', marginBottom: 24 }}>{formatSeconds(audioDuration)}</Text>
              {audioStatus === 'idle' && (
                <TouchableOpacity onPress={startAudioRecording} style={{ backgroundColor: '#222', borderRadius: 50, padding: 32, marginBottom: 24 }}>
                  <Text style={{ color: '#fff', fontSize: 32 }}>Start Recording</Text>
                </TouchableOpacity>
              )}
              {audioStatus === 'recording' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={pauseAudioRecording} style={{ backgroundColor: '#bdbdb2', borderRadius: 50, padding: 32, marginRight: 24 }}>
                    <Text style={{ color: '#fff', fontSize: 32 }}>Pause</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={stopAudioRecording} style={{ backgroundColor: '#dc3545', borderRadius: 50, padding: 32 }}>
                    <Text style={{ color: '#fff', fontSize: 32 }}>Stop</Text>
                  </TouchableOpacity>
                </View>
              )}
              {audioStatus === 'paused' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={resumeAudioRecording} style={{ backgroundColor: '#28a745', borderRadius: 50, padding: 32, marginRight: 24 }}>
                    <Text style={{ color: '#fff', fontSize: 32 }}>Resume</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={stopAudioRecording} style={{ backgroundColor: '#dc3545', borderRadius: 50, padding: 32 }}>
                    <Text style={{ color: '#fff', fontSize: 32 }}>Stop</Text>
                  </TouchableOpacity>
                </View>
              )}
              {audioStatus === 'stopped' && recordedUri && (
                <View style={{ alignItems: 'center' }}>
                  <TouchableOpacity onPress={audioIsPlaying ? pauseAudio : playAudio} style={{ backgroundColor: '#333', borderRadius: 50, padding: 32, marginBottom: 16 }}>
                    <Text style={{ color: '#fff', fontSize: 32 }}>{audioIsPlaying ? 'Pause' : 'Play'}</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#333', fontSize: 18, fontFamily: 'Georgia' }}>Preview your recording</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>
        {/* Dropdown modal */}
        <Modal
          visible={filterDropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterDropdownVisible(false)}
        >
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} activeOpacity={1} onPressOut={() => setFilterDropdownVisible(false)}>
            <View style={{ position: 'absolute', right: 24, top: 110, backgroundColor: '#fff', borderRadius: 10, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, paddingVertical: 8, minWidth: 150 }}>
              <TouchableOpacity style={{ padding: 12 }} onPress={() => { setNoteTypeFilter('all'); setFilterDropdownVisible(false); }}>
                <Text style={{ fontSize: 16, color: noteTypeFilter === 'all' ? '#222' : '#555' }}>All Notes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12 }} onPress={() => { setNoteTypeFilter('voice'); setFilterDropdownVisible(false); }}>
                <Text style={{ fontSize: 16, color: noteTypeFilter === 'voice' ? '#222' : '#555' }}>Voice Notes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12 }} onPress={() => { setNoteTypeFilter('handdrawn'); setFilterDropdownVisible(false); }}>
                <Text style={{ fontSize: 16, color: noteTypeFilter === 'handdrawn' ? '#222' : '#555' }}>Handdrawn Notes</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        {/* Replace the List Notes label and dropdown with a custom dropdown */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}>List Notes</Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
            onPress={() => setFilterDropdownVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16, color: '#222', marginRight: 4 }}>
              {noteTypeFilter === 'all' ? 'All Notes' : noteTypeFilter === 'voice' ? 'Voice Notes' : 'Handdrawn Notes'}
            </Text>
            <AntDesign name="down" size={16} color="#222" />
          </TouchableOpacity>
        </View>
        {/* restore the notes stream to a simple, chronological vertical list (twitter-like) */}
        {!(isTyping || isDrawing || isRecording) && (
          <ScrollView style={{ flex: 1, backgroundColor: '#f7efe7' }} contentContainerStyle={{ padding: 0 }}>
            {Object.entries(groupNotesByDate(getFilteredNotes())).map(([section, notes]) => (
              notes.length > 0 && (
                <View key={section}>
                  <Text style={styles.sectionHeader}>{sectionLabels[section]}</Text>
                  {notes.map(note => (
                    <View key={note.id || note.timestamp}>
                      {renderThoughtCard(note)}
                    </View>
                  ))}
                </View>
              )
            ))}
          </ScrollView>
        )}
        {/* Search modal implementation */}
        <Modal
          visible={searchModalVisible}
          animationType="slide"
          onRequestClose={() => setSearchModalVisible(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f7efe7' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <TextInput
                style={{ flex: 1, fontSize: 18, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc' }}
                placeholder="Search notes..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => setSearchModalVisible(false)} style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 18, color: '#222', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, backgroundColor: '#f7efe7' }} contentContainerStyle={{ padding: 0 }}>
              {(() => {
                // Filter notes based on search query
                const query = searchQuery.trim().toLowerCase();
                if (!query) return null;
                let filtered = dedupeNotes([...pinnedNotes, ...thoughts]).filter(note => {
                  if (query.split(' ').length === 1) {
                    // Vague search: mood, emoji, or text
                    const moodMatch = typeof note.mood === 'string' && note.mood.toLowerCase() === query;
                    const emojiMatch = (note.mood === '😊' || (typeof note.mood === 'string' && note.mood.toLowerCase() === 'happy')) && query === 'happy';
                    const textMatch = note.text && note.text.toLowerCase().includes(query);
                    return moodMatch || emojiMatch || textMatch;
                  } else {
                    // Dedicated search: text contains full query
                    return note.text && note.text.toLowerCase().includes(query);
                  }
                });
                if (filtered.length === 0) {
                  return <Text style={{ textAlign: 'center', marginTop: 32, color: '#888', fontSize: 18 }}>No notes found.</Text>;
                }
                return filtered.map(note => (
                  <View key={note.id || note.timestamp}>
                    {renderThoughtCard(note)}
                  </View>
                ));
              })()}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// Utility: format time ago
function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
// Utility: group notes by date
function groupNotesByDate(notes) {
  const today = [];
  const yesterday = [];
  const lastWeek = [];
  const now = new Date();
  notes.forEach(note => {
    const noteDate = new Date(note.timestamp);
    const daysAgo = differenceInCalendarDays(now, noteDate);
    if (daysAgo === 0) today.push(note);
    else if (daysAgo === 1) yesterday.push(note);
    else if (daysAgo <= 7) lastWeek.push(note);
  });
  return { today, yesterday, lastWeek };
}
// Utility: get badge for note type
function getNoteTypeBadge(note) {
  if (note.voiceNotes && note.voiceNotes.length > 0) return { label: 'Calm', color: '#eaf6f3', textColor: '#3bb18f' };
  if (note.drawingImageUri) return { label: 'Sketch', color: '#eaf6f3', textColor: '#3bb18f' };
  if (note.text && note.text.toLowerCase().includes('dream')) return { label: 'Dream Log', color: '#eaf6f3', textColor: '#3bb18f' };
  return { label: 'Journal', color: '#eaf6f3', textColor: '#3bb18f' };
}
// Section headers
const sectionLabels = { today: 'Today', yesterday: 'Yesterday', lastWeek: 'Last Week' };

// these are all the styles for the app
// they make everything look nice and spaced out
const BEIGE = '#f7efe7';
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
  thoughtsList: {
    flex: 1,
    padding: 15,
  },
  thoughtCard: {
    backgroundColor: KINDLE_CARD,
    borderRadius: 8,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: KINDLE_BORDER,
    shadowColor: 'transparent',
    elevation: 0,
    minHeight: 80,
  },
  thoughtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: KINDLE_ACCENT,
    fontFamily: 'Georgia',
  },
  moodEmoji: {
    fontSize: 20,
  },
  thoughtText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#222',
    fontFamily: 'Georgia, serif',
    marginBottom: 8,
  },
  drawingContainer: {
    marginTop: 8,
  },
  drawingPreview: {
    backgroundColor: KINDLE_CARD,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  inputContainer: {
    backgroundColor: KINDLE_BG,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: KINDLE_BORDER,
  },
  textInput: {
    borderBottomWidth: 1,
    borderColor: KINDLE_ACCENT,
    borderRadius: 0,
    padding: 0,
    fontSize: 17,
    minHeight: 40,
    marginBottom: 12,
    color: KINDLE_TEXT,
    fontFamily: 'Georgia',
    backgroundColor: 'transparent',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: KINDLE_ACCENT,
  },
  recordingButton: {
    backgroundColor: '#dc3545',
  },
  drawingButton: {
    backgroundColor: '#007bff',
  },
  actionButtonText: {
    fontSize: 20,
  },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: KINDLE_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 28,
    color: KINDLE_TEXT,
    fontWeight: 'bold',
  },
  moodPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  moodOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedMood: {
    backgroundColor: '#007bff',
  },
  moodOptionText: {
    fontSize: 20,
  },
  drawingCanvas: {
    height: 250,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 12,
    overflow: 'hidden',
  },
  drawingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  drawingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc3545',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
    justifyContent: 'flex-start',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#111',
    zIndex: 1001,
  },
  fullscreenCanvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  fullscreenCanvas: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - (Platform.OS === 'ios' ? 90 : 60),
    backgroundColor: '#fff',
    borderRadius: 0,
    borderWidth: 0,
  },
  floatingDateLabel: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(32,32,32,0.85)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    zIndex: 100,
  },
  floatingDateText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc3545',
    marginRight: 8,
  },
  recordingText: {
    color: '#dc3545',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fullscreenPhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 2000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPhoto: {
    width: '90%',
    height: '70%',
    borderRadius: 16,
    backgroundColor: '#222',
  },
  fullscreenPhotoClose: {
    position: 'absolute',
    top: 40,
    right: 30,
    zIndex: 2001,
    padding: 8,
  },
  savePhotoButton: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: '#007bff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    zIndex: 2001,
  },
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(32,32,32,0.95)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    zIndex: 3000,
  },
  toastText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  undoText: {
    color: '#ffd700',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 16,
  },
  pinnedSectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
    marginLeft: 4,
  },
  archivedButton: {
    marginLeft: 'auto',
    backgroundColor: '#f1f3f4',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 4,
  },
  archivedButtonText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 14,
  },
  archivedModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 3000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archivedModal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  archivedModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pinIcon: {
    position: 'absolute',
    top: 10,
    right: 16,
    fontSize: 22,
    zIndex: 10,
    color: KINDLE_ACCENT,
  },
  inputModeTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  inputModeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  selectedInputModeTab: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  inputModeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  topHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  avatarEmoji: {
    fontSize: 32,
    marginLeft: 8,
  },
  inputModeCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  inputModeCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputModeEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  inputModeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullScreenTextInput: {
    flex: 1,
    width: '100%',
    fontSize: 20,
    color: '#222',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  fullScreenDrawingCanvas: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignSelf: 'center',
    marginBottom: 24,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  card: {
    backgroundColor: '#fff', // White cards for stream posts
    borderRadius: 18,
    padding: 20,
    marginVertical: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-end',
    fontFamily: 'Georgia, serif',
  },
  timeAgo: {
    color: '#bdbdbd',
    fontSize: 13,
    fontFamily: 'Georgia, serif',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 16,
    fontSize: 15,
    color: '#bdbdbd',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'Georgia, serif',
  },
  topSection: {
    backgroundColor: BEIGE,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222',
    fontFamily: 'Georgia, serif',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  inputModeCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputModeCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  inputModeCardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    fontFamily: 'Georgia, serif',
  },
});
