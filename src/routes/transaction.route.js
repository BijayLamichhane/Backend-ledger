import express from "express";
import { authMiddleware, authSystemUserMiddleware } from "../middleware/auth.middleware.js";
import { createInitialFundTransaction, createTransaction } from "../controllers/transaction.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createTransaction);

router.post("/system/inital-fund", authSystemUserMiddleware, createInitialFundTransaction);

export default router;
