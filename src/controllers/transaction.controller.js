import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import AccountModel from "../models/account.model.js";
import TransactionModel from "../models/transaction.model.js";
import LedgerModel from "../models/ledger.model.js";
import { sendTransactionEmail } from "../services/email.service.js";

/**
 * Safely resolves a user from a populated account.
 * Falls back to a direct DB lookup if populate returned null.
 * @param {object} account - Mongoose account document (may have .user populated)
 * @returns {{ name: string, email: string } | null}
 */
async function resolveAccountUser(account) {
  if (account.user && account.user.email) {
    return { name: account.user.name, email: account.user.email };
  }
  // populate missed — fetch directly
  const userId = account.user?._id ?? account.user;
  if (!userId) return null;
  const user = await UserModel.findById(userId).select("name email");
  return user ? { name: user.name, email: user.email } : null;
}

export async function createTransaction(req, res) {
  const session = await mongoose.startSession();

  try {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [fromUserAccount, toUserAccount] = await Promise.all([
      AccountModel.findById(fromAccount),
      AccountModel.findById(toAccount).populate("user", "name email"),
    ]);

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
      { session, ordered: true }
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    /* =========================
       SEND EMAIL (non-blocking)
    ========================= */

    resolveAccountUser(toUserAccount).then((receiverUser) => {
      if (!receiverUser) {
        console.error("⚠️ Could not resolve receiver user for email notification.");
        return;
      }
      sendTransactionEmail(
        { email: req.user.email, name: req.user.name },
        receiverUser,
        amount,
        fromUserAccount.currency
      ).catch((err) => console.error("Transaction email failed:", err));
    }).catch((err) => console.error("resolveAccountUser failed:", err));

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
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

export async function createInitialFundTransaction(req, res) {
  const session = await mongoose.startSession();

  try {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [toUserAccount, fromUserAccount] = await Promise.all([
      AccountModel.findById(toAccount).populate("user", "name email"),
      AccountModel.findOne({ systemUser: true, user: req.user._id }),
    ]);

    if (!toUserAccount) {
      return res.status(400).json({ message: "Invalid destination account" });
    }

    if (!fromUserAccount) {
      return res.status(400).json({ message: "System account not found" });
    }

    const existingTransaction = await TransactionModel.findOne({
      idempotencyKey,
    });

    if (existingTransaction) {
      return res.status(400).json({
        message: `Transaction already ${existingTransaction.status.toLowerCase()}`,
        transaction: existingTransaction,
      });
    }

    if (
      fromUserAccount.status !== "ACTIVE" ||
      toUserAccount.status !== "ACTIVE"
    ) {
      return res.status(400).json({
        message: "One or both accounts are inactive",
      });
    }

    if (fromUserAccount.currency !== toUserAccount.currency) {
      return res.status(400).json({
        message: "Accounts must use same currency",
      });
    }

    session.startTransaction();

    const [transaction] = await TransactionModel.create(
      [
        {
          fromAccount: fromUserAccount._id,
          toAccount: toUserAccount._id,
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
          account: fromUserAccount._id,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
        {
          account: toUserAccount._id,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session, ordered: true }
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    resolveAccountUser(toUserAccount).then((receiverUser) => {
      if (!receiverUser) {
        console.error("⚠️ Could not resolve receiver user for email notification.");
        return;
      }
      sendTransactionEmail(
        { email: req.user.email, name: req.user.name },
        receiverUser,
        amount,
        fromUserAccount.currency
      ).catch((err) => console.error("Transaction email failed:", err));
    }).catch((err) => console.error("resolveAccountUser failed:", err));

    res.status(201).json({
      message: "Initial fund transaction successful",
      transaction,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Transaction error:", error.message);

    res.status(500).json({
      message: "Transaction failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}