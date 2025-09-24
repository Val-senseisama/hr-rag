import { Router } from "express";
import { createCompany, addUserToCompany, removeUserFromCompany, getUserCompanies, deleteCompany, updateCompany, inviteUserByEmail, joinCompanyByToken, removeMemberFromCompany, updateMemberPermissions, getCompanyMembers } from "../controllers/Companies.js";
import { createContext } from "../middleware/CreateContext.js";

const router = Router();

router.post("/companies", createContext, createCompany);
router.patch("/companies/:companyId", createContext, updateCompany);
router.post("/companies/:companyId/users/:userId", createContext, addUserToCompany);
router.post("/companies/:companyId/invite", createContext, inviteUserByEmail);
router.delete("/companies/:companyId/users/:userId", createContext, removeUserFromCompany);
router.get("/users/:userId/companies", createContext, getUserCompanies);
router.delete("/companies/:companyId", createContext, deleteCompany);

// New member management routes
router.post("/companies/join-by-token", createContext, joinCompanyByToken);
router.get("/companies/:companyId/members", createContext, getCompanyMembers);
router.delete("/companies/:companyId/members/:userId", createContext, removeMemberFromCompany);
router.patch("/companies/:companyId/members/:userId/permissions", createContext, updateMemberPermissions);

export default router;


