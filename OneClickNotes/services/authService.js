// authentication service - handles all user login signup stuff
// think of this as the front desk that manages who can enter your app

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase';

// register a new user - like creating a new account
// this is what happens when someone clicks sign up
export const registerUser = async (email, password, displayName) => {
  try {
    // create the user account in firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // update their profile with their name optional but nice
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    return { success: true, user };
  } catch (error) {
    // if something goes wrong tell the user what happened
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// log in an existing user - like checking in at a hotel
// this is what happens when someone clicks login
export const loginUser = async (email, password) => {
  try {
    // check if their email and password are correct
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    // if login fails tell them why
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// log out the current user - like checking out of a hotel
// this is what happens when someone clicks logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// reset password - like getting a new key when you lose yours
// this is what happens when someone clicks forgot password
export const resetPassword = async (email) => {
  try {
    // send them an email with a link to reset their password
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// update user profile - like updating your profile picture on social media
// this is what happens when someone wants to change their name or photo
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'no user is currently logged in' };
    }

    await updateProfile(user, updates);
    return { success: true, user };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// change password - like changing the lock on your door
// this is what happens when someone wants to update their password
export const changePassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'no user is currently logged in' };
    }

    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

// get current user - like asking who is logged in right now
// this is useful to check if someone is already logged in
export const getCurrentUser = () => {
  return auth.currentUser;
};

// get user profile - like getting someone's business card
// this gives you info about the current user
export const getUserProfile = () => {
  const user = auth.currentUser;
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified
  };
};

// watch for authentication changes - like having a security camera
// this tells you when someone logs in or out so you can update the app
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// convert firebase errors into human friendly messages
// firebase gives us technical errors but users want simple explanations
const getAuthErrorMessage = (error) => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'no account found with this email address please check your email or sign up';
    case 'auth/wrong-password':
      return 'incorrect password please try again';
    case 'auth/email-already-in-use':
      return 'an account with this email already exists please try logging in instead';
    case 'auth/weak-password':
      return 'password is too weak please choose a stronger password at least 6 characters';
    case 'auth/invalid-email':
      return 'please enter a valid email address';
    case 'auth/too-many-requests':
      return 'too many failed attempts please wait a moment before trying again';
    case 'auth/network-request-failed':
      return 'network error please check your internet connection and try again';
    default:
      return 'something went wrong please try again';
  }
}; 