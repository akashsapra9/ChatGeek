const mongoose = require('mongoose');

const groupMemberSchema = mongoose.Schema(
  {
    group_id: { 
        type: String, 
        required: true 
    },
    member_id: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        required: true,
        enum: ['owner', 'admin', 'member'],
        default: 'member'
    },
    wrapped_key: {  // Group key encrypted with member's public key (RSA-OAEP)
        type: String, 
        required: true 
    },
    added_at: { 
        type: Date, 
        default: Date.now 
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index - a user can only be in a group once
groupMemberSchema.index({ group_id: 1, member_id: 1 }, { unique: true });

// Index for finding all groups a user is in
groupMemberSchema.index({ member_id: 1 });

const GroupMember = mongoose.model('GroupMember', groupMemberSchema);
module.exports = GroupMember;