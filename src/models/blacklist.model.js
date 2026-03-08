import mongoose from "mongoose";

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: [true, "Token is required"],
    unique: [true, "Token already blacklisted"],
  }
}, {
    timestamps: true,
});


tokenBlacklistSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 60 * 60 * 24 * 3,
});

const TokenBlacklist = mongoose.model("TokenBlacklist", tokenBlacklistSchema);
export default TokenBlacklist;
