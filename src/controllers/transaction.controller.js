import AccountModel from "../models/account.model.js";
import TransactionModel from "../models/transaction.model.js";


export async function createTransaction(req, res) {
  try {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    // Validate request body
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const formUserAccount = await AccountModel.findById({_id: fromAccount});
    const toUserAccount = await AccountModel.findById({_id: toAccount}); 

    if (!formUserAccount || !toUserAccount) {
      return res.status(400).json({ message: "Invalid account IDs" });
    }

    const isTransactionAlreadyExist = await TransactionModel.findOne({
      idempotencyKey,
    });

    if (isTransactionAlreadyExist) {
      if (isTransactionAlreadyExist.status === "COMPLETED") {
        return res.status(400).json({ message: "Transaction already processed", transaction: isTransactionAlreadyExist });
      } 

      if (isTransactionAlreadyExist.status === "PENDING") {
        return res.status(400).json({ message: "Transaction is pending"});
      }

      if (isTransactionAlreadyExist.status === "FAILED") {
        return res.status(400).json({ message: "Transaction failed, please try again"});
      }

      if (isTransactionAlreadyExist.status === "REVERSED") {
        return res.status(400).json({ message: "Transaction reversed, please try again"});
      }
    }

    if (formUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
      return res.status(400).json({ message: "One or both accounts are inactive" });
    }

    if (formUserAccount.currency !== toUserAccount.currency) {
      return res.status(400).json({ message: "Accounts must be in the same currency" });
    }

    const fromAccountBalance = await formUserAccount.getBalance();
    if (fromAccountBalance.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

  } catch (error) {
    console.error("Transaction error:", error.message);
    res.status(500).json({ message: error.message });
  }
}