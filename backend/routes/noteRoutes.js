const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { authenticateToken, checkOwnership } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

// Note CRUD operations
router.post('/', upload.single('file'), noteController.createNote);
router.get('/', noteController.getNotes);
router.get('/stats', noteController.getNoteStats);
router.get('/search', noteController.searchNotes);

// Single note operations
router.get('/:id', checkOwnership('Note'), noteController.getNote);
router.put('/:id', checkOwnership('Note'), upload.single('file'), noteController.updateNote);
router.delete('/:id', checkOwnership('Note'), noteController.deleteNote);

// Note management operations
router.patch('/:id/pin', checkOwnership('Note'), noteController.togglePin);
router.patch('/:id/archive', checkOwnership('Note'), noteController.toggleArchive);
router.patch('/:id/restore', checkOwnership('Note'), noteController.restoreNote);
router.delete('/:id/permanent', checkOwnership('Note'), noteController.permanentlyDeleteNote);

module.exports = router;
