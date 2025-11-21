const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  // User being rated (volunteer or driver)
  ratedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // User giving the rating
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Rating value
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Feedback/Comment
  feedback: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Service type
  serviceType: {
    type: String,
    enum: ['volunteer', 'driver'],
    required: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can only rate another user once per service
ratingSchema.index({ ratedUser: 1, ratedBy: 1 }, { unique: true });

// Update the user's average rating after saving a new rating
ratingSchema.post('save', async function() {
  const Rating = this.constructor;
  const User = mongoose.model('User');
  
  // Calculate average rating
  const stats = await Rating.aggregate([
    { $match: { ratedUser: this.ratedUser } },
    {
      $group: {
        _id: '$ratedUser',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await User.findByIdAndUpdate(this.ratedUser, {
      'rating.average': stats[0].avgRating,
      'rating.count': stats[0].count
    });
  }
});

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
