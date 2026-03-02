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
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate currency accounts per user
accountSchema.index({ user: 1, currency: 1 }, { unique: true });

accountSchema.methods.getBalance = async function () {
  const balanceData = await LedgerModel.aggregate([
    {
      $match: {
        account: this._id,
      },
    },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        balance: { $subtract: ["$totalCredit", "$totalDebit"] },
      },
    },
  ]);

  return balanceData.length ? balanceData[0].balance : 0;
};

const AccountModel = mongoose.model("Account", accountSchema);

export default AccountModel;