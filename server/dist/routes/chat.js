import { Router } from "express";
import { chat } from "../controllers/Chat.js";
import { createContext } from "../middleware/CreateContext.js";
const router = Router();
router.post('/chat', createContext, chat);
export default router;
