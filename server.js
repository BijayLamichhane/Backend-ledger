import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Node to use Google DNS


import dotenv from "dotenv";
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';

connectDB();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});