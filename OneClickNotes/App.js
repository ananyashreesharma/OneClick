// this is the main app file for the notes app
// here you can type, draw, record voice, and add a mood to your note
// all your notes show up in a stream, newest first

import React, { useState, useEffect } from 'react';
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
  SafeAreaView
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawingCanvas from './components/DrawingCanvas';
import Svg, { Path } from 'react-native-svg';

// get the width and height of the screen
const { width, height } = Dimensions.get('window');

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

  // these are the moods you can pick for your note
  const moods = [
    { emoji: '😊', name: 'happy', color: '#FFE5B4' },
    { emoji: '😢', name: 'sad', color: '#E3F2FD' },
    { emoji: '🔥', name: 'excited', color: '#FFEBEE' },
    { emoji: '😴', name: 'tired', color: '#F3E5F5' },
    { emoji: '💡', name: 'inspired', color: '#E8F5E8' },
    { emoji: '😤', name: 'frustrated', color: '#FFF3E0' },
  ];

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

  // this stops recording and adds a voice note to your text
  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      // right now, we just add a placeholder for the voice note
      const voiceNote = {
        uri,
        duration: '0:00', // you can add real duration if you want
        timestamp: new Date().toISOString(),
      };
      setCurrentThought(prev => prev + '\n🎙️ [voice note] ' + voiceNote.duration);
    } catch (error) {
      console.log('error stopping recording:', error);
    }
  };

  // this adds your note to the stream
  const addThought = () => {
    // only add if you typed, drew, or picked a mood
    if (!currentThought.trim() && currentDrawing.length === 0 && !currentMood) {
      return;
    }
    // make a new note object with all the info
    const newThought = {
      id: Date.now().toString(), // unique id
      text: currentThought, // what you typed
      drawing: currentDrawing, // what you drew
      mood: currentMood, // mood you picked
      timestamp: new Date().toISOString(), // when you made it
      voiceNotes: [], // not used yet
    };
    // add the new note to the top of the list
    const updatedThoughts = [newThought, ...thoughts];
    setThoughts(updatedThoughts);
    saveThoughts(updatedThoughts);
    // clear all the input fields for the next note
    setCurrentThought('');
    setCurrentDrawing([]);
    setCurrentMood(null);
    setIsDrawing(false);
  };

  // this shows each note in the list
  // it shows the time, mood, text, and drawing if there is one
  const renderThought = (thought) => {
    return (
      <View key={thought.id} style={[styles.thoughtCard, thought.mood && { backgroundColor: thought.mood.color }]}> 
        {/* note header with time and mood */}
        <View style={styles.thoughtHeader}>
          <Text style={styles.timestamp}>
            {new Date(thought.timestamp).toLocaleString()}
          </Text>
          {thought.mood && (
            <Text style={styles.moodEmoji}>{thought.mood.emoji}</Text>
          )}
        </View>
        {/* note text if you typed something */}
        {thought.text && (
          <Text style={styles.thoughtText}>{thought.text}</Text>
        )}
        {/* note drawing if you drew something */}
        {thought.drawing && thought.drawing.length > 0 && (
          <View style={styles.drawingContainer}>
            <Text style={styles.drawingLabel}>🖍️ drawing</Text>
            <View style={styles.drawingPreview}>
              <Svg width="100%" height={100}>
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
        )}
      </View>
    );
  };

  // this is the main user interface
  // at the top is the title, then the list of notes, then the input area
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {/* app title at the top */}
      <View style={styles.header}>
        <Text style={styles.title}>🧠 thoughts</Text>
      </View>
      {/* list of all your notes, newest first */}
      <ScrollView style={styles.thoughtsList}>
        {thoughts.map(renderThought)}
      </ScrollView>
      {/* input area for making a new note */}
      <View style={styles.inputContainer}>
        {/* text box for typing your thought */}
        <TextInput
          style={styles.textInput}
          placeholder="✍️ start typing your thought..."
          value={currentThought}
          onChangeText={setCurrentThought}
          multiline
          textAlignVertical="top"
        />
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
          {/* smiley button for picking a mood */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowMoodPicker(!showMoodPicker)}
          >
            <Text style={styles.actionButtonText}>😊</Text>
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
        {isDrawing && (
          <View style={styles.drawingCanvas}>
            <View style={styles.drawingHeader}>
              <Text style={styles.drawingTitle}>🖍️ draw your thought</Text>
              {/* clear button to erase your drawing */}
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setCurrentDrawing([])}
              >
                <Text style={styles.clearButtonText}>clear</Text>
              </TouchableOpacity>
            </View>
            {/* this is the actual drawing canvas */}
            <DrawingCanvas
              onDrawingChange={setCurrentDrawing}
              style={styles.canvas}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// these are all the styles for the app
// they make everything look nice and spaced out
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
  },
  thoughtsList: {
    flex: 1,
    padding: 15,
  },
  thoughtCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thoughtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#6c757d',
  },
  moodEmoji: {
    fontSize: 20,
  },
  thoughtText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#212529',
    marginBottom: 8,
  },
  drawingContainer: {
    marginTop: 8,
  },
  drawingLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  drawingPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  drawingText: {
    color: '#6c757d',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
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
});
