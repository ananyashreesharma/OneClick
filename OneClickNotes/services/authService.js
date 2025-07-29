import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// User registration
export const registerUser = async (email, password, name) => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: name
    });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: name,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      notesCount: 0,
      pinnedNotesCount: 0
    });

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: name
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

// User login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last login in Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      lastLogin: new Date().toISOString()
    });

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

// User logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: 'Failed to logout'
    };
  }
};

// Password reset
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent successfully'
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

// Update user profile
export const updateUserProfile = async (displayName) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    await updateProfile(user, {
      displayName: displayName
    });

    // Update in Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      displayName: displayName,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: displayName
      }
    };
  } catch (error) {
    console.error('Profile update error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Change password
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    console.error('Password change error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code)
    };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Get user profile from Firestore
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return {
        success: true,
        profile: userDoc.data()
      };
    } else {
      return {
        success: false,
        error: 'User profile not found'
      };
    }
  } catch (error) {
    console.error('Get user profile error:', error);
    return {
      success: false,
      error: 'Failed to get user profile'
    };
  }
};

// Auth state listener
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email address';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    default:
      return 'An error occurred. Please try again.';
  }
}; 