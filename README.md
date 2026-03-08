# Backend Ledger Application

This is a Node.js and Express-based backend ledger application designed to handle secure user authentication, account management, and financial transactions using robust tracking mechanisms. 

## Tech Stack
- **Node.js**: JavaScript runtime environment
- **Express**: Fast, unopinionated, minimalist web framework for Node.js
- **MongoDB & Mongoose**: NoSQL database and Object Data Modeling (ODM) library
- **JWT (JSON Web Tokens)**: Secure token-based user authentication
- **Bcrypt.js**: Library for secure password hashing
- **Nodemailer**: Module for email services

## Features
- **User Authentication**: Register, Login, Logout with JWT and cookie management.
- **Account Management**: Create bank accounts dynamically and view balances.
- **Transactions**: Secure intra-system transactions with initial funding capabilities for a 'system' user.
- **Ledger Tracking**: Tracks all transactions systematically, managing debit/credit ledgers for accuracy and auditing.
- **Middleware Protections**: Route guards to ensure actions are requested by authenticated real or system users.

## API Endpoints

### Auth (`/api/auth`)
- `POST /register`: Register a new user
- `POST /login`: Login user (issues JWT in a secure cookie)
- `POST /logout`: Logout user (clears auth cookie)

### Accounts (`/api/accounts`)
- `POST /`: Create a new account (Protected)
- `GET /`: Get accounts for the authenticated user (Protected)
- `GET /balance/:accountId`: Fetch balance for a specific account (Protected)

### Transactions (`/api/transactions`)
- `POST /`: Initialize a new transaction between accounts (Protected)
- `POST /system/inital-fund`: Initial system funding endpoint (System Protected)

## Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd BACKEND-LEDGER
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root of the project with the following configuration:
   ```env
   PORT=3000
   MONGODB_URI=<your_mongodb_connection_string>
   JWT_SECRET=<your_jwt_secret_key>
   # Add your specific nodemailer/smtp configs if necessary
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

5. **Start the Production Server:**
   ```bash
   npm start
   ```

