// this is the main app file for the notebook-style notes app
// you can type, draw, record audio, and add mood on each page
// only one page is visible at a time, like a real notebook

import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Dimensions,
  SafeAreaView,
  PanResponder,
  Animated
} from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawingCanvas from './components/DrawingCanvas';
import Svg, { Path } from 'react-native-svg';
// import a handwritten font from google fonts or expo-font if available
// for now, we'll use the default font and add a comment for future font

const { width, height } = Dimensions.get('window');

export default function App() {
  // all notes/pages
  const [thoughts, setThoughts] = useState([]);
  // which page are we on?
  const [currentPage, setCurrentPage] = useState(0);
  // input states for the current page
  const [currentThought, setCurrentThought] = useState('');
  const [currentDrawing, setCurrentDrawing] = useState([]);
  const [currentMood, setCurrentMood] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [bookmarks, setBookmarks] = useState([]); // list of bookmarked page indices
  // for swipe gesture
  const pan = useRef(new Animated.Value(0)).current;

  // moods to pick from
  const moods = [
    { emoji: '😊', name: 'happy', color: '#FFE5B4' },
    { emoji: '😢', name: 'sad', color: '#E3F2FD' },
    { emoji: '🔥', name: 'excited', color: '#FFEBEE' },
    { emoji: '😴', name: 'tired', color: '#F3E5F5' },
    { emoji: '💡', name: 'inspired', color: '#E8F5E8' },
    { emoji: '😤', name: 'frustrated', color: '#FFF3E0' },
  ];

  // load notes and bookmarks on start
  useEffect(() => {
    loadThoughts();
    loadBookmarks();
    setupAudio();
  }, []);

  // update input fields when page changes
  useEffect(() => {
    if (thoughts.length > 0 && currentPage >= 0 && currentPage < thoughts.length) {
      setCurrentThought(thoughts[currentPage].text || '');
      setCurrentDrawing(thoughts[currentPage].drawing || []);
      setCurrentMood(thoughts[currentPage].mood || null);
    } else {
      setCurrentThought('');
      setCurrentDrawing([]);
      setCurrentMood(null);
    }
  }, [currentPage, thoughts]);

  // audio setup
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

  // load notes from storage
  const loadThoughts = async () => {
    try {
      const savedThoughts = await AsyncStorage.getItem('thoughts');
      if (savedThoughts) {
        setThoughts(JSON.parse(savedThoughts));
      } else {
        // start with one blank page
        setThoughts([{ text: '', drawing: [], mood: null, timestamp: new Date().toISOString(), voiceNotes: [] }]);
      }
    } catch (error) {
      console.log('error loading thoughts:', error);
    }
  };

  // save notes to storage
  const saveThoughts = async (newThoughts) => {
    try {
      await AsyncStorage.setItem('thoughts', JSON.stringify(newThoughts));
    } catch (error) {
      console.log('error saving thoughts:', error);
    }
  };

  // load bookmarks from storage
  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem('bookmarks');
      if (saved) setBookmarks(JSON.parse(saved));
    } catch (error) {
      console.log('error loading bookmarks:', error);
    }
  };

  // save bookmarks to storage
  const saveBookmarks = async (newBookmarks) => {
    try {
      await AsyncStorage.setItem('bookmarks', JSON.stringify(newBookmarks));
    } catch (error) {
      console.log('error saving bookmarks:', error);
    }
  };

  // start recording audio
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

  // stop recording and add to current note
  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      // add voice note info to current page (not shown in ui yet)
      const updatedThoughts = [...thoughts];
      if (!updatedThoughts[currentPage].voiceNotes) updatedThoughts[currentPage].voiceNotes = [];
      updatedThoughts[currentPage].voiceNotes.push({ uri, timestamp: new Date().toISOString() });
      setThoughts(updatedThoughts);
      saveThoughts(updatedThoughts);
      setCurrentThought(prev => prev + '\n🎙️ [voice note]');
    } catch (error) {
      console.log('error stopping recording:', error);
    }
  };

  // save changes to the current page
  const saveCurrentPage = (newFields) => {
    const updatedThoughts = [...thoughts];
    updatedThoughts[currentPage] = {
      ...updatedThoughts[currentPage],
      ...newFields,
      timestamp: new Date().toISOString(),
    };
    setThoughts(updatedThoughts);
    saveThoughts(updatedThoughts);
  };

  // add a new blank page after the current one
  const addPage = () => {
    const newPage = { text: '', drawing: [], mood: null, timestamp: new Date().toISOString(), voiceNotes: [] };
    const updatedThoughts = [...thoughts];
    updatedThoughts.splice(currentPage + 1, 0, newPage);
    setThoughts(updatedThoughts);
    saveThoughts(updatedThoughts);
    setCurrentPage(currentPage + 1);
  };

  // go to previous page
  const goToPrevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  // go to next page
  const goToNextPage = () => {
    if (currentPage < thoughts.length - 1) setCurrentPage(currentPage + 1);
  };

  // toggle bookmark for this page
  const toggleBookmark = () => {
    let updated = [...bookmarks];
    if (updated.includes(currentPage)) {
      updated = updated.filter(idx => idx !== currentPage);
    } else {
      updated.push(currentPage);
    }
    setBookmarks(updated);
    saveBookmarks(updated);
  };

  // swipe gesture for flipping pages
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          goToPrevPage();
        } else if (gestureState.dx < -50) {
          goToNextPage();
        }
      },
    })
  ).current;

  // notebook background style (lined paper look)
  // for now, use a light color and lines; can be replaced with an image
  const notebookBackground = {
    backgroundColor: '#fdf6e3',
    borderWidth: 1,
    borderColor: '#e0cfa9',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    minHeight: 350,
    justifyContent: 'flex-start',
    // fontFamily: 'handwritten-font', // add a real font if available
  };

  // main ui
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {/* search bar placeholder (to be implemented) */}
      <View style={styles.header}>
        <Text style={styles.title}>notebook</Text>
      </View>
      {/* notebook page area */}
      <View style={styles.pageContainer} {...panResponder.panHandlers}>
        {/* left arrow */}
        <TouchableOpacity onPress={goToPrevPage} disabled={currentPage === 0} style={styles.arrowButton}>
          <Text style={[styles.arrow, currentPage === 0 && styles.arrowDisabled]}>←</Text>
        </TouchableOpacity>
        {/* notebook page */}
        <View style={[styles.page, notebookBackground]}>
          {/* bookmark icon */}
          <TouchableOpacity onPress={toggleBookmark} style={styles.bookmarkButton}>
            <Text style={styles.bookmark}>{bookmarks.includes(currentPage) ? '🔖' : '📄'}</Text>
          </TouchableOpacity>
          {/* mood picker */}
          <TouchableOpacity onPress={() => setShowMoodPicker(!showMoodPicker)} style={styles.moodButton}>
            <Text style={styles.mood}>{currentMood ? currentMood.emoji : '😊'}</Text>
          </TouchableOpacity>
          {showMoodPicker && (
            <View style={styles.moodPicker}>
              {moods.map((mood) => (
                <TouchableOpacity
                  key={mood.name}
                  style={styles.moodOption}
                  onPress={() => {
                    setCurrentMood(mood);
                    saveCurrentPage({ mood });
                    setShowMoodPicker(false);
                  }}
                >
                  <Text style={styles.moodOptionText}>{mood.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* text input for the note */}
          <TextInput
            style={[styles.textInput, { fontFamily: 'Courier', fontSize: 18 }]}
            placeholder="write your thought..."
            value={currentThought}
            onChangeText={text => {
              setCurrentThought(text);
              saveCurrentPage({ text });
            }}
            multiline
            textAlignVertical="top"
          />
          {/* drawing area */}
          <View style={styles.drawingArea}>
            <DrawingCanvas
              onDrawingChange={drawing => {
                setCurrentDrawing(drawing);
                saveCurrentPage({ drawing });
              }}
              style={{ height: 120, backgroundColor: '#fffbe6', borderRadius: 8, borderWidth: 1, borderColor: '#e0cfa9' }}
            />
          </View>
          {/* audio record button */}
          <TouchableOpacity
            style={[styles.audioButton, isRecording && styles.audioButtonActive]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.audioButtonText}>{isRecording ? '⏹️ stop' : '🎙️ record'}</Text>
          </TouchableOpacity>
        </View>
        {/* right arrow */}
        <TouchableOpacity onPress={goToNextPage} disabled={currentPage === thoughts.length - 1} style={styles.arrowButton}>
          <Text style={[styles.arrow, currentPage === thoughts.length - 1 && styles.arrowDisabled]}>→</Text>
        </TouchableOpacity>
      </View>
      {/* page number and add page button */}
      <View style={styles.pageFooter}>
        <Text style={styles.pageNumber}>page {currentPage + 1}</Text>
        <TouchableOpacity onPress={addPage} style={styles.addPageButton}>
          <Text style={styles.addPageText}>+ add page</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    fontFamily: 'Courier', // use a handwritten font if available
  },
  pageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  page: {
    flex: 1,
    minHeight: 350,
    marginHorizontal: 8,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  arrowButton: {
    padding: 10,
  },
  arrow: {
    fontSize: 32,
    color: '#bfa76a',
  },
  arrowDisabled: {
    color: '#e0cfa9',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  bookmark: {
    fontSize: 24,
  },
  moodButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
  },
  mood: {
    fontSize: 24,
  },
  moodPicker: {
    flexDirection: 'row',
    marginVertical: 8,
    backgroundColor: '#fffbe6',
    borderRadius: 8,
    padding: 6,
    alignSelf: 'flex-start',
  },
  moodOption: {
    marginHorizontal: 4,
  },
  moodOptionText: {
    fontSize: 22,
  },
  textInput: {
    minHeight: 100,
    marginTop: 40,
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: '#e0cfa9',
    padding: 8,
  },
  drawingArea: {
    marginVertical: 8,
  },
  audioButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#f5e6c8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  audioButtonActive: {
    backgroundColor: '#f7b267',
  },
  audioButtonText: {
    fontSize: 16,
  },
  pageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  pageNumber: {
    fontSize: 16,
    color: '#bfa76a',
    fontFamily: 'Courier',
  },
  addPageButton: {
    backgroundColor: '#f5e6c8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addPageText: {
    fontSize: 16,
    color: '#bfa76a',
    fontWeight: 'bold',
  },
});
