import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createAccountControlller } from '../controllers/account.controller.js';

const router = express.Router();

/**
 * @route POST /account/create
 * @desc Create a new account
 * @access Private
 */
router.post('/', authMiddleware, createAccountControlller);



export default router;