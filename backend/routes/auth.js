import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/user.js';

const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password, masterKey } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password and master key
    const hashedPassword = await bcrypt.hash(password, 12);
    const hashedMasterKey = await bcrypt.hash(masterKey, 12);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      masterKey: hashedMasterKey
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { id: user._id, email: user.email }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'username') {
        return res.status(500).json({
          success: false,
          message: 'Database configuration error. Please contact administrator.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed' 
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user._id, email: user.email }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Check auth
router.get('/check', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.json({ 
        success: false, 
        isAuthenticated: false 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).select('-password -masterKey');
    
    if (!user) {
      return res.json({ 
        success: false, 
        isAuthenticated: false 
      });
    }

    res.json({
      success: true,
      isAuthenticated: true,
      user: { id: user._id, email: user.email }
    });

  } catch (error) {
    res.json({ 
      success: false, 
      isAuthenticated: false 
    });
  }
});

export default router;