import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "From account is required"],
      index: true,
    },

    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "To account is required"],
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
        message: "Status must be PENDING, COMPLETED, FAILED, or REVERSED",
      },
      default: "PENDING",
      index: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than 0"],
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "NPR",
      match: [/^[A-Z]{3}$/, "Currency must be a 3-letter code"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },

    idempotencyKey: {
      type: String,
      required: [true, "Idempotency key is required"],
      trim: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

/* Optimized indexes */
transactionSchema.index({ fromAccount: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });

const TransactionModel = mongoose.model("Transaction", transactionSchema);

export default TransactionModel;