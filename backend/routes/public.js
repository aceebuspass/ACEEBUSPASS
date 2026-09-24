const express = require('express');
const router = express.Router();

/**
 * Public endpoints (no auth) used by the student application form.
 */
router.get('/colleges', async (req, res) => {
  try {
    const colleges = await req.mongo.collection('colleges').find({}).sort({ name: 1 }).toArray();
    res.json(colleges.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      departments: c.departments || []
    })));
  } catch (err) {
    console.error('public/colleges error:', err);
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
});

module.exports = router;
