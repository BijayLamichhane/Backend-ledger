import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true, // faster queries when fetching accounts by user
    },

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "FROZEN", "CLOSED"],
        message: "Status must be ACTIVE, FROZEN, or CLOSED",
      },
      default: "ACTIVE",
      index: true,
    },

    currency: {
      type: String,
      required: [true, "Currency is required"],
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{3}$/, "Currency must be a valid 3-letter currency code"],
      default: "NPR",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent one user from having duplicate currency accounts
accountSchema.index({ user: 1, currency: 1 }, { unique: true });

const AccountModel = mongoose.model("Account", accountSchema);

export default AccountModel;