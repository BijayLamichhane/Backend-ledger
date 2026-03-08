import express from 'express';
import { userLoginController, userLogoutController, userRegisterController } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', userRegisterController);

router.post('/login', userLoginController);

router.post('/logout', userLogoutController);


export default router;