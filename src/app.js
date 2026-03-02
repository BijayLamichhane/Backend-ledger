import express from 'express';
import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.route.js';
import transactionRoutes from './routes/transaction.route.js';
import cookieParser from 'cookie-parser';

const app = express();

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);




export default app;