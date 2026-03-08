import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import AccountModel from "../models/account.model.js";
import TransactionModel from "../models/transaction.model.js";
import LedgerModel from "../models/ledger.model.js";
import { sendTransactionEmail } from "../services/email.service.js";

/**
 * Resolve account user safely (handles missing populate)
 */
async function resolveAccountUser(account) {
  if (account.user && account.user.email) {
    return { name: account.user.name, email: account.user.email };
  }

  const userId = account.user?._id ?? account.user;
  if (!userId) return null;

  const user = await UserModel.findById(userId).select("name email");

  return user ? { name: user.name, email: user.email } : null;
}

/* =====================================================
   USER → USER TRANSACTION
===================================================== */

export async function createTransaction(req, res) {
  const session = await mongoose.startSession();

  try {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    /* ---------- Validation ---------- */

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "Invalid transaction amount",
      });
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({
        message: "Cannot transfer to the same account",
      });
    }

    /* ---------- Fetch accounts ---------- */

    const [fromUserAccount, toUserAccount] = await Promise.all([
      AccountModel.findById(fromAccount).select("status currency"),
      AccountModel.findById(toAccount)
        .populate("user", "name email")
        .select("status currency user"),
    ]);

    if (!fromUserAccount || !toUserAccount) {
      return res.status(400).json({ message: "Invalid account IDs" });
    }

    /* ---------- Idempotency ---------- */

    const existingTransaction = await TransactionModel.findOne({
      idempotencyKey,
    });

    if (existingTransaction) {
      return res.status(400).json({
        message: `Transaction already ${existingTransaction.status.toLowerCase()}`,
        transaction: existingTransaction,
      });
    }

    /* ---------- Account validations ---------- */

    if (
      fromUserAccount.status !== "ACTIVE" ||
      toUserAccount.status !== "ACTIVE"
    ) {
      return res
        .status(400)
        .json({ message: "One or both accounts are inactive" });
    }

    if (fromUserAccount.currency !== toUserAccount.currency) {
      return res
        .status(400)
        .json({ message: "Accounts must use same currency" });
    }

    let transaction;

    /* =====================================================
       DATABASE TRANSACTION
    ===================================================== */

    await session.withTransaction(async () => {

      const freshAccount = await AccountModel
        .findById(fromAccount)
        .session(session);

      const balance = await freshAccount.getBalance();

      if (balance < amount) {
        throw new Error("Insufficient balance");
      }

      const [createdTransaction] = await TransactionModel.create(
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

      transaction = createdTransaction;

      await LedgerModel.create(
        [
          {
            account: fromAccount,
            amount,
            transaction: transaction._id,
            type: "DEBIT",
          },
          {
            account: toAccount,
            amount,
            transaction: transaction._id,
            type: "CREDIT",
          },
        ],
        { session }
      );

      transaction.status = "COMPLETED";
      await transaction.save({ session });

    });

    session.endSession();

    /* ---------- Send Email (async) ---------- */

    resolveAccountUser(toUserAccount)
      .then((receiverUser) => {
        if (!receiverUser) return;

        sendTransactionEmail(
          { email: req.user.email, name: req.user.name },
          receiverUser,
          amount,
          fromUserAccount.currency
        ).catch((err) =>
          console.error("Transaction email failed:", err)
        );
      })
      .catch((err) =>
        console.error("resolveAccountUser failed:", err)
      );

    res.status(201).json({
      message: "Transaction processed successfully",
      transaction,
    });

  } catch (error) {

    session.endSession();

    console.error("Transaction error:", error.message);

    if (
      error.code === 11000 &&
      error.keyPattern &&
      error.keyPattern.idempotencyKey
    ) {
      const existingTx = await TransactionModel.findOne({
        idempotencyKey: req.body.idempotencyKey,
      });

      return res.status(400).json({
        message: existingTx
          ? `Transaction already ${existingTx.status.toLowerCase()}`
          : "Transaction already processed",
        transaction: existingTx,
      });
    }

    if (error.message === "Insufficient balance") {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    res.status(500).json({
      message: "Transaction failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}

/* =====================================================
   SYSTEM → USER FUNDING TRANSACTION
===================================================== */

export async function createInitialFundTransaction(req, res) {
  const session = await mongoose.startSession();

  try {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "Invalid transaction amount",
      });
    }

    const [toUserAccount, fromUserAccount] = await Promise.all([
      AccountModel.findById(toAccount)
        .populate("user", "name email")
        .select("status currency user"),

      AccountModel.findOne({
        systemUser: true,
        user: req.user._id,
      }).select("status currency"),
    ]);

    if (!toUserAccount) {
      return res.status(400).json({
        message: "Invalid destination account",
      });
    }

    if (!fromUserAccount) {
      return res.status(400).json({
        message: "System account not found",
      });
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

    let transaction;

    await session.withTransaction(async () => {

      const [createdTransaction] = await TransactionModel.create(
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

      transaction = createdTransaction;

      await LedgerModel.create(
        [
          {
            account: fromUserAccount._id,
            amount,
            transaction: transaction._id,
            type: "DEBIT",
          },
          {
            account: toUserAccount._id,
            amount,
            transaction: transaction._id,
            type: "CREDIT",
          },
        ],
        { session }
      );

      transaction.status = "COMPLETED";
      await transaction.save({ session });

    });

    session.endSession();

    resolveAccountUser(toUserAccount)
      .then((receiverUser) => {
        if (!receiverUser) return;

        sendTransactionEmail(
          { email: req.user.email, name: req.user.name },
          receiverUser,
          amount,
          fromUserAccount.currency
        ).catch((err) =>
          console.error("Transaction email failed:", err)
        );
      })
      .catch((err) =>
        console.error("resolveAccountUser failed:", err)
      );

    res.status(201).json({
      message: "Initial fund transaction successful",
      transaction,
    });

  } catch (error) {

    session.endSession();

    console.error("Transaction error:", error.message);

    if (
      error.code === 11000 &&
      error.keyPattern &&
      error.keyPattern.idempotencyKey
    ) {
      const existingTx = await TransactionModel.findOne({
        idempotencyKey: req.body.idempotencyKey,
      });

      return res.status(400).json({
        message: existingTx
          ? `Transaction already ${existingTx.status.toLowerCase()}`
          : "Transaction already processed",
        transaction: existingTx,
      });
    }

    res.status(500).json({
      message: "Transaction failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}