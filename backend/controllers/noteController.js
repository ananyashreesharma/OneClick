const Note = require('../models/Note');
const User = require('../models/User');

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const {
      title,
      type,
      content,
      drawingData,
      mood,
      isPrivate,
      pinned,
      tags
    } = req.body;

    // Determine if this should be a supernote
    let noteType = type;
    if (content && (drawingData?.length > 0 || req.file)) {
      noteType = 'supernote';
    }

    const noteData = {
      userId: req.user._id,
      title,
      type: noteType,
      content,
      drawingData,
      mood,
      isPrivate: isPrivate || false,
      pinned: pinned || false,
      tags: tags || []
    };

    // Handle file uploads
    if (req.file) {
      if (req.file.mimetype.startsWith('audio/')) {
        noteData.voiceUrl = req.file.url;
        noteData.metadata = { voiceDuration: req.body.duration || 0 };
      } else if (req.file.mimetype.startsWith('image/')) {
        noteData.photoUrl = req.file.url;
        noteData.metadata = { photoSize: req.file.size || 0 };
      }
    }

    const note = await Note.create(noteData);

    // Update user stats
    await User.updateUserStats(req.user._id, { totalNotes: 1 });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      note
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create note',
      error: error.message
    });
  }
};

// Get all notes for a user with filters
exports.getNotes = async (req, res) => {
  try {
    const {
      search,
      type,
      showPrivate = 'true',
      showArchived = 'false',
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = -1
    } = req.query;

    const options = {
      search,
      type,
      showPrivate: showPrivate === 'true',
      showArchived: showArchived === 'true',
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder)
    };

    const notes = await Note.getUserNotes(req.user._id, options);
    const totalNotes = await Note.countDocuments({ 
      userId: req.user._id, 
      deleted: false 
    });

    res.status(200).json({
      success: true,
      notes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotes / parseInt(limit)),
        totalNotes,
        hasNext: parseInt(page) * parseInt(limit) < totalNotes,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes',
      error: error.message
    });
  }
};

// Get a single note by ID
exports.getNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    if (note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      note
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch note',
      error: error.message
    });
  }
};

// Update a note
exports.updateNote = async (req, res) => {
  try {
    const {
      title,
      content,
      drawingData,
      mood,
      isPrivate,
      pinned,
      tags,
      archived
    } = req.body;

    const updateData = {
      title,
      content,
      drawingData,
      mood,
      isPrivate,
      pinned,
      tags,
      archived
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    // Handle file uploads
    if (req.file) {
      if (req.file.mimetype.startsWith('audio/')) {
        updateData.voiceUrl = req.file.url;
        updateData.metadata = { voiceDuration: req.body.duration || 0 };
      } else if (req.file.mimetype.startsWith('image/')) {
        updateData.photoUrl = req.file.url;
        updateData.metadata = { photoSize: req.file.size || 0 };
      }
    }

    // Determine if this should be a supernote
    if (content && (drawingData?.length > 0 || req.file)) {
      updateData.type = 'supernote';
    }

    const note = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      note
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: error.message
    });
  }
};

// Delete a note (soft delete)
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Update user stats
    await User.updateUserStats(req.user._id, { totalNotes: -1 });

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: error.message
    });
  }
};

// Permanently delete a note
exports.permanentlyDeleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Note permanently deleted'
    });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete note',
      error: error.message
    });
  }
};

// Restore a deleted note
exports.restoreNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { deleted: false },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Note restored successfully',
      note
    });
  } catch (error) {
    console.error('Restore note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore note',
      error: error.message
    });
  }
};

// Toggle note pin status
exports.togglePin = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    note.pinned = !note.pinned;
    await note.save();

    res.status(200).json({
      success: true,
      message: `Note ${note.pinned ? 'pinned' : 'unpinned'} successfully`,
      note
    });
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle pin status',
      error: error.message
    });
  }
};

// Toggle note archive status
exports.toggleArchive = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    note.archived = !note.archived;
    await note.save();

    res.status(200).json({
      success: true,
      message: `Note ${note.archived ? 'archived' : 'unarchived'} successfully`,
      note
    });
  } catch (error) {
    console.error('Toggle archive error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle archive status',
      error: error.message
    });
  }
};

// Get note statistics
exports.getNoteStats = async (req, res) => {
  try {
    const stats = await Note.getUserStats(req.user._id);
    
    res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalNotes: 0,
        textNotes: 0,
        drawingNotes: 0,
        voiceNotes: 0,
        photoNotes: 0,
        superNotes: 0,
        privateNotes: 0,
        pinnedNotes: 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Search notes
exports.searchNotes = async (req, res) => {
  try {
    const { q, type, showPrivate = 'true' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query required'
      });
    }

    const filter = {
      userId: req.user._id,
      deleted: false,
      $text: { $search: q }
    };

    if (showPrivate === 'false') {
      filter.isPrivate = false;
    }

    if (type) {
      filter.type = type;
    }

    const notes = await Note.find(filter)
      .sort({ score: { $meta: 'textScore' } })
      .limit(50);

    res.status(200).json({
      success: true,
      notes,
      query: q,
      totalResults: notes.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};
