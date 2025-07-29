# OneClick Notes - Firebase Authentication

A comprehensive user authentication system for the OneClick Notes app with Firebase authentication, secure password management, and real-time data synchronization.

## 🚀 Features

### Authentication
- **Firebase Authentication** - Secure, managed authentication service
- **Email/Password Login** - Standard authentication with Firebase
- **Password Reset** - Built-in Firebase password reset functionality
- **User Profile Management** - Update user information and preferences
- **Automatic Session Management** - Firebase handles token refresh and persistence

### Notes Management
- **Personal Notes** - User-specific note storage in Firestore
- **CRUD Operations** - Create, read, update, delete notes
- **Note Types** - Text, drawing, voice, and SuperNotes
- **Pinning System** - Pin/unpin notes with automatic sorting
- **Search Functionality** - Search through user notes
- **Real-time Updates** - Instant synchronization across devices
- **Offline Support** - Works without internet connection

## 📋 Firebase Services

### Authentication

The app uses Firebase Authentication for secure user management:

- **Email/Password Registration** - Users can create accounts with email and password
- **Email/Password Login** - Secure authentication with Firebase tokens
- **Password Reset** - Built-in Firebase password reset functionality
- **User Profile Management** - Update user information and preferences
- **Automatic Session Management** - Firebase handles token refresh and persistence

### Firestore Database

Notes are stored in Firestore with real-time synchronization:

- **User-specific Collections** - Each user's notes are stored separately
- **Real-time Updates** - Changes sync instantly across all devices
- **Offline Support** - Works offline with automatic sync when online
- **Security Rules** - Users can only access their own data
- **Automatic Scaling** - Firebase handles database scaling and performance

### Data Structure

```javascript
// Users Collection
users/{userId} = {
  uid: string,
  email: string,
  displayName: string,
  createdAt: timestamp,
  lastLogin: timestamp,
  notesCount: number,
  pinnedNotesCount: number
}

// Notes Collection
notes/{noteId} = {
  userId: string,
  text: string,
  drawingPaths: array,
  drawingDimensions: object,
  voiceNotes: array,
  type: 'text' | 'drawing' | 'voice' | 'supernote',
  mood: object,
  isPinned: boolean,
  pinTimestamp: timestamp,
  timestamp: timestamp,
  originalTimestamp: timestamp,
  updatedAt: timestamp
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/logout
Logout and invalidate JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Logout successful",
  "code": "LOGOUT_SUCCESS"
}
```

#### POST /api/auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent",
  "code": "RESET_EMAIL_SENT"
}
```

#### POST /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "password": "NewSecurePass123"
}
```

**Response:**
```json
{
  "message": "Password reset successful",
  "code": "PASSWORD_RESET_SUCCESS"
}
```

#### GET /api/auth/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Notes Endpoints (Protected)

#### GET /api/notes
Get all notes for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "notes": [
    {
      "id": "note_uuid",
      "text": "Note content",
      "type": "text",
      "isPinned": false,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### POST /api/notes
Create a new note.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "text": "Note content",
  "type": "text",
  "mood": {
    "name": "happy",
    "emoji": "😊",
    "color": "#FFD700"
  }
}
```

#### PUT /api/notes/:id
Update a note.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/notes/:id
Delete a note.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/notes/:id/pin
Pin/unpin a note.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/notes/search/:query
Search notes.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/notes/stats/overview
Get user statistics.

**Headers:** `Authorization: Bearer <token>`

## 🔧 Setup Instructions

### 1. Firebase Setup
Follow the comprehensive Firebase setup guide in `OneClickNotes/FIREBASE_SETUP.md`

### 2. Install Dependencies
```bash
cd OneClickNotes
npm install
```

### 3. Configure Firebase
Update `OneClickNotes/firebase.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 4. Start the App
```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## 🔒 Security Features

### Firebase Security
- **Managed Authentication** - Firebase handles all security aspects
- **Secure Password Storage** - Firebase uses industry-standard hashing
- **Token Management** - Automatic token refresh and validation
- **Rate Limiting** - Built-in protection against abuse

### Firestore Security Rules
- **User Isolation** - Users can only access their own data
- **Real-time Validation** - Rules are enforced in real-time
- **Offline Security** - Rules apply even when offline

### Input Validation
- **Client-side Validation** - Immediate feedback to users
- **Server-side Validation** - Firebase validates all data
- **Type Safety** - Strong typing for all data structures

## 📧 Firebase Email Templates

### Built-in Email Features
- **Password Reset** - Firebase handles email delivery
- **Email Verification** - Optional email verification
- **Customizable Templates** - Brand your emails in Firebase Console
- **Multi-language Support** - Firebase supports multiple languages

## 🗄️ Data Storage

### Firestore Database
- **Cloud-hosted** - No server management required
- **Real-time Sync** - Automatic data synchronization
- **Offline Support** - Works without internet connection
- **Automatic Scaling** - Handles any amount of data
- **Backup & Recovery** - Built-in data protection

### Data Persistence
- **Local Caching** - Fast access to recent data
- **Conflict Resolution** - Automatic merge of conflicting changes
- **Data Export** - Easy data export and migration
- **User Privacy** - Complete data deletion on request

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 📚 Firebase Error Codes

| Code | Description |
|------|-------------|
| `auth/email-already-in-use` | User already registered |
| `auth/invalid-email` | Invalid email format |
| `auth/weak-password` | Password too weak |
| `auth/user-not-found` | No account with this email |
| `auth/wrong-password` | Incorrect password |
| `auth/too-many-requests` | Too many failed attempts |
| `auth/network-request-failed` | Network connection error |
| `auth/invalid-credential` | Invalid authentication credentials |

## 🚀 Deployment

### Expo Build

1. **Install EAS CLI**:
```bash
npm install -g @expo/eas-cli
```

2. **Configure EAS**:
```bash
eas build:configure
```

3. **Build for Production**:
```bash
eas build --platform all
```

### Firebase Production Setup

1. **Update Security Rules** - Use production rules from `FIREBASE_SETUP.md`
2. **Enable Analytics** - Optional but recommended
3. **Set up Monitoring** - Firebase provides built-in monitoring
4. **Configure Domains** - Add your app domains to Firebase Console

### Security Checklist
- [ ] Update Firestore security rules for production
- [ ] Enable Firebase App Check (recommended)
- [ ] Set up Firebase Analytics
- [ ] Configure Firebase Performance Monitoring
- [ ] Test authentication flows thoroughly
- [ ] Verify data isolation between users

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
- [Firebase Setup Guide](./OneClickNotes/FIREBASE_SETUP.md)

---

**OneClick Notes** - Seamless multi-mode note-taking with Firebase authentication and real-time sync 🚀
