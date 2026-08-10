const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createRating,
  getUserRatings,
  updateRating,
  deleteRating
} = require('../controllers/ratingController');

// @route   POST /api/ratings
// @desc    Create a new rating
// @access  Private
router.post('/', protect, createRating);

// @route   GET /api/ratings/user/:userId
// @desc    Get all ratings for a specific user
// @access  Public
router.get('/user/:userId', getUserRatings);

// @route   PUT /api/ratings/:id
// @desc    Update a rating
// @access  Private (own rating only)
router.put('/:id', protect, updateRating);

// @route   DELETE /api/ratings/:id
// @desc    Delete a rating
// @access  Private (own rating only)
router.delete('/:id', protect, deleteRating);

module.exports = router;
