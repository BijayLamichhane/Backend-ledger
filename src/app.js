import express from 'express';
import authRoutes from './routes/auth.routes.js';
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




export default app;