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

// Create a new note
export const createNote = async (noteData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const note = {
      ...noteData,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPinned: false,
      pinTimestamp: null,
      originalTimestamp: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'notes'), note);
    
    // Update user's notes count
    await updateUserNotesCount(user.uid, 1);

    return {
      success: true,
      noteId: docRef.id,
      note: { ...note, id: docRef.id }
    };
  } catch (error) {
    console.error('Create note error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all notes for current user
export const getUserNotes = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('isPinned', 'desc'),
      orderBy('pinTimestamp', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const notes = [];
    
    querySnapshot.forEach((doc) => {
      notes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      notes
    };
  } catch (error) {
    console.error('Get notes error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get a specific note
export const getNote = async (noteId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const noteDoc = await getDoc(doc(db, 'notes', noteId));
    
    if (!noteDoc.exists()) {
      return {
        success: false,
        error: 'Note not found'
      };
    }

    const noteData = noteDoc.data();
    
    // Check if note belongs to current user
    if (noteData.userId !== user.uid) {
      return {
        success: false,
        error: 'Access denied'
      };
    }

    return {
      success: true,
      note: {
        id: noteDoc.id,
        ...noteData
      }
    };
  } catch (error) {
    console.error('Get note error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update a note
export const updateNote = async (noteId, updates) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const noteRef = doc(db, 'notes', noteId);
    const noteDoc = await getDoc(noteRef);
    
    if (!noteDoc.exists()) {
      return {
        success: false,
        error: 'Note not found'
      };
    }

    const noteData = noteDoc.data();
    
    // Check if note belongs to current user
    if (noteData.userId !== user.uid) {
      return {
        success: false,
        error: 'Access denied'
      };
    }

    await updateDoc(noteRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      message: 'Note updated successfully'
    };
  } catch (error) {
    console.error('Update note error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete a note
export const deleteNote = async (noteId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const noteRef = doc(db, 'notes', noteId);
    const noteDoc = await getDoc(noteRef);
    
    if (!noteDoc.exists()) {
      return {
        success: false,
        error: 'Note not found'
      };
    }

    const noteData = noteDoc.data();
    
    // Check if note belongs to current user
    if (noteData.userId !== user.uid) {
      return {
        success: false,
        error: 'Access denied'
      };
    }

    await deleteDoc(noteRef);
    
    // Update user's notes count
    await updateUserNotesCount(user.uid, -1);

    return {
      success: true,
      message: 'Note deleted successfully'
    };
  } catch (error) {
    console.error('Delete note error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Pin/unpin a note
export const togglePinNote = async (noteId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const noteRef = doc(db, 'notes', noteId);
    const noteDoc = await getDoc(noteRef);
    
    if (!noteDoc.exists()) {
      return {
        success: false,
        error: 'Note not found'
      };
    }

    const noteData = noteDoc.data();
    
    // Check if note belongs to current user
    if (noteData.userId !== user.uid) {
      return {
        success: false,
        error: 'Access denied'
      };
    }

    const isCurrentlyPinned = noteData.isPinned;
    const updates = {
      isPinned: !isCurrentlyPinned,
      pinTimestamp: !isCurrentlyPinned ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    };

    await updateDoc(noteRef, updates);

    return {
      success: true,
      message: `Note ${!isCurrentlyPinned ? 'pinned' : 'unpinned'} successfully`,
      isPinned: !isCurrentlyPinned
    };
  } catch (error) {
    console.error('Pin note error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Search notes
export const searchNotes = async (query) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const notes = [];
    
    querySnapshot.forEach((doc) => {
      const noteData = doc.data();
      const searchText = query.toLowerCase();
      
      // Search in text content
      if (noteData.text && noteData.text.toLowerCase().includes(searchText)) {
        notes.push({ id: doc.id, ...noteData });
        return;
      }
      
      // Search in note type
      if (noteData.type && noteData.type.toLowerCase().includes(searchText)) {
        notes.push({ id: doc.id, ...noteData });
        return;
      }
      
      // Search in mood
      if (noteData.mood && noteData.mood.name && 
          noteData.mood.name.toLowerCase().includes(searchText)) {
        notes.push({ id: doc.id, ...noteData });
        return;
      }
    });

    return {
      success: true,
      notes,
      query
    };
  } catch (error) {
    console.error('Search notes error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get user statistics
export const getUserStats = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    const notes = [];
    
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() });
    });

    const stats = {
      totalNotes: notes.length,
      pinnedNotes: notes.filter(note => note.isPinned).length,
      textNotes: notes.filter(note => note.type === 'text').length,
      drawingNotes: notes.filter(note => note.type === 'drawing').length,
      voiceNotes: notes.filter(note => note.type === 'voice').length,
      superNotes: notes.filter(note => note.type === 'supernote').length,
      notesWithMood: notes.filter(note => note.mood).length,
      lastCreated: notes.length > 0 ? notes[0].createdAt : null
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Get stats error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Real-time notes listener
export const subscribeToNotes = (callback) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('isPinned', 'desc'),
      orderBy('pinTimestamp', 'desc'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const notes = [];
      querySnapshot.forEach((doc) => {
        notes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback({ success: true, notes });
    }, (error) => {
      console.error('Notes subscription error:', error);
      callback({ success: false, error: error.message });
    });
  } catch (error) {
    console.error('Subscribe to notes error:', error);
    return null;
  }
};

// Helper function to update user's notes count
const updateUserNotesCount = async (userId, increment) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentCount = userDoc.data().notesCount || 0;
      await updateDoc(userRef, {
        notesCount: Math.max(0, currentCount + increment)
      });
    }
  } catch (error) {
    console.error('Update notes count error:', error);
  }
}; 