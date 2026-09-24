const express = require('express');
const { ObjectId } = require('mongodb');

const router = express.Router();

// Get all active notifications
router.get('/', async (req, res) => {
    try {
        const notifications = await req.mongo.collection("notifications")
            .find({ is_active: 1 })
            .sort({ created_at: -1 })
            .toArray();
        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Create notification (Admin only)
router.post('/', async (req, res) => {
    try {
        const { title, message, type, target_role } = req.body;
        if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

        const result = await req.mongo.collection("notifications").insertOne({
            title,
            message,
            type: type || 'announcement',
            target_role: target_role || 'all',
            is_active: 1,
            created_at: new Date().toISOString()
        });
        res.json({ id: result.insertedId, message: 'Notification created successfully' });
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// Delete notification (Admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let filter;
        
        try {
            filter = { _id: new ObjectId(id) };
        } catch (e) {
            // If not a valid ObjectId, try the migrated 'id' field
            filter = { $or: [{ id: parseInt(id) }, { id: id }] };
        }

        const result = await req.mongo.collection("notifications").updateOne(filter, { $set: { is_active: 0 } });
        if (result.matchedCount === 0) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification deleted successfully' });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

module.exports = router;
