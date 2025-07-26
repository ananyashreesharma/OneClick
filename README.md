# 🧠 OneClick Notes - Stream of Thoughts

A "no nonsense" notes app where users can type, draw, and voice record all in one unified flow.

## ✨ Features

### Unified Flow
- **✍️ Type**: Start typing your thoughts immediately
- **🎙️ Record**: Tap mic to record voice notes (transcribed automatically)
- **🖍️ Draw**: Use pen tool to sketch alongside your text/voice
- **😊 Mood**: Add emotional context with mood emojis and colors

### Stream of Thoughts
- No folders or organization - just a chronological stream
- Each thought can contain text, voice, drawing, and mood
- Smart search by content type (coming soon)

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npx expo start
   ```

3. **Run on device**:
   - Scan QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS simulator / `a` for Android emulator

## 📱 How to Use

1. **Open app** → See your stream of thoughts
2. **Type** → Start typing in the text area
3. **Record** → Tap 🎙️ to record voice (tap again to stop)
4. **Draw** → Tap 🖍️ to open drawing canvas
5. **Mood** → Tap 😊 to add emotional context
6. **Save** → Tap + to add thought to your stream

## 🛠️ Tech Stack

- **React Native** with Expo
- **Expo AV** for audio recording
- **React Native SVG** for drawing
- **AsyncStorage** for local data persistence
- **React Native Gesture Handler** for touch interactions

## 📁 Project Structure

```
OneClickNotes/
├── App.js                 # Main app component
├── components/
│   └── DrawingCanvas.js   # Drawing functionality
├── assets/                # Images, fonts, etc.
└── README.md
```

## 🎯 Design Philosophy

- **No friction**: Open app → add thought
- **Unified experience**: All input types in one flow
- **Stream-based**: No organization pressure
- **Emotional context**: Mood adds depth to thoughts

## 🔮 Future Features

- Voice transcription using Google Speech-to-Text
- Smart search by content type
- Export thoughts
- Cloud sync
- Dark mode

---

Built with ❤️ for capturing the stream of consciousness 