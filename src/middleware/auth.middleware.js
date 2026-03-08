import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import TokenBlacklist from "../models/blacklist.model.js";

/* =========================
   Extract JWT Token
========================= */

function getToken(req) {
  if (req.cookies?.token) return req.cookies.token;

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
}

/* =========================
   Base Auth Logic
========================= */

async function authenticateUser(req, requireSystemUser = false) {
  const token = getToken(req);

  if (!token) {
    throw new Error("Authentication required");
  }

  const isBlacklisted = await TokenBlacklist.exists({ token });

  if (isBlacklisted) {
    throw new Error("Token blacklisted");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await UserModel.findById(decoded.userId)
    .select(requireSystemUser ? "-password +systemUser" : "-password");

  if (!user) {
    throw new Error("User not found");
  }

  if (requireSystemUser && !user.systemUser) {
    throw new Error("System user access required");
  }

  return user;
}

/* =========================
   Normal User Auth
========================= */

export async function authMiddleware(req, res, next) {
  try {
    const user = await authenticateUser(req);

    req.user = user;

    next();

  } catch (error) {

    console.error("Auth error:", error.message);

    return res.status(403).json({
      message: error.message || "Authentication failed",
    });
  }
}

/* =========================
   System User Auth
========================= */

export async function authSystemUserMiddleware(req, res, next) {
  try {
    const user = await authenticateUser(req, true);

    req.user = user;

    next();

  } catch (error) {

    console.error("System user auth error:", error.message);

    return res.status(403).json({
      message: error.message || "System user authentication failed",
    });
  }
}