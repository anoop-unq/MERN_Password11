import express from 'express';
import { body, validationResult } from 'express-validator';
import VaultItem from '../models/VaultItem.js';
import auth from '../middileware/auth.js';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';
const router = express.Router();

// Get all vault items
router.get('/items', auth, async (req, res) => {
  try {
    const items = await VaultItem.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vault items'
    });
  }
});

// Create vault item
router.post('/items', [
  auth,
  body('title').notEmpty(),
  body('encryptedData').notEmpty(),
  body('iv').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed' 
      });
    }

    const { title, encryptedData, iv, tags } = req.body;

    const vaultItem = new VaultItem({
      userId: req.userId,
      title,
      encryptedData,
      iv,
      tags: tags || []
    });

    await vaultItem.save();

    res.status(201).json({
      success: true,
      message: 'Item saved successfully',
      item: vaultItem
    });

  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save item'
    });
  }
});

// Update vault item
router.put('/items/:id', [
  auth,
  body('title').notEmpty(),
  body('encryptedData').notEmpty(),
  body('iv').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed' 
      });
    }

    const { title, encryptedData, iv, tags } = req.body;
    const itemId = req.params.id;

    const vaultItem = await VaultItem.findOne({ 
      _id: itemId, 
      userId: req.userId 
    });

    if (!vaultItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    vaultItem.title = title;
    vaultItem.encryptedData = encryptedData;
    vaultItem.iv = iv;
    vaultItem.tags = tags || [];

    await vaultItem.save();

    res.json({
      success: true,
      message: 'Item updated successfully',
      item: vaultItem
    });

  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item'
    });
  }
});

// Delete vault item
router.delete('/items/:id', auth, async (req, res) => {
  try {
    const itemId = req.params.id;

    const vaultItem = await VaultItem.findOneAndDelete({ 
      _id: itemId, 
      userId: req.userId 
    });

    if (!vaultItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item'
    });
  }
});

// Search vault items
// Search vault items - Fix the typo in your backend route
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      const items = await VaultItem.find({ userId: req.userId })
        .sort({ createdAt: -1 });
      return res.json({
        success: true,
        items
      });
    }
    
    const items = await VaultItem.find({
      userId: req.userId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// Verify master key
router.post('/verify-master-key', auth, async (req, res) => {
  try {
    console.log('Master key verification request received');
    console.log('User ID:', req.userId);
    
    const { masterKey } = req.body;
    console.log('Master key provided:', !!masterKey);
    
    if (!masterKey) {
      return res.status(400).json({
        success: false,
        message: 'Master key is required'
      });
    }

    const user = await User.findById(req.userId);
    console.log('User found:', !!user);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Comparing master keys...');
    const isMasterKeyValid = await bcrypt.compare(masterKey, user.masterKey);
    console.log('Master key valid:', isMasterKeyValid);
    
    if (!isMasterKeyValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid master key'
      });
    }

    res.json({
      success: true,
      message: 'Master key verified successfully'
    });

  } catch (error) {
    console.error('Master key verification error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error during master key verification'
    });
  }
});

export default router;