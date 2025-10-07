import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_]+$/ // Alphanumeric and underscores only
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 30
  },
  isGuest: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate a unique username if not provided
guestSchema.statics.generateUniqueUsername = async function(baseName = 'guest') {
  let username = baseName;
  let counter = 1;
  let isUnique = false;
  
  while (!isUnique) {
    const existingGuest = await this.findOne({ username });
    if (!existingGuest) {
      isUnique = true;
    } else {
      username = `${baseName}${Math.floor(1000 + Math.random() * 9000)}`;
      counter++;
    }
  }
  
  return username;
};

const Guest = mongoose.model('Guest', guestSchema);

export default Guest;