import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createAccountController, getUsersAccountsController, getAccountBalanceController } from '../controllers/account.controller.js';

const router = express.Router();

/**
 * @route POST /api/accounts
 * @desc Create a new account
 * @access Private
 */
router.post('/', authMiddleware, createAccountController);
router.get('/', authMiddleware, getUsersAccountsController);
router.get('/balance/:accountId', authMiddleware, getAccountBalanceController);



export default router;