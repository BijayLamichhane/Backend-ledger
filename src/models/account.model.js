import mongoose from "mongoose";
import LedgerModel from "./ledger.model.js";

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
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

    systemUser: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate currency accounts per user
accountSchema.index({ user: 1, currency: 1 }, { unique: true });

accountSchema.methods.getBalance = async function () {
  const result = await LedgerModel.aggregate([
    {
      $match: { account: this._id }
    },
    {
      $group: {
        _id: "$account",
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$type", "CREDIT"] },
              "$amount",
              { $multiply: ["$amount", -1] }
            ]
          }
        }
      }
    }
  ]);

  return result.length ? result[0].balance : 0;
};

const AccountModel = mongoose.model("Account", accountSchema);

export default AccountModel;