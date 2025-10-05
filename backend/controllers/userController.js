const User = require('../models/userModel');
const Group = require('../models/groupModel');
const GroupMember = require('../models/groupMemberModel');

const registerUser = async (req, res) => {
  try {
    const { user_id, pubkey, privkey_store, pake_password, meta } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ user_id });
    if (existingUser) {
      return res.status(400).json({ error: 'NAME_IN_USE' });
    }

    // Create new user
    const user = await User.create({
      user_id,
      pubkey,
      privkey_store,
      pake_password,
      meta: meta || {},
      version: 1
    });

    // Add user to public channel
    const publicGroup = await Group.findOne({ group_id: "public" });
    if (publicGroup) {
      // in real implementation, encrypt the group key with the user's public key
      const wrappedKey = "placeholder_wrapped_key"; // Replace with actual RSA-OAEP encryption
      
      await GroupMember.create({
        group_id: "public",
        member_id: user_id,
        role: "member",
        wrapped_key: wrappedKey
      });
    }

    res.status(201).json({
      success: true,
      user: {
        user_id: user.user_id,
        pubkey: user.pubkey,
        meta: user.meta
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'REGISTRATION_FAILED' });
  }
};

const getUserPublicKey = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const user = await User.findOne({ user_id }, 'pubkey user_id');
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    res.json({ pubkey: user.pubkey });
  } catch (error) {
    res.status(500).json({ error: 'KEY_RETRIEVAL_FAILED' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { user_id, password } = req.body;
    console.log("Login attempt for user:", user_id);

    // Find user
    const user = await User.findOne({ user_id });
    if (!user) {
      console.log("User not found:", user_id);
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    console.log("User found:", user_id);
    console.log("User data:", {
      hasPubkey: !!user.pubkey,
      hasPrivkeyStore: !!user.privkey_store,
      hasPakePassword: !!user.pake_password
    });

    // TEMPORARY: For testing, we'll skip proper PAKE verification
    // In production, you'd implement proper PAKE verification here
    console.log("PAKE verification skipped for testing");

    // Return user data needed for frontend
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        pubkey: user.pubkey,
        privkey_store: user.privkey_store, // The encrypted private key
        meta: user.meta
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'LOGIN_FAILED', details: error.message });
  }
};

// Make sure you export loginUser along with your other functions
module.exports = { 
  registerUser, 
  getUserPublicKey, 
  loginUser
};