const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true, // internal UUID
    },
    login_email: {
      type: String,
      required: true,
      unique: true, // user-typed email for login
    },
    pubkey: {
      type: String,
      required: true,
    },
    privkey_store: {
      type: String,
      required: true,
    },
    pake_password: {
      type: String,
      required: true,
    },
    meta: {
      display_name: String,
      pronouns: String,
      age: Number,
      avatar_url: String,
      extras: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
