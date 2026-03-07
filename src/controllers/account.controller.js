import AccountModel from '../models/account.model.js';

export async function createAccountController(req, res) {
  try {
    const user = req.user;

    const account = await AccountModel.create({
      user: user._id
    });

    res.status(201).json({account});
  } catch (error) {
    console.error("Account creation error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getUsersAccountsController(req, res) {
  try {
    const user = req.user;

    const accounts = await AccountModel.find({
      user: user._id
    });

    res.status(200).json({accounts});
  } catch (error) {
    console.error("Account retrieval error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAccountBalanceController(req, res) {
  try {
    const accountId = req.params.accountId;

    const account = await AccountModel.findOne({
      _id: accountId,
      user: req.user._id
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const balance = await account.getBalance();

    res.status(200).json({
      accountId,
      balance
    });
  } catch (error) {
    console.error("Account balance retrieval error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}