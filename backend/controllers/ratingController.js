const Rating = require('../models/Rating');
const User = require('../models/User');

// @desc    Create a new rating
// @route   POST /api/ratings
// @access  Private
exports.createRating = async (req, res) => {
  try {
    const { ratedUserId, rating, feedback, serviceType } = req.body;
    
    // Validate input
    if (!ratedUserId || !rating || !serviceType) {
      return res.status(400).json({
        success: false,
        message: 'Rated user, rating value, and service type are required'
      });
    }
    
    // Check if rated user exists
    const ratedUser = await User.findById(ratedUserId);
    
    if (!ratedUser) {
      return res.status(404).json({
        success: false,
        message: 'User to be rated not found'
      });
    }
    
    // Verify user role matches service type
    if (serviceType === 'volunteer' && ratedUser.role !== 'volunteer') {
      return res.status(400).json({
        success: false,
        message: 'User is not a volunteer'
      });
    }
    
    if (serviceType === 'driver' && ratedUser.role !== 'driver') {
      return res.status(400).json({
        success: false,
        message: 'User is not a driver'
      });
    }
    
    // Check if user already rated this person
    const existingRating = await Rating.findOne({
      ratedUser: ratedUserId,
      ratedBy: req.user._id
    });
    
    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this user. Please update your existing rating.'
      });
    }
    
    // Create rating
    const newRating = await Rating.create({
      ratedUser: ratedUserId,
      ratedBy: req.user._id,
      rating,
      feedback,
      serviceType
    });
    
    // Populate the rating with user details
    const populatedRating = await Rating.findById(newRating._id)
      .populate('ratedUser', 'name email role profilePicture')
      .populate('ratedBy', 'name profilePicture');
    
    res.status(201).json({
      success: true,
      message: 'Rating created successfully',
      data: populatedRating
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating rating',
      error: error.message
    });
  }
};

// @desc    Get all ratings for a specific user
// @route   GET /api/ratings/user/:userId
// @access  Public
exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const ratings = await Rating.find({ ratedUser: userId })
      .populate('ratedBy', 'name profilePicture')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });
    
    const total = await Rating.countDocuments({ ratedUser: userId });
    
    // Get user's average rating
    const user = await User.findById(userId).select('rating');
    
    res.status(200).json({
      success: true,
      count: ratings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      averageRating: user?.rating || { average: 0, count: 0 },
      data: ratings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ratings',
      error: error.message
    });
  }
};

// @desc    Update a rating
// @route   PUT /api/ratings/:id
// @access  Private (own rating only)
exports.updateRating = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    
    const existingRating = await Rating.findById(req.params.id);
    
    if (!existingRating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }
    
    // Check if user owns this rating
    if (existingRating.ratedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this rating'
      });
    }
    
    // Update rating
    if (rating !== undefined) existingRating.rating = rating;
    if (feedback !== undefined) existingRating.feedback = feedback;
    
    await existingRating.save();
    
    const populatedRating = await Rating.findById(existingRating._id)
      .populate('ratedUser', 'name email role profilePicture')
      .populate('ratedBy', 'name profilePicture');
    
    res.status(200).json({
      success: true,
      message: 'Rating updated successfully',
      data: populatedRating
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating rating',
      error: error.message
    });
  }
};

// @desc    Delete a rating
// @route   DELETE /api/ratings/:id
// @access  Private (own rating only)
exports.deleteRating = async (req, res) => {
  try {
    const rating = await Rating.findById(req.params.id);
    
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }
    
    // Check if user owns this rating
    if (rating.ratedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this rating'
      });
    }
    
    await rating.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting rating',
      error: error.message
    });
  }
};
