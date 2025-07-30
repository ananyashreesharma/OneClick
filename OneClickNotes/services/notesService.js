// notes service - handles all the note saving and loading stuff
// think of this as the librarian that manages all your notes in the cloud

import { 
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// create a new note - like writing in a new page of your diary
// this is what happens when you save a note
export const createNote = async (noteData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'you need to be logged in to save notes' };
    }

    // add the note to the user's personal collection
    // think of it like putting a file in their personal folder
    const docRef = await addDoc(collection(db, 'users', user.uid, 'notes'), {
      ...noteData,
      userId: user.uid,
      createdAt: serverTimestamp(), // firebase adds the exact time
      updatedAt: serverTimestamp()
    });

    return { success: true, noteId: docRef.id };
  } catch (error) {
    console.error('error creating note:', error);
    return { success: false, error: 'failed to save your note please try again' };
  }
};

// get all notes for the current user - like opening your diary to see all pages
// this loads all the user's notes when they open the app
export const getUserNotes = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'you need to be logged in to see your notes' };
    }

    // get all notes from the user's personal collection
    // order them by creation time newest first
    const q = query(
      collection(db, 'users', user.uid, 'notes'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const notes = [];

    // convert each note from firebase format to our app format
    querySnapshot.forEach((doc) => {
      notes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, notes };
  } catch (error) {
    console.error('error getting notes:', error);
    return { success: false, error: 'failed to load your notes please try again' };
  }
};

// get a specific note - like opening to a specific page in your diary
// this is useful when you want to edit a specific note
export const getNote = async (noteId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'you need to be logged in to view notes' };
    }

    const docRef = doc(db, 'users', user.uid, 'notes', noteId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, note: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'note not found' };
    }
  } catch (error) {
    console.error('error getting note:', error);
    return { success: false, error: 'failed to load the note please try again' };
  }
};

// update a note - like editing a page in your diary
// this is what happens when you edit and save a note
export const updateNote = async (noteId, updates) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'you need to be logged in to edit notes' };
    }

    const docRef = doc(db, 'users', user.uid, 'notes', noteId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp() // mark when it was last changed
    });

    return { success: true };
  } catch (error) {
    console.error('error updating note:', error);
    return { success: false, error: 'failed to update your note please try again' };
  }
};

// delete a note - like tearing out a page from your diary
// this is what happens when you delete a note
export const deleteNote = async (noteId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'you need to be logged in to delete notes' };
    }

    const docRef = doc(db, 'users', user.uid, 'notes', noteId);
    await deleteDoc(docRef);

    return { success: true };
  } catch (error) {
    console.error('error deleting note:', error);
    return { success: false, error: 'failed to delete your note please try again' };
  }
};

// pin or unpin a note - like putting a sticky note on your fridge
// this is what happens when you pin unpin a note
export const togglePinNote = async (noteId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'you need to be logged in to pin notes' };
    }

    // first get the current note to see if it's pinned
    const docRef = doc(db, 'users', user.uid, 'notes', noteId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'note not found' };
    }

    const currentData = docSnap.data();
    const isCurrentlyPinned = currentData.isPinned || false;

    // toggle the pin status
    await updateDoc(docRef, {
      isPinned: !isCurrentlyPinned,
      pinTimestamp: !isCurrentlyPinned ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });

    return { success: true, isPinned: !isCurrentlyPinned };
  } catch (error) {
    console.error('error toggling pin:', error);
    return { success: false, error: 'failed to pin unpin your note please try again' };
  }
};

// search notes - like looking for a specific topic in your diary
// this is what happens when you use the search feature
export const searchNotes = async (searchTerm) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'you need to be logged in to search notes' };
    }

    if (!searchTerm || searchTerm.trim() === '') {
      // if no search term just get all notes
      return await getUserNotes();
    }

    // search in the user's notes collection
    // note this is a simple search for more advanced search you'd need to set up search indexes
    const q = query(
      collection(db, 'users', user.uid, 'notes'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const notes = [];

    // filter notes that contain the search term
    querySnapshot.forEach((doc) => {
      const noteData = doc.data();
      const searchLower = searchTerm.toLowerCase();
      
      // check if the search term appears in the text content
      if (noteData.text && noteData.text.toLowerCase().includes(searchLower)) {
        notes.push({
          id: doc.id,
          ...noteData
        });
      }
    });

    return { success: true, notes };
  } catch (error) {
    console.error('error searching notes:', error);
    return { success: false, error: 'failed to search your notes please try again' };
  }
};

// get user statistics - like counting how many pages you've written
// this gives you info about the user's note taking habits
export const getUserStats = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'you need to be logged in to see your stats' };
    }

    const q = query(collection(db, 'users', user.uid, 'notes'));
    const querySnapshot = await getDocs(q);
    
    const totalNotes = querySnapshot.size;
    let pinnedNotes = 0;
    let textNotes = 0;
    let voiceNotes = 0;
    let drawingNotes = 0;
    let superNotes = 0;

    // count different types of notes
    querySnapshot.forEach((doc) => {
      const noteData = doc.data();
      if (noteData.isPinned) pinnedNotes++;
      if (noteData.text) textNotes++;
      if (noteData.voiceNotes && noteData.voiceNotes.length > 0) voiceNotes++;
      if (noteData.drawingPaths && noteData.drawingPaths.length > 0) drawingNotes++;
      if (noteData.type === 'supernote') superNotes++;
    });

    return {
      success: true,
      stats: {
        totalNotes,
        pinnedNotes,
        textNotes,
        voiceNotes,
        drawingNotes,
        superNotes
      }
    };
  } catch (error) {
    console.error('error getting user stats:', error);
    return { success: false, error: 'failed to load your statistics please try again' };
  }
};

// subscribe to real time updates - like having a live feed of your notes
// this is what makes the app update instantly when you add edit delete notes
export const subscribeToNotes = (callback) => {
  const user = auth.currentUser;
  if (!user) {
    console.warn('no user logged in for real time subscription');
    return () => {}; // return empty unsubscribe function
  }

  // set up a real time listener for the user's notes
  const q = query(
    collection(db, 'users', user.uid, 'notes'),
    orderBy('createdAt', 'desc')
  );

  // listen for changes and call the callback with updated notes
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const notes = [];
    querySnapshot.forEach((doc) => {
      notes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    callback({ success: true, notes });
  }, (error) => {
    console.error('real time subscription error:', error);
    callback({ success: false, error: 'failed to sync notes in real time' });
  });

  return unsubscribe; // return function to stop listening
}; 