# Firebase Setup Guide for OneClick Notes

This guide will help you set up Firebase authentication and Firestore database for the OneClick Notes app.

## 🚀 Prerequisites

1. **Firebase Account**: Create a free account at [Firebase Console](https://console.firebase.google.com/)
2. **Node.js**: Make sure you have Node.js installed
3. **Expo CLI**: Install Expo CLI globally: `npm install -g expo-cli`

## 📋 Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name: `oneclick-notes` (or your preferred name)
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"

### 3. Set Up Firestore Database

1. In your Firebase project, go to **Firestore Database** in the left sidebar
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location closest to your users
5. Click "Done"

### 4. Configure Security Rules

1. In Firestore Database, go to the **Rules** tab
2. Replace the default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Notes can only be accessed by their owner
    match /notes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

3. Click "Publish"

### 5. Get Firebase Configuration

1. In your Firebase project, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>) to add a web app
5. Enter app nickname: `OneClick Notes Web`
6. Click "Register app"
7. Copy the Firebase configuration object

### 6. Update Firebase Configuration

1. Open `OneClickNotes/firebase.js`
2. Replace the placeholder configuration with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 7. Install Dependencies

```bash
cd OneClickNotes
npm install
```

### 8. Test the Setup

1. Start the development server:
```bash
npm start
```

2. Open the app on your device or simulator
3. Try to register a new account
4. Verify that authentication works
5. Create a note and verify it's saved to Firestore

## 🔧 Additional Configuration

### Email Templates (Optional)

For better user experience, you can customize email templates:

1. In Firebase Console, go to **Authentication** > **Templates**
2. Customize the following templates:
   - **Email verification**
   - **Password reset**
   - **Email sign-in**

### Storage Rules (Optional)

If you plan to add file uploads later:

1. Go to **Storage** in Firebase Console
2. Create a bucket
3. Set up security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚨 Security Best Practices

### 1. Environment Variables

For production, store Firebase config in environment variables:

```javascript
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
```

### 2. Production Security Rules

Before going to production, update Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Notes can only be accessed by their owner
    match /notes/{noteId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Prevent users from accessing other users' data
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. Authentication Methods

Consider enabling additional authentication methods:

- **Google Sign-In**: For easier user onboarding
- **Apple Sign-In**: For iOS users
- **Phone Authentication**: For SMS-based login

## 🐛 Troubleshooting

### Common Issues

1. **"Firebase App named '[DEFAULT]' already exists"**
   - Solution: Make sure you're not initializing Firebase multiple times

2. **"Permission denied" errors**
   - Check your Firestore security rules
   - Verify the user is authenticated

3. **"Network request failed"**
   - Check your internet connection
   - Verify Firebase project is in the correct region

4. **Authentication not working**
   - Verify Email/Password is enabled in Firebase Console
   - Check if the user exists in Authentication > Users

### Debug Mode

Enable debug logging:

```javascript
// Add this to your firebase.js
if (__DEV__) {
  console.log('Firebase config:', firebaseConfig);
}
```

## 📱 Testing on Different Platforms

### iOS Simulator
```bash
npm run ios
```

### Android Emulator
```bash
npm run android
```

### Physical Device
1. Install Expo Go app
2. Scan the QR code from `npm start`

## 🚀 Deployment

### Expo Build

1. Install EAS CLI:
```bash
npm install -g @expo/eas-cli
```

2. Configure EAS:
```bash
eas build:configure
```

3. Build for production:
```bash
eas build --platform all
```

### Environment Variables for Production

Create `.env.production`:
```
FIREBASE_API_KEY=your-production-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id
```

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## 🆘 Support

If you encounter issues:

1. Check the [Firebase Status Page](https://status.firebase.google.com/)
2. Review Firebase Console logs
3. Check Expo/React Native logs
4. Search existing issues on GitHub

---

**Happy coding! 🚀**

Your OneClick Notes app is now ready with secure Firebase authentication and real-time data synchronization! 