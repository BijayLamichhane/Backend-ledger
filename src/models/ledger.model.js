import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account is required"],
      index: true,
      immutable: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      immutable: true,
    },

    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: [true, "Transaction is required"],
      index: true,
      immutable: true,
    },

    type: {
      type: String,
      enum: {
        values: ["CREDIT", "DEBIT"],
        message: "Type must be CREDIT or DEBIT",
      },
      required: [true, "Type is required"],
      index: true,
      immutable: true,
    },
  },
  { timestamps: true }
);

/* 🚫 Prevent ANY modification */
function preventLedgerModification(next) {
  next(new Error("Ledger entries are immutable and cannot be modified or deleted"));
}

const blockedOperations = [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndReplace"
];

blockedOperations.forEach((operation) => {
  ledgerSchema.pre(operation, preventLedgerModification);
});

const Ledger = mongoose.model("Ledger", ledgerSchema);

export default Ledger;