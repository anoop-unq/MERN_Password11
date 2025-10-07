import mongoose from 'mongoose';

const vaultItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  encryptedData: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },
  tags: [String]
}, {
  timestamps: true
});

export default mongoose.model('VaultItem', vaultItemSchema);