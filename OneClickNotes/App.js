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
  Animated
} from 'react-native';
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

// this is the main app function
export default function App() {
  // these are all the things we keep track of
  // thoughts is the list of all notes
  const [thoughts, setThoughts] = useState([]);
  // currentThought is what you are typing right now
  const [currentThought, setCurrentThought] = useState('');
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

  // Debug: log drawing when Done is tapped
  const handleDoneDrawing = () => {
    console.log('Done tapped, currentDrawing:', currentDrawing);
    setIsDrawing(false);
  };

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
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.log('error starting recording:', error);
    }
  };

  // this stops recording and adds a voice note to your note
  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      // Get duration
      const { sound, status } = await recording.createNewLoadedSoundAsync();
      const duration = status.durationMillis;
      setRecording(null);
      setIsRecording(false);
      // Add the new draft to the array
      setVoiceNoteDrafts((drafts) => [
        ...drafts,
        { uri, duration, timestamp: new Date().toISOString(), id: Date.now().toString() },
      ]);
    } catch (error) {
      console.log('error stopping recording:', error);
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
    if (playingNoteId === note.id && playingSound) {
      if (isPlaying) {
        await playingSound.pauseAsync();
        setIsPlaying(false);
      } else {
        await playingSound.playAsync();
        setIsPlaying(true);
      }
      return;
    }
    // Stop previous sound
    if (playingSound) {
      await playingSound.unloadAsync();
      setPlayingSound(null);
      setPlayingNoteId(null);
      setIsPlaying(false);
    }
    if (note.voiceNote && note.voiceNote.uri) {
      const { sound } = await Audio.Sound.createAsync({ uri: note.voiceNote.uri }, {}, (status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlayingNoteId(null);
          setPlayingSound(null);
        }
      });
      setPlayingSound(sound);
      setPlayingNoteId(note.id);
      setIsPlaying(true);
      await sound.playAsync();
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
  const addThought = async () => {
    setIsDrawing(false);
    const latestDrawing = drawingRef.current?.getCurrentDrawing ? drawingRef.current.getCurrentDrawing() : currentDrawing;
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
    if (!currentThought && (!latestDrawing || latestDrawing.length === 0) && !currentMood && !imageUri && voiceNoteDrafts.length === 0 && photoDrafts.length === 0) return;
    const newThought = {
      text: currentThought,
      drawing: latestDrawing,
      drawingImageUri: imageUri,
      drawingWidth,
      drawingHeight,
      mood: null, // mood removed
      voiceNotes: voiceNoteDrafts.map(vn => ({ ...vn, id: vn.id || generateUniqueId() })),
      photos: photoDrafts.map(p => ({ ...p, id: p.id || generateUniqueId() })),
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
    };
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

  const renderThought = (thought) => {
    const isPinned = pinnedNotes.some((n) => n.id === thought.id);
    const showMeta = showMetadata[thought.id];
    return (
      <Swipeable
        ref={ref => { if (ref) swipeableRefs.current[thought.id] = ref; }}
        renderLeftActions={() => renderLeftActions(thought, isPinned)}
        renderRightActions={() => renderRightActions(thought)}
        overshootLeft={false}
        overshootRight={false}
      >
        <View style={{ borderRadius: 12, flex: 1 }}>
          <TouchableOpacity
            activeOpacity={0.95}
            onLongPress={() => {
              if (thought.id) setShowMetadata({ ...showMetadata, [thought.id]: !showMeta });
            }}
          >
            <View key={thought.id} style={[styles.thoughtCard, isPinned && { borderColor: '#007bff', borderWidth: 2 }]}> 
              {isPinned && <Text style={styles.pinIcon}>📌</Text>}
              {/* note header with time and mood (show only if showMeta) */}
              {showMeta && (
                <View style={styles.thoughtHeader}>
                  <Text style={styles.timestamp}>
                    {new Date(thought.timestamp).toLocaleString()}
                  </Text>
                  {thought.mood && (
                    <Text style={styles.moodEmoji}>{thought.mood.emoji}</Text>
                  )}
                </View>
              )}
              {/* voice note playback if present */}
              {thought.voiceNotes && thought.voiceNotes.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  {thought.voiceNotes.map((vn) => (
                    <View key={vn.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <TouchableOpacity onPress={() => handlePlayPauseAudio({ id: vn.id, voiceNote: vn })} style={{ marginRight: 8 }}>
                        <Text style={{ fontSize: 24 }}>{playingNoteId === vn.id && isPlaying ? '⏸️' : '▶️'}</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, color: '#333' }}>{formatDuration(vn.duration || 0)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* note text if you typed something */}
              {thought.text && (
                <View>
                  <Text style={styles.thoughtText}>{thought.text}</Text>
                </View>
              )}
              {/* note drawing as PNG if present */}
              {thought.drawingImageUri && (() => {
                const { width: scaledW, height: scaledH } = getScaledDrawingSize(thought.drawingWidth, thought.drawingHeight, DRAWING_CANVAS_WIDTH, 10000);
                return (
                  <View style={[styles.drawingContainer, {alignItems: 'center'}]}>
                    <Image
                      source={{ uri: thought.drawingImageUri }}
                      style={{
                        width: scaledW,
                        height: scaledH,
                        borderRadius: 8,
                        backgroundColor: '#fff',
                        resizeMode: 'contain',
                        maxWidth: DRAWING_CANVAS_WIDTH,
                      }}
                    />
                  </View>
                );
              })()}
              {/* fallback: note drawing as SVG if present and no PNG */}
              {!thought.drawingImageUri && thought.drawing && thought.drawing.length > 0 && (() => {
                const { width: scaledW, height: scaledH } = getScaledDrawingSize(thought.drawingWidth, thought.drawingHeight, DRAWING_CANVAS_WIDTH, 10000);
                return (
                  <View style={[styles.drawingContainer, {alignItems: 'center'}]}>
                    <View style={styles.drawingPreview}>
                      <Svg width={scaledW} height={scaledH}>
                        {thought.drawing.map((path, index) => (
                          <Path
                            key={index}
                            d={path}
                            stroke="#000"
                            strokeWidth={1.5}
                            fill="none"
                          />
                        ))}
                      </Svg>
                    </View>
                  </View>
                );
              })()}
              {/* photos in the note */}
              {thought.photos && thought.photos.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                  {thought.photos.map((photo) => (
                    <TouchableOpacity key={photo.id} onPress={() => setFullscreenPhoto(photo.uri)}>
                      <Image source={{ uri: photo.uri }} style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#eee' }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  // Helper to capture SVG as PNG
  const exportDrawingAsImage = async () => {
    if (!currentDrawing || currentDrawing.length === 0) return;
    try {
      const uri = await captureRef(svgCaptureRef, {
        format: 'png',
        quality: 1,
      });
      setDrawingImageUri(uri);
      console.log('Exported drawing image URI:', uri);
      // You can now upload or use this URI in your stream
    } catch (e) {
      console.log('Error capturing drawing:', e);
    }
  };

  // Log when DrawingCanvas is mounted/unmounted
  useEffect(() => {
    console.log('DrawingCanvas mounted');
    return () => {
      console.log('DrawingCanvas unmounted');
    };
  }, []);

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

  // Render swipe actions
  const renderLeftActions = (note, isPinned) => (
    <RectButton style={{ backgroundColor: isPinned ? '#888' : '#007bff', justifyContent: 'center', flex: 1 }} onPress={() => isPinned ? handleUnpin(note) : handlePin(note)}>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, paddingLeft: 24 }}>{isPinned ? 'Unpin' : '📌 Pin'}</Text>
    </RectButton>
  );
  const renderRightActions = (note) => (
    <RectButton
      style={{ backgroundColor: '#dc3545', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'row' }}
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
      <Text style={{ fontSize: 22, marginRight: 8 }}>🗑️</Text>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Delete</Text>
    </RectButton>
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

  // update input mode when user switches
  const handleStartDrawing = () => {
    setIsDrawing(true);
    setLastInputMode('drawing');
  };
  const handleStartRecording = () => {
    setIsRecording(true);
    setLastInputMode('recording');
  };
  const handleStartTyping = () => {
    setIsDrawing(false);
    setIsRecording(false);
    setLastInputMode('text');
  };

  // this is the main user interface
  // at the top is the title, then the list of notes, then the input area
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        {/* app title at the top */}
        <View style={styles.header}>
          <Text style={styles.title}>jot something down?</Text>
        </View>
        {/* notes list is scrollable */}
        <FlatList
          data={dedupeNotes([...pinnedNotes, ...thoughts])}
          keyExtractor={(item, idx) => item.id ? String(item.id) : `note-${idx}`}
          renderItem={({ item }) => renderThought(item)}
          contentContainerStyle={{ flexGrow: 1, padding: 15 }}
          keyboardShouldPersistTaps="handled"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListHeaderComponent={
            pinnedNotes.length > 0 ? (
              <Text style={styles.pinnedSectionLabel}>Pinned</Text>
            ) : null
          }
        />
        {/* Floating month/year label */}
        {showFloatingDate && (
          <Animated.View style={[styles.floatingDateLabel, { opacity: floatingDateOpacity }]}> 
            <Text style={styles.floatingDateText}>{floatingDate}</Text>
          </Animated.View>
        )}
        {/* input area is fixed at the bottom, always visible and pushed up by keyboard */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={styles.inputContainer}>
            {/* text box for typing your thought */}
            <TextInput
              style={[styles.textInput, { maxHeight: 100 }]}
              placeholder="jot something down..."
              value={currentThought}
              onChangeText={setCurrentThought}
              multiline
              textAlignVertical="top"
              maxLength={3000}
              scrollEnabled={true}
            />
            {/* character counter */}
            <Text style={{ alignSelf: 'flex-end', color: '#888', fontSize: 12, marginBottom: 8 }}>
              {currentThought.length} / 3000
            </Text>
            {/* row of action buttons: record, draw, mood, add */}
            <View style={styles.actionButtons}>
              {/* mic button for recording voice */}
              <TouchableOpacity
                style={[styles.actionButton, isRecording && styles.recordingButton]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Text style={styles.actionButtonText}>
                  {isRecording ? '⏹️' : '🎙️'}
                </Text>
              </TouchableOpacity>
              {/* pen button for drawing */}
              <TouchableOpacity
                style={[styles.actionButton, isDrawing && styles.drawingButton]}
                onPress={() => setIsDrawing(!isDrawing)}
              >
                <Text style={styles.actionButtonText}>🖍️</Text>
              </TouchableOpacity>
              {/* plus button to add the note */}
              <TouchableOpacity
                style={styles.addButton}
                onPress={addThought}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            {/* mood picker shows up when you tap the smiley */}
            {showMoodPicker && (
              <View style={styles.moodPicker}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.name}
                    style={[
                      styles.moodOption,
                      currentMood?.name === mood.name && styles.selectedMood
                    ]}
                    onPress={() => {
                      setCurrentMood(mood);
                      setShowMoodPicker(false);
                    }}
                  >
                    <Text style={styles.moodOptionText}>{mood.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {/* drawing area shows up when you tap the pen */}
            {isDrawing && !isDrawingFullscreen && (
              <View style={styles.drawingCanvas}>
                <View style={styles.drawingHeader}>
                  <Text style={styles.drawingTitle}>🖍️ draw your thought</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {/* Fullscreen button */}
                    <TouchableOpacity
                      style={[styles.clearButton, { backgroundColor: '#007bff', marginRight: 8 }]}
                      onPress={() => setIsDrawingFullscreen(true)}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Fullscreen</Text>
                    </TouchableOpacity>
                    {/* Done button to save drawing and close drawing area */}
                    <TouchableOpacity
                      style={[styles.clearButton, { backgroundColor: '#28a745', marginRight: 8 }]}
                      onPress={handleDoneDrawing}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Done</Text>
                    </TouchableOpacity>
                    {/* clear button to erase your drawing */}
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setCurrentDrawing([])}
                    >
                      <Text style={styles.clearButtonText}>clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* this is the actual drawing canvas */}
                <DrawingCanvas
                  ref={drawingRef}
                  onDrawingChange={drawing => {
                    setCurrentDrawing(drawing);
                    console.log('App.js received drawing from DrawingCanvas:', drawing);
                  }}
                  style={styles.canvas}
                />
                {/* Hidden SVG for export, matches visible canvas size and white background */}
                <View
                  ref={svgCaptureRef}
                  style={{ position: 'absolute', left: -1000, width: DRAWING_CANVAS_WIDTH, height: DRAWING_CANVAS_HEIGHT, backgroundColor: '#fff' }}
                  collapsable={false}
                >
                  <Svg width={DRAWING_CANVAS_WIDTH} height={DRAWING_CANVAS_HEIGHT}>
                    {currentDrawing.map((d, idx) => (
                      <Path key={idx} d={d} stroke="#000" strokeWidth={2} fill="none" />
                    ))}
                  </Svg>
                </View>
                {/* Preview exported image if available (before posting) */}
                {drawingImageUri && (
                  <View style={{ alignItems: 'center', marginTop: 10 }}>
                    <Text style={{ fontSize: 12, color: '#888' }}>Preview:</Text>
                    <Image source={{ uri: drawingImageUri }} style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: '#fff' }} />
                  </View>
                )}
              </View>
            )}
            {/* Recording indicator */}
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording... {formatSeconds(recordingDuration)}</Text>
              </View>
            )}
            {/* voice note drafts */}
            {voiceNoteDrafts.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                {voiceNoteDrafts.map((draft, idx) => (
                  <View key={draft.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 8 }}>
                    <Text style={{ color: '#888', marginRight: 8 }}>Saved in draft</Text>
                    <TouchableOpacity onPress={() => handlePlayPauseAudio({ id: draft.id, voiceNote: draft })} style={{ marginRight: 8 }}>
                      <Text style={{ fontSize: 20 }}>{playingNoteId === draft.id && isPlaying ? '⏸️' : '▶️'}</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 14, color: '#333', marginRight: 8 }}>{formatDuration(draft.duration || 0)}</Text>
                    <TouchableOpacity onPress={() => setVoiceNoteDrafts(voiceNoteDrafts.filter((d) => d.id !== draft.id))}>
                      <Text style={{ color: '#dc3545', fontWeight: 'bold', fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        {/* Fullscreen Drawing Overlay */}
        {isDrawingFullscreen && (
          <View style={styles.fullscreenOverlay}>
            <View style={styles.fullscreenHeader}>
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: '#212529', marginRight: 8 }]}
                onPress={() => setIsDrawingFullscreen(false)}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Back</Text>
              </TouchableOpacity>
              <Text style={[styles.drawingTitle, { color: '#fff', flex: 1, textAlign: 'center' }]}>🖍️ Fullscreen Drawing</Text>
              {/* Save button to add drawing to stream */}
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: '#28a745', marginLeft: 8 }]}
                onPress={async () => {
                  await addThought();
                  setIsDrawingFullscreen(false);
                  setIsDrawing(false); // Optionally close drawing mode after save
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fullscreenCanvasContainer}>
              <DrawingCanvas
                ref={drawingRef}
                onDrawingChange={drawing => {
                  setCurrentDrawing(drawing);
                  console.log('App.js received drawing from DrawingCanvas (fullscreen):', drawing);
                }}
                style={{ width: FULLSCREEN_CANVAS_WIDTH, height: FULLSCREEN_CANVAS_HEIGHT, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6' }}
              />
              {/* Hidden SVG for export, matches fullscreen size */}
              <View
                ref={svgCaptureRef}
                style={{ position: 'absolute', left: -1000, width: FULLSCREEN_CANVAS_WIDTH, height: FULLSCREEN_CANVAS_HEIGHT, backgroundColor: '#fff' }}
                collapsable={false}
              >
                <Svg width={FULLSCREEN_CANVAS_WIDTH} height={FULLSCREEN_CANVAS_HEIGHT}>
                  {currentDrawing.map((d, idx) => (
                    <Path key={idx} d={d} stroke="#000" strokeWidth={2} fill="none" />
                  ))}
                </Svg>
              </View>
            </View>
          </View>
        )}
        {/* Fullscreen Photo Overlay */}
        {fullscreenPhoto && (
          <View style={styles.fullscreenPhotoOverlay}>
            <TouchableOpacity style={styles.fullscreenPhotoClose} onPress={() => setFullscreenPhoto(null)}>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
            <Image source={{ uri: fullscreenPhoto }} style={styles.fullscreenPhoto} resizeMode="contain" />
            <TouchableOpacity style={styles.savePhotoButton} onPress={() => handleSavePhoto(fullscreenPhoto)} disabled={savingPhoto}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{savingPhoto ? 'Saving...' : 'Save to device'}</Text>
            </TouchableOpacity>
          </View>
        )}
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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// these are all the styles for the app
// they make everything look nice and spaced out
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
    color: KINDLE_TEXT,
    fontFamily: 'Georgia',
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
});
