"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompany = exports.getUserCompanies = exports.removeUserFromCompany = exports.addUserToCompany = exports.createCompany = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Company_js_1 = __importDefault(require("../models/Company.js"));
const User_js_1 = __importDefault(require("../models/User.js"));
// POST /api/companies
exports.createCompany = (0, express_async_handler_1.default)(async (req, res) => {
    const { name, logo } = req.body || {};
    if (!name)
        return res.status(400).json({ message: "name is required" });
    const exists = await Company_js_1.default.findOne({ name });
    if (exists)
        return res.status(409).json({ message: "Company already exists" });
    const company = await Company_js_1.default.create({ name, logo, users: [] });
    return res.status(201).json({ message: "Company created", company });
});
// POST /api/companies/:companyId/users/:userId
exports.addUserToCompany = (0, express_async_handler_1.default)(async (req, res) => {
    const { companyId, userId } = req.params;
    if (!companyId || !userId)
        return res.status(400).json({ message: "companyId and userId are required" });
    const company = await Company_js_1.default.findById(companyId);
    const user = await User_js_1.default.findById(userId);
    if (!company || !user)
        return res.status(404).json({ message: "Company or User not found" });
    const userObjectId = user._id;
    const companyObjectId = company._id;
    // Add user to company.users if not present
    if (!company.users.some((u) => String(u) === String(userObjectId))) {
        company.users.push(userObjectId);
        await company.save();
    }
    // Add company to user.companies if not present
    if (!user.companies.some((c) => String(c) === String(companyObjectId))) {
        user.companies.push(companyObjectId);
        await user.save();
    }
    return res.status(200).json({ message: "User added to company" });
});
// DELETE /api/companies/:companyId/users/:userId
exports.removeUserFromCompany = (0, express_async_handler_1.default)(async (req, res) => {
    const { companyId, userId } = req.params;
    if (!companyId || !userId)
        return res.status(400).json({ message: "companyId and userId are required" });
    const company = await Company_js_1.default.findById(companyId);
    const user = await User_js_1.default.findById(userId);
    if (!company || !user)
        return res.status(404).json({ message: "Company or User not found" });
    company.users = company.users.filter((u) => String(u) !== String(user._id));
    user.companies = user.companies.filter((c) => String(c) !== String(company._id));
    await Promise.all([company.save(), user.save()]);
    return res.status(200).json({ message: "User removed from company" });
});
// GET /api/users/:userId/companies
exports.getUserCompanies = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '0')))) || (Number(process.env.PAGINATION_LIMIT) || 30);
    const skip = (page - 1) * limit;
    const user = await User_js_1.default.findById(userId).populate({ path: "companies", options: { skip, limit, sort: { updatedAt: -1 } } });
    if (!user)
        return res.status(404).json({ message: "User not found" });
    // total count for pagination
    const total = await User_js_1.default.aggregate([
        { $match: { _id: user._id } },
        { $project: { count: { $size: "$companies" } } }
    ]);
    const totalCount = total?.[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    return res.status(200).json({ companies: user.companies, meta: { page, limit, total: totalCount, totalPages } });
});
// DELETE /api/companies/:companyId
exports.deleteCompany = (0, express_async_handler_1.default)(async (req, res) => {
    const { companyId } = req.params;
    const company = await Company_js_1.default.findById(companyId);
    if (!company)
        return res.status(404).json({ message: "Company not found" });
    // Remove company from users.companies as well
    await User_js_1.default.updateMany({ _id: { $in: company.users } }, { $pull: { companies: company._id } });
    await company.deleteOne();
    return res.status(200).json({ message: "Company deleted" });
});
