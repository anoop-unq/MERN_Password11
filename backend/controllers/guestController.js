import jwt from 'jsonwebtoken';
import Guest from '../models/guest.js';

// Generate guest token
const generateGuestToken = (guestId, username) => {
  return jwt.sign({ id: guestId, username, isGuest: true }, process.env.SECRET_KEY, {
    expiresIn: '24h'
  });
};

// Create or access guest account
export const createGuestAccount = async (req, res) => {
  try {
    const { username, displayName } = req.body;
    
    // Check if guestToken exists in cookies
    const guestToken = req.cookies.guestToken;
    
    if (guestToken) {
      try {
        // Verify the existing token
        const decoded = jwt.verify(guestToken, process.env.SECRET_KEY);
        
        // Check if guest exists in database
        const existingGuest = await Guest.findOne({ 
          _id: decoded.id, 
          isActive: true 
        });
        
        if (existingGuest) {
          // Update last active timestamp
          existingGuest.lastActive = new Date();
          await existingGuest.save();
          
          // Generate new token for existing guest
          const newToken = generateGuestToken(existingGuest._id, existingGuest.username);
          
          // Set cookie with new token
          res.cookie('guestToken', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
          });
          
          return res.status(200).json({
            success: true,
            message: 'Existing guest account accessed',
            guest: {
              guestId: existingGuest._id,
              username: existingGuest.username,
              displayName: existingGuest.displayName
            },
            token: newToken
          });
        }
      } catch (error) {
        // Token is invalid or expired
        console.log('Invalid token, creating new guest account');
      }
    }
    
    // Handle username creation
    let finalUsername;
    if (username) {
      // Check if username is already taken
      const existingUser = await Guest.findOne({ username, isActive: true });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      finalUsername = username;
    } else {
      // Generate a unique username
      finalUsername = await Guest.generateUniqueUsername();
    }
    
    // Create new guest account
    const newGuest = new Guest({
      username: finalUsername,
      displayName: displayName || finalUsername,
      isGuest: true,
      isActive: true
    });
    
    await newGuest.save();
    
    // Generate token for new guest
    const token = generateGuestToken(newGuest._id, newGuest.username);
    
    // Set cookie with token
    res.cookie('guestToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.status(201).json({
      success: true,
      message: 'New guest account created',
      guest: {
        guestId: newGuest._id,
        username: newGuest.username,
        displayName: newGuest.displayName
      },
      token
    });
  } catch (error) {
    console.error('Error in createGuestAccount:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get guest details
export const getGuestDetails = async (req, res) => {
  try {
    const guest = await Guest.findById(req.guestId);
    
    if (!guest || !guest.isActive) {
      res.clearCookie('guestToken');
      return res.status(404).json({
        success: false,
        message: 'Guest account not found'
      });
    }
    
    // Update last active timestamp
    guest.lastActive = new Date();
    await guest.save();
    
    // Generate new token to refresh expiration
    const token = generateGuestToken(guest._id, guest.username);
    
    // Set cookie with new token
    res.cookie('guestToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.status(200).json({
      success: true,
      guest: {
        guestId: guest._id,
        username: guest.username,
        displayName: guest.displayName,
        isGuest: guest.isGuest,
        createdAt: guest.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Error in getGuestDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout guest
export const logoutGuest = async (req, res) => {
  try {
    // Update last active timestamp before logout
    await Guest.findByIdAndUpdate(req.guestId, { lastActive: new Date() });
    
    // Clear the cookie but keep the guest account in database
    res.clearCookie('guestToken');
    
    res.status(200).json({
      success: true,
      message: 'Guest logged out successfully'
    });
  } catch (error) {
    console.error('Error in logoutGuest:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Check username availability
export const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      });
    }
    
    // Check if username matches pattern
    const usernamePattern = /^[a-zA-Z0-9_]+$/;
    if (!usernamePattern.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, and underscores'
      });
    }
    
    // Check if username is already taken
    const existingGuest = await Guest.findOne({ 
      username, 
      isActive: true 
    });
    
    res.status(200).json({
      success: true,
      available: !existingGuest
    });
  } catch (error) {
    console.error('Error in checkUsername:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Find guest by username (updated for POST request)
export const findGuestByUsername = async (req, res) => {
  try {
    const { username } = req.body; // Changed from req.query to req.body
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }
    
    // Find guest by username
    const guest = await Guest.findOne({ 
      username, 
      isActive: true 
    });
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Guest account not found'
      });
    }
    
    // Update last active timestamp
    guest.lastActive = new Date();
    await guest.save();
    
    // Generate token for the guest
    const token = generateGuestToken(guest._id, guest.username);
    
    // Set cookie with token
    res.cookie('guestToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.status(200).json({
      success: true,
      message: 'Existing guest account found',
      guest: {
        guestId: guest._id,
        username: guest.username,
        displayName: guest.displayName,
        isGuest: guest.isGuest,
        createdAt: guest.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Error in findGuestByUsername:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};