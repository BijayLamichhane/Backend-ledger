import AccountModel from '../models/account.model.js';

export async function createAccountControlller(req, res) {
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