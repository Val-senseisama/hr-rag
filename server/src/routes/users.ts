import { Router } from "express";
import { register, login, getMe, updateUser, forgotPassword, resetPassword } from "../controllers/Users.js";
import { createContext } from "../middleware/CreateContext.js";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.get("/users/me", createContext, getMe);
router.patch("/users/me", createContext, updateUser);

export default router;


