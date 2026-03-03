import mongoose from "mongoose";
import AccountModel from "../models/account.model.js";
import TransactionModel from "../models/transaction.model.js";
import LedgerModel from "../models/ledger.model.js";
import { sendTransactionEmail } from "../services/email.service.js";

export async function createTransaction(req, res) {
  const session = await mongoose.startSession();

  try {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const fromUserAccount = await AccountModel.findById(fromAccount);
    const toUserAccount = await AccountModel.findById(toAccount);

    if (!fromUserAccount || !toUserAccount) {
      return res.status(400).json({ message: "Invalid account IDs" });
    }

    // Idempotency protection
    const existingTransaction = await TransactionModel.findOne({
      idempotencyKey,
    });

    if (existingTransaction) {
      return res.status(400).json({
        message: `Transaction already ${existingTransaction.status.toLowerCase()}`,
        transaction: existingTransaction,
      });
    }

    // Account status check
    if (
      fromUserAccount.status !== "ACTIVE" ||
      toUserAccount.status !== "ACTIVE"
    ) {
      return res
        .status(400)
        .json({ message: "One or both accounts are inactive" });
    }

    // Currency check
    if (fromUserAccount.currency !== toUserAccount.currency) {
      return res
        .status(400)
        .json({ message: "Accounts must use same currency" });
    }

    // Balance check
    const fromBalance = await fromUserAccount.getBalance();

    if (fromBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    /* =========================
       START DATABASE TRANSACTION
    ========================= */

    session.startTransaction();

    const [transaction] = await TransactionModel.create(
      [
        {
          fromAccount,
          toAccount,
          amount,
          idempotencyKey,
          status: "PENDING",
        },
      ],
      { session }
    );

    await LedgerModel.create(
      [
        {
          account: fromAccount,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session }
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    /* =========================
       SEND EMAIL
    ========================= */

    await sendTransactionEmail(
      req.user.email,
      req.user.name,
      amount,
      toAccount
    );

    res.status(201).json({
      message: "Transaction processed successfully",
      transaction,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Transaction error:", error.message);

    res.status(500).json({
      message: "Transaction failed",
      error: error.message,
    });
  }
}