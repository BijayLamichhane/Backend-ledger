import UserModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { sendWelcomeEmail } from "../services/email.service.js";

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
}

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
export async function userRegisterController(req, res) {
  try {
    const { email, name, password } = req.body;

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    if (!email || !name || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const newUser = await UserModel.create({
      email: normalizedEmail,
      name: name.trim(),
      password,
    });

    const token = generateToken(newUser._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
      },
    });

    // Send email asynchronously (non-blocking)
    sendWelcomeEmail(newUser.email, newUser.name).catch((err) =>
      console.error("Welcome email failed:", err)
    );
  } catch (error) {
    console.error("Error registering user:", error);

    res.status(500).json({
      message: "Error registering user",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
export async function userLoginController(req, res) {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await UserModel.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "User logged in successfully",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);

    res.status(500).json({
      message: "Error logging in user",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}