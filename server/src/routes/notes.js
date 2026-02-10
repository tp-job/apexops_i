const express = require('express');
const router = express.Router();
const NoteModel = require('../models/NoteModel');
const { authenticate } = require('../middleware/auth');

// GET /api/notes - Get all notes for current user
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const notes = await NoteModel.getAllByUser(userId);
        res.json(notes);
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// GET /api/notes/:id - Get a single note
router.get('/:id', authenticate, async (req, res) => {
    try {
        const note = await NoteModel.getById(req.params.id, req.user.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(note);
    } catch (err) {
        console.error('Error fetching note:', err);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// POST /api/notes - Create a new note
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title && !content) {
            return res.status(400).json({ error: 'Title or content is required' });
        }

        const noteData = {
            ...req.body,
            userId: req.user.id
        };

        const note = await NoteModel.create(noteData);
        res.status(201).json(note);
    } catch (err) {
        console.error('Error creating note:', err);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// PUT /api/notes/:id - Update a note
router.put('/:id', authenticate, async (req, res) => {
    try {
        const note = await NoteModel.update(req.params.id, req.user.id, req.body);
        if (!note) {
            return res.status(404).json({ error: 'Note not found or no changes made' });
        }
        res.json(note);
    } catch (err) {
        console.error('Error updating note:', err);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const success = await NoteModel.delete(req.params.id, req.user.id);
        if (!success) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        console.error('Error deleting note:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

module.exports = router;
