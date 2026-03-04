import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";

// Helper to extract token
function getToken(req) {
  return req.cookies.token || req.headers.authorization?.split(" ")[1];
}

// Base authentication middleware
export async function authMiddleware(req, res, next) {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await UserModel.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth error:", error.message);

    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
}

// System user middleware (requires auth first)
export async function authSystemUserMiddleware(req, res, next) {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await UserModel.findById(decoded.userId)
      .select("-password +systemUser");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.systemUser) {
      return res.status(403).json({ message: "System user access required" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("System user auth error:", error.message);

    return res.status(403).json({
      message: "System user authentication failed",
    });
  }
}