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
import DrawingCanvas from './components/DrawingCanvas';

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
    requestAudioPermissions();
  }, []);

  // Request audio permissions for playback
  const requestAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Audio permission not granted');
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
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
    
    const thought = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      text: newThought.text || '',
      drawingPaths: newThought.drawingPaths || newThought.drawingData || [],
      drawing: newThought.drawingPaths || newThought.drawingData || [], // Also store as 'drawing' for compatibility
      drawingImageUri: newThought.drawingImageUri || null,
      voiceUri: newThought.voiceUri || null,
      voiceDuration: newThought.voiceDuration || 0,
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

  const handleDoneDrawing = async () => {
    if (drawingData && drawingData.length > 0) {
      try {
        // Add a small delay to ensure the drawing is fully rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Capture the drawing as an image
        const imageUri = await captureRef(drawingRef, {
          format: 'jpg',
          quality: 0.8,
          result: 'data-uri', // Use data URI for better compatibility
        });
        
        console.log('Drawing captured:', imageUri);
        
        addThought({ 
          text: 'Drawing note',
          drawingPaths: drawingData,
          drawingImageUri: imageUri
        });
      } catch (error) {
        console.error('Error capturing drawing:', error);
        // Fallback to just storing the paths - still show the drawing
        addThought({ 
          text: 'Drawing note',
          drawingPaths: drawingData,
          drawingImageUri: null // Explicitly set to null to show SVG fallback
        });
      }
    }
    setIsDrawing(false);
  };

  const handleStartRecording = () => {
    console.log('Starting recording...');
    // Reset all audio state for new recording
    setRecordedUri(null);
    setAudioDuration(0);
    setRecordingDuration(0);
    setIsRecording(false);
    setRecording(null);
    if (audioPlayback) {
      audioPlayback.unloadAsync();
      setAudioPlayback(null);
      setAudioIsPlaying(false);
    }
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    
    console.log('Setting audio modal visible to true');
    setAudioModalVisible(true);
    setLastInputMode('recording');
  };

  const handleLockPress = () => {
    setPrivateModalVisible(true);
  };

  // Format duration in MM:SS format
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          <TouchableOpacity onPress={() => Alert.alert('Search', 'Search functionality will be added back soon!')}>
            <Text style={{ fontSize: 14, color: '#666', opacity: 0.7, fontFamily: 'Georgia' }}>search</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleLockPress}>
            <Text style={{ fontSize: 14, color: '#666', opacity: 0.5, fontFamily: 'Georgia' }}>private notes</Text>
          </TouchableOpacity>
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
                <View key={thought.id || index} style={styles.noteCard}>
                  {/* Note Text */}
                  {thought.text && thought.text !== 'Voice note' && thought.text !== 'Drawing note' && (
                    <Text style={styles.noteText}>{thought.text}</Text>
                  )}
                  
                  {/* Show note type if it's just a voice or drawing note */}
                  {thought.text === 'Voice note' && !thought.voiceUri && (
                    <Text style={styles.noteText}>Voice note</Text>
                  )}
                  {thought.text === 'Drawing note' && (!thought.drawingPaths || thought.drawingPaths.length === 0) && (
                    <Text style={styles.noteText}>Drawing note</Text>
                  )}
                  
                  {/* Voice Note Controls */}
                  {thought.voiceUri && (
                    <View style={styles.voiceNoteContainer}>
                      <View style={styles.voiceNoteHeader}>
                        <Text style={styles.voiceNoteLabel}>🎤 Voice Note</Text>
                        {thought.voiceDuration && (
                          <Text style={styles.voiceDuration}>{formatDuration(thought.voiceDuration)}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={async () => {
                          try {
                            if (playingNoteId === thought.id && isPlaying) {
                              // Pause current playback
                              if (playingSound) {
                                await playingSound.pauseAsync();
                                setIsPlaying(false);
                              }
                            } else {
                              // Stop any current playback
                              if (playingSound) {
                                await playingSound.stopAsync();
                                await playingSound.unloadAsync();
                              }
                              
                              console.log('Attempting to play voice note:', thought.voiceUri);
                              
                              // Check if file exists and is accessible
                              if (!thought.voiceUri) {
                                Alert.alert('Playback Error', 'Voice note file not found.');
                                return;
                              }
                              
                              // Start new playback with error handling and maximum volume
                              const { sound } = await Audio.Sound.createAsync(
                                { uri: thought.voiceUri },
                                { shouldPlay: false, volume: 1.0 }
                              );
                              
                              // Set volume to maximum
                              await sound.setVolumeAsync(1.0);
                              
                              setPlayingSound(sound);
                              setPlayingNoteId(thought.id);
                              
                              sound.setOnPlaybackStatusUpdate((status) => {
                                console.log('Playback status:', status);
                                if (status.didJustFinish) {
                                  setIsPlaying(false);
                                  setPlayingNoteId(null);
                                  sound.unloadAsync();
                                }
                              });
                              
                              await sound.playAsync();
                              setIsPlaying(true);
                            }
                          } catch (error) {
                            console.error('Playback error:', error);
                            Alert.alert('Playback Error', `Failed to play voice note: ${error.message}`);
                          }
                        }}
                      >
                        <Text style={styles.playButtonText}>
                          {playingNoteId === thought.id && isPlaying ? '⏸️' : '▶️'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {/* Drawing Display */}
                  {((thought.drawingPaths && thought.drawingPaths.length > 0) || thought.drawingImageUri || (thought.drawing && thought.drawing.length > 0)) && (
                    <View style={styles.drawingContainer}>
                      <Text style={styles.drawingLabel}>🎨 Drawing</Text>
                      <View style={styles.drawingPreview}>
                        {thought.drawingImageUri ? (
                          <View>
                            <Image 
                              source={{ uri: thought.drawingImageUri }} 
                              style={styles.drawingImage}
                              resizeMode="contain"
                              onError={(error) => {
                                console.log('Image load error:', error);
                              }}
                              onLoad={() => {
                                console.log('Image loaded successfully:', thought.drawingImageUri);
                              }}
                            />
                            <Text style={{ fontSize: 10, color: '#999', textAlign: 'center', marginTop: 4 }}>
                              {(thought.drawingPaths || thought.drawing) ? (thought.drawingPaths || thought.drawing).length : 0} strokes
                            </Text>
                          </View>
                        ) : (thought.drawingPaths || thought.drawing) && (thought.drawingPaths || thought.drawing).length > 0 ? (
                          <View>
                            <Svg width={200} height={150} style={styles.drawingSvg}>
                              {(thought.drawingPaths || thought.drawing).slice(0, 3).map((path, pathIndex) => (
                                <Path
                                  key={pathIndex}
                                  d={path}
                                  stroke="#222"
                                  strokeWidth={2}
                                  fill="none"
                                />
                              ))}
                              {(thought.drawingPaths || thought.drawing).length > 3 && (
                                <Text x={100} y={75} textAnchor="middle" fontSize={14} fill="#666">
                                  +{(thought.drawingPaths || thought.drawing).length - 3} more strokes
                                </Text>
                              )}
                            </Svg>
                            <Text style={{ fontSize: 10, color: '#999', textAlign: 'center', marginTop: 4 }}>
                              SVG Preview ({(thought.drawingPaths || thought.drawing).length} strokes)
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
                            Drawing preview not available
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                  
                  {/* Note Time */}
                  <Text style={styles.noteTime}>{new Date(thought.timestamp).toLocaleString()}</Text>
                </View>
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
            {/* Header with controls */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingHorizontal: 16, 
              paddingVertical: 12,
              backgroundColor: '#f7efe7',
              borderBottomWidth: 1,
              borderBottomColor: '#e0d5c7'
            }}>
              <TouchableOpacity 
                onPress={() => setIsDrawing(false)} 
                style={{ padding: 8 }}
              >
                <Text style={{ fontSize: 16, color: '#8B4513', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#8B4513', fontFamily: 'Georgia' }}>Draw</Text>
              
              <TouchableOpacity 
                onPress={handleDoneDrawing} 
                style={{ padding: 8 }}
              >
                <Text style={{ fontSize: 16, color: '#8B4513', fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {/* Full screen drawing canvas */}
            <View style={{ flex: 1, backgroundColor: '#fff' }} ref={drawingRef}>
              <DrawingCanvas
                style={{ flex: 1 }}
                initialPaths={drawingData}
                onDrawingChange={(paths) => {
                  setDrawingData(paths);
                }}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* Audio Recording Modal */}
        <Modal visible={audioModalVisible} animationType="slide" presentationStyle="fullScreen">
          {console.log('Audio modal visible:', audioModalVisible)}
          <SafeAreaView style={[styles.fullScreenModal, { backgroundColor: '#1a1a1a' }]}>
            {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingHorizontal: 16, 
              paddingVertical: 12,
              backgroundColor: '#1a1a1a'
            }}>
              <TouchableOpacity 
                onPress={() => {
                  // Reset all audio state when canceling
                  setAudioModalVisible(false);
                  setRecordedUri(null);
                  setAudioDuration(0);
                  setRecordingDuration(0);
                  setIsRecording(false);
                  if (recording) {
                    recording.stopAndUnloadAsync();
                    setRecording(null);
                  }
                  if (audioPlayback) {
                    audioPlayback.unloadAsync();
                    setAudioPlayback(null);
                    setAudioIsPlaying(false);
                  }
                  if (recordingInterval.current) {
                    clearInterval(recordingInterval.current);
                    recordingInterval.current = null;
                  }
                }} 
                style={{ padding: 8 }}
              >
                <Text style={{ fontSize: 16, color: '#ff3b30', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', fontFamily: 'Georgia' }}>Voice Memos</Text>
              
              <TouchableOpacity 
                onPress={() => {
                  if (recordedUri) {
                    console.log('Adding voice note:', { recordedUri, audioDuration });
                    addThought({ text: 'Voice note', voiceUri: recordedUri, voiceDuration: audioDuration });
                  }
                  
                  // Reset all audio state
                  setAudioModalVisible(false);
                  setRecordedUri(null);
                  setAudioDuration(0);
                  setRecordingDuration(0);
                  setIsRecording(false);
                  setRecording(null);
                  if (audioPlayback) {
                    audioPlayback.unloadAsync();
                    setAudioPlayback(null);
                    setAudioIsPlaying(false);
                  }
                  if (recordingInterval.current) {
                    clearInterval(recordingInterval.current);
                    recordingInterval.current = null;
                  }
                }} 
                style={{ padding: 8 }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: recordedUri ? '#007aff' : '#666', 
                  fontWeight: '600' 
                }}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {/* Recording Interface */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
              {/* Recording Button */}
              <TouchableOpacity
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: isRecording ? '#ff3b30' : '#333',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 40,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                onPress={async () => {
                  try {
                    if (!isRecording) {
                      // Start recording
                      const { status } = await Audio.requestPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert('Permission needed', 'Please grant microphone permission to record voice notes.');
                        return;
                      }

                      await Audio.setAudioModeAsync({
                        allowsRecordingIOS: true,
                        playsInSilentModeIOS: true,
                        shouldDuckAndroid: false,
                        staysActiveInBackground: false,
                        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
                        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
                        playThroughEarpieceAndroid: false,
                      });

                      const recording = new Audio.Recording();
                      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
                      await recording.startAsync();
                      
                      setRecording(recording);
                      setIsRecording(true);
                      setRecordingDuration(0);
                      
                      // Start timer
                      recordingInterval.current = setInterval(() => {
                        setRecordingDuration(prev => prev + 1);
                      }, 1000);
                    } else {
                      // Stop recording
                      await recording.stopAndUnloadAsync();
                      const uri = recording.getURI();
                      setRecordedUri(uri);
                      setIsRecording(false);
                      setRecording(null);
                      
                      // Stop timer
                      if (recordingInterval.current) {
                        clearInterval(recordingInterval.current);
                        recordingInterval.current = null;
                      }
                    }
                  } catch (error) {
                    console.error('Recording error:', error);
                    Alert.alert('Recording Error', 'Failed to record audio. Please try again.');
                  }
                }}
              >
                <View style={{
                  width: isRecording ? 40 : 50,
                  height: isRecording ? 40 : 50,
                  borderRadius: isRecording ? 8 : 25,
                  backgroundColor: '#fff',
                }} />
              </TouchableOpacity>
              
              {/* Recording Status */}
              <Text style={{ 
                fontSize: 24, 
                color: '#fff', 
                fontWeight: 'bold',
                marginBottom: 8,
                fontFamily: 'Georgia'
              }}>
                {isRecording ? 'Recording...' : recordedUri ? 'Recording Complete' : 'Tap to Record'}
              </Text>
              
              {/* Timer */}
              <Text style={{ 
                fontSize: 16, 
                color: '#666', 
                marginBottom: 20 
              }}>
                {formatDuration(recordingDuration)}
              </Text>
              
              {/* Playback Controls (if recording exists) */}
              {recordedUri && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 20,
                  marginTop: 20 
                }}>
                  <TouchableOpacity
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: '#007aff',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={async () => {
                      try {
                        if (audioPlayback) {
                          if (audioIsPlaying) {
                            await audioPlayback.pauseAsync();
                            setAudioIsPlaying(false);
                          } else {
                            await audioPlayback.playAsync();
                            setAudioIsPlaying(true);
                          }
                        } else {
                          const { sound } = await Audio.Sound.createAsync({ uri: recordedUri }, { volume: 1.0 });
                          await sound.setVolumeAsync(1.0);
                          setAudioPlayback(sound);
                          await sound.playAsync();
                          setAudioIsPlaying(true);
                          
                          sound.setOnPlaybackStatusUpdate((status) => {
                            if (status.didJustFinish) {
                              setAudioIsPlaying(false);
                            }
                          });
                        }
                      } catch (error) {
                        console.error('Playback error:', error);
                      }
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 20 }}>
                      {audioIsPlaying ? '⏸️' : '▶️'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: '#333',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setRecordedUri(null);
                      setAudioDuration(0);
                      if (audioPlayback) {
                        audioPlayback.unloadAsync();
                        setAudioPlayback(null);
                        setAudioIsPlaying(false);
                      }
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 20 }}>🗑️</Text>
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
                  <Text style={{ fontSize: 12, color: '#fff', opacity: 0.6, fontFamily: 'Georgia' }}>search</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton}>
                  <Text style={{ fontSize: 12, color: '#fff', opacity: 0.4, fontFamily: 'Georgia' }}>private notes</Text>
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
  voiceNoteContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007aff',
  },
  voiceNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceNoteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007aff',
  },
  voiceDuration: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  playButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  drawingContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9500',
  },
  drawingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff9500',
    marginBottom: 8,
  },
  drawingPreview: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  drawingImage: {
    width: 200,
    height: 150,
    borderRadius: 4,
  },
  drawingSvg: {
    borderRadius: 4,
  },
});
