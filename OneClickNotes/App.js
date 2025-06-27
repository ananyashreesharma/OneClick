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

const { width, height } = Dimensions.get('window');

export default function App() {
  const [thoughts, setThoughts] = useState([]);
  const [currentThought, setCurrentThought] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMood, setCurrentMood] = useState(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  const moods = [
    { emoji: '😊', name: 'happy', color: '#FFE5B4' },
    { emoji: '😢', name: 'sad', color: '#E3F2FD' },
    { emoji: '🔥', name: 'excited', color: '#FFEBEE' },
    { emoji: '😴', name: 'tired', color: '#F3E5F5' },
    { emoji: '💡', name: 'inspired', color: '#E8F5E8' },
    { emoji: '😤', name: 'frustrated', color: '#FFF3E0' },
  ];

  useEffect(() => {
    loadThoughts();
    setupAudio();
  }, []);

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

  const loadThoughts = async () => {
    try {
      const savedThoughts = await AsyncStorage.getItem('thoughts');
      if (savedThoughts) {
        setThoughts(JSON.parse(savedThoughts));
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

  const startRecording = async () => {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.log('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      
      // Add voice note to current thought
      const voiceNote = {
        uri,
        duration: '0:00', // You can calculate actual duration
        timestamp: new Date().toISOString(),
      };
      
      setCurrentThought(prev => prev + '\n🎙️ [Voice Note] ' + voiceNote.duration);
    } catch (error) {
      console.log('Error stopping recording:', error);
    }
  };

  const addThought = () => {
    // Always add the note, even if drawing canvas is open
    if (!currentThought.trim() && currentDrawing.length === 0 && !currentMood) {
      return;
    }

    const newThought = {
      id: Date.now().toString(),
      text: currentThought,
      drawing: currentDrawing,
      mood: currentMood,
      timestamp: new Date().toISOString(),
      voiceNotes: [], // Will store voice note URIs
    };

    const updatedThoughts = [newThought, ...thoughts];
    setThoughts(updatedThoughts);
    saveThoughts(updatedThoughts);
    
    // Reset all input states and close drawing canvas
    setCurrentThought('');
    setCurrentDrawing([]);
    setCurrentMood(null);
    setIsDrawing(false);
  };

  const renderThought = (thought) => {
    return (
      <View key={thought.id} style={[styles.thoughtCard, thought.mood && { backgroundColor: thought.mood.color }]}>
        <View style={styles.thoughtHeader}>
          <Text style={styles.timestamp}>
            {new Date(thought.timestamp).toLocaleString()}
          </Text>
          {thought.mood && (
            <Text style={styles.moodEmoji}>{thought.mood.emoji}</Text>
          )}
        </View>
        
        {thought.text && (
          <Text style={styles.thoughtText}>{thought.text}</Text>
        )}
        
        {thought.drawing && thought.drawing.length > 0 && (
          <View style={styles.drawingContainer}>
            <Text style={styles.drawingLabel}>🖍️ Drawing</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Thoughts</Text>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.thoughtsList}>
        {thoughts.map(renderThought)}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="✍️ Start typing your thought..."
          value={currentThought}
          onChangeText={setCurrentThought}
          multiline
          textAlignVertical="top"
        />
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isRecording && styles.recordingButton]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.actionButtonText}>
              {isRecording ? '⏹️' : '🎙️'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, isDrawing && styles.drawingButton]}
            onPress={() => setIsDrawing(!isDrawing)}
          >
            <Text style={styles.actionButtonText}>🖍️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowMoodPicker(!showMoodPicker)}
          >
            <Text style={styles.actionButtonText}>😊</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={addThought}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Mood Picker */}
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

        {/* Drawing Canvas */}
        {isDrawing && (
          <View style={styles.drawingCanvas}>
            <View style={styles.drawingHeader}>
              <Text style={styles.drawingTitle}>🖍️ Draw your thought</Text>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setCurrentDrawing([])}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
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
