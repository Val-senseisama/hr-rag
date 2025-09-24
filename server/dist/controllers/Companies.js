import asyncHandler from "express-async-handler";
import Company from "../models/Company.js";
import User from "../models/User.js";
import { sendMail } from "../helpers/SendMail.js";
// POST /api/companies
export const createCompany = asyncHandler(async (req, res) => {
    const { name, description } = req.body || {};
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!name)
        return res.status(400).json({ message: "name is required" });
    const exists = await Company.findOne({ name });
    if (exists)
        return res.status(409).json({ message: "Company already exists" });
    const company = await Company.create({
        name,
        description,
        users: [authUser.id]
    });
    // Set admin role for the creator
    const adminRole = {
        company: company._id,
        read: 1,
        create: 1,
        update: 1,
        delete: 1
    };
    // Add company to user's companies and set admin role
    const user = await User.findById(authUser.id);
    if (user) {
        user.companies.push(company._id);
        // Remove any existing role for this company and add admin role
        user.role = user.role.filter((r) => String(r.company) !== String(company._id));
        user.role.push(adminRole);
        await user.save();
    }
    return res.status(201).json({
        message: "Company created",
        company: {
            _id: company._id,
            name: company.name,
            description: company.description,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
            createdBy: {
                _id: authUser.id,
                name: authUser.name
            },
            members: [{
                    _id: authUser.id,
                    name: authUser.name,
                    email: authUser.email,
                    role: [adminRole]
                }]
        }
    });
});
// PATCH /api/companies/:companyId
export const updateCompany = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { name, description } = req.body || {};
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    const company = await Company.findById(companyId);
    if (!company)
        return res.status(404).json({ message: "Company not found" });
    // Check if user has update permission for this company
    const user = await User.findById(authUser.id);
    if (!user)
        return res.status(404).json({ message: "User not found" });
    const userRole = user.role.find((r) => String(r.company) === String(companyId));
    if (!userRole || userRole.update === 0) {
        return res.status(403).json({ message: "Insufficient permissions" });
    }
    const updateData = {};
    if (name)
        updateData.name = name;
    if (description !== undefined)
        updateData.description = description;
    const updatedCompany = await Company.findByIdAndUpdate(companyId, updateData, { new: true });
    return res.status(200).json({
        message: "Company updated",
        company: updatedCompany
    });
});
// POST /api/companies/:companyId/users/:userId
export const addUserToCompany = asyncHandler(async (req, res) => {
    const { companyId, userId } = req.params;
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!companyId || !userId)
        return res.status(400).json({ message: "companyId and userId are required" });
    const company = await Company.findById(companyId);
    const user = await User.findById(userId);
    if (!company || !user)
        return res.status(404).json({ message: "Company or User not found" });
    // Check if the requesting user is the company owner (has delete permission)
    const requestingUser = await User.findById(authUser.id);
    if (!requestingUser)
        return res.status(404).json({ message: "User not found" });
    const userRole = requestingUser.role.find((r) => String(r.company) === String(companyId));
    if (!userRole || userRole.delete === 0) {
        return res.status(403).json({ message: "Only company owners can add users" });
    }
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
        // Set default role for the new user (read only)
        const defaultRole = {
            company: companyObjectId,
            read: 1,
            create: 0,
            update: 0,
            delete: 0
        };
        // Remove any existing role for this company and add default role
        user.role = user.role.filter((r) => String(r.company) !== String(companyId));
        user.role.push(defaultRole);
        await user.save();
    }
    return res.status(200).json({ message: "User added to company" });
});
// DELETE /api/companies/:companyId/users/:userId
export const removeUserFromCompany = asyncHandler(async (req, res) => {
    const { companyId, userId } = req.params;
    if (!companyId || !userId)
        return res.status(400).json({ message: "companyId and userId are required" });
    const company = await Company.findById(companyId);
    const user = await User.findById(userId);
    if (!company || !user)
        return res.status(404).json({ message: "Company or User not found" });
    company.users = company.users.filter((u) => String(u) !== String(user._id));
    user.companies = user.companies.filter((c) => String(c) !== String(company._id));
    await Promise.all([company.save(), user.save()]);
    return res.status(200).json({ message: "User removed from company" });
});
// GET /api/users/:userId/companies
export const getUserCompanies = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '0')))) || (Number(process.env.PAGINATION_LIMIT) || 30);
    const skip = (page - 1) * limit;
    const user = await User.findById(userId).populate({
        path: "companies",
        options: { skip, limit, sort: { updatedAt: -1 } },
        populate: {
            path: "users",
            select: "name email role"
        }
    });
    if (!user)
        return res.status(404).json({ message: "User not found" });
    // Transform companies to include createdBy and members
    const companies = user.companies.map((company) => {
        // Determine creator as the first user in the company's users array
        const first = company.users?.[0];
        const isDoc = first && typeof first === 'object' && first._id;
        const creatorId = isDoc ? String(first._id) : String(first || '');
        const creatorName = isDoc && first.name ? first.name : 'Unknown';
        return {
            _id: company._id,
            name: company.name,
            description: company.description,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt,
            createdBy: {
                _id: creatorId,
                name: creatorName
            },
            members: (company.users || []).map((member) => ({
                _id: String((member && member._id) || member),
                name: member?.name || 'Unknown',
                email: member?.email || '',
                role: (member?.role || []).filter((r) => String(r.company) === String(company._id))
            }))
        };
    });
    // total count for pagination
    const total = await User.aggregate([
        { $match: { _id: user._id } },
        { $project: { count: { $size: "$companies" } } }
    ]);
    const totalCount = total?.[0]?.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    return res.status(200).json({ companies, meta: { page, limit, total: totalCount, totalPages } });
});
// DELETE /api/companies/:companyId
export const deleteCompany = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const company = await Company.findById(companyId);
    if (!company)
        return res.status(404).json({ message: "Company not found" });
    // Remove company from users.companies as well
    await User.updateMany({ _id: { $in: company.users } }, { $pull: { companies: company._id } });
    await company.deleteOne();
    return res.status(200).json({ message: "Company deleted" });
});
// POST /api/companies/:companyId/invite
export const inviteUserByEmail = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { email } = req.body || {};
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!companyId)
        return res.status(400).json({ message: "companyId is required" });
    if (!email || typeof email !== 'string')
        return res.status(400).json({ message: "Valid email is required" });
    const company = await Company.findById(companyId);
    if (!company)
        return res.status(404).json({ message: "Company not found" });
    // Only owners (delete:1) can invite
    const inviter = await User.findById(authUser.id);
    if (!inviter)
        return res.status(404).json({ message: "User not found" });
    const inviterRole = inviter.role.find((r) => String(r.company) === String(companyId));
    if (!inviterRole || inviterRole.delete === 0) {
        return res.status(403).json({ message: "Only company owners can invite users" });
    }
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        // Add to company if not already a member
        const isInCompany = company.users.some((u) => String(u) === String(existingUser._id));
        if (!isInCompany) {
            company.users.push(existingUser._id);
            await company.save();
        }
        const hasCompany = existingUser.companies.some((c) => String(c) === String(company._id));
        if (!hasCompany) {
            existingUser.companies.push(company._id);
            // Default role: Viewer
            const defaultRole = {
                company: company._id,
                read: 1,
                create: 0,
                update: 0,
                delete: 0,
            };
            existingUser.role = existingUser.role.filter((r) => String(r.company) !== String(companyId));
            existingUser.role.push(defaultRole);
            await existingUser.save();
        }
        // Notify existing user
        try {
            await sendMail({
                to: existingUser.email,
                subject: `Added to ${company.name} on ValTech HRBot`,
                username: existingUser.name || existingUser.email,
                message: `Hello [username],<br/>You have been added to <strong>${company.name}</strong> on ValTech HRBot.<br/><br/>Go to Companies to access the workspace.`,
            });
        }
        catch { }
        return res.status(200).json({ message: "User added to company and notified" });
    }
    else {
        // Generate 6-character token for non-existing users
        const token = Math.random().toString(36).substring(2, 8).toUpperCase();
        // Add invite to company
        company.invites.push({
            email: email.toLowerCase(),
            token,
            invitedAt: new Date()
        });
        await company.save();
        // Send invite to sign up with token
        const appUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const signupUrl = `${appUrl}/register?company=${company._id}&email=${encodeURIComponent(email)}&token=${token}`;
        try {
            await sendMail({
                to: email,
                subject: `Invitation to join ${company.name} on ValTech HRBot`,
                username: email.split('@')[0] || email,
                message: `Hello [username],<br/>You were invited to join <strong>${company.name}</strong> on ValTech HRBot.<br/><br/>Create your account here:<br/><a href="${signupUrl}">${signupUrl}</a><br/><br/>Or use this token to join: <strong>${token}</strong>`,
            });
        }
        catch { }
        return res.status(200).json({ message: "Invitation email sent with token" });
    }
});
// POST /api/companies/join-by-token
export const joinCompanyByToken = asyncHandler(async (req, res) => {
    const { token } = req.body || {};
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!token)
        return res.status(400).json({ message: "Token is required" });
    // Find company with this token
    const company = await Company.findOne({
        "invites.token": token.toUpperCase()
    });
    if (!company)
        return res.status(404).json({ message: "Invalid or expired token" });
    // Check if user is already in the company
    const isAlreadyMember = company.users.some((u) => String(u) === String(authUser.id));
    if (isAlreadyMember) {
        return res.status(400).json({ message: "You are already a member of this company" });
    }
    // Add user to company
    company.users.push(authUser.id);
    // Remove the used invite
    company.invites = company.invites.filter(invite => invite.token !== token.toUpperCase());
    await company.save();
    // Add company to user's companies
    const user = await User.findById(authUser.id);
    if (user) {
        user.companies.push(company._id);
        // Set default role for the new user (read only)
        const defaultRole = {
            company: company._id,
            read: 1,
            create: 0,
            update: 0,
            delete: 0
        };
        // Remove any existing role for this company and add default role
        user.role = user.role.filter((r) => String(r.company) !== String(company._id));
        user.role.push(defaultRole);
        await user.save();
    }
    return res.status(200).json({
        message: "Successfully joined company",
        company: {
            _id: company._id,
            name: company.name,
            description: company.description
        }
    });
});
// DELETE /api/companies/:companyId/members/:userId
export const removeMemberFromCompany = asyncHandler(async (req, res) => {
    const { companyId, userId } = req.params;
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!companyId || !userId)
        return res.status(400).json({ message: "companyId and userId are required" });
    const company = await Company.findById(companyId);
    if (!company)
        return res.status(404).json({ message: "Company not found" });
    // Check if requesting user has delete permission (owner)
    const requestingUser = await User.findById(authUser.id);
    if (!requestingUser)
        return res.status(404).json({ message: "User not found" });
    const userRole = requestingUser.role.find((r) => String(r.company) === String(companyId));
    if (!userRole || userRole.delete === 0) {
        return res.status(403).json({ message: "Only company owners can remove members" });
    }
    // Prevent removing the last owner
    const targetUser = await User.findById(userId);
    if (!targetUser)
        return res.status(404).json({ message: "User not found" });
    const targetUserRole = targetUser.role.find((r) => String(r.company) === String(companyId));
    if (targetUserRole && targetUserRole.delete === 1) {
        // Check if this is the only owner
        const owners = await User.find({
            "role.company": companyId,
            "role.delete": 1
        });
        if (owners.length <= 1) {
            return res.status(400).json({ message: "Cannot remove the last owner of the company" });
        }
    }
    // Remove user from company
    company.users = company.users.filter((u) => String(u) !== String(userId));
    await company.save();
    // Remove company from user's companies and roles
    targetUser.companies = targetUser.companies.filter((c) => String(c) !== String(companyId));
    targetUser.role = targetUser.role.filter((r) => String(r.company) !== String(companyId));
    await targetUser.save();
    return res.status(200).json({ message: "Member removed from company" });
});
// PATCH /api/companies/:companyId/members/:userId/permissions
export const updateMemberPermissions = asyncHandler(async (req, res) => {
    const { companyId, userId } = req.params;
    const { read, create, update, delete: deletePerm } = req.body || {};
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!companyId || !userId)
        return res.status(400).json({ message: "companyId and userId are required" });
    const company = await Company.findById(companyId);
    if (!company)
        return res.status(404).json({ message: "Company not found" });
    // Check if requesting user has delete permission (owner)
    const requestingUser = await User.findById(authUser.id);
    if (!requestingUser)
        return res.status(404).json({ message: "User not found" });
    const userRole = requestingUser.role.find((r) => String(r.company) === String(companyId));
    if (!userRole || userRole.delete === 0) {
        return res.status(403).json({ message: "Only company owners can update permissions" });
    }
    const targetUser = await User.findById(userId);
    if (!targetUser)
        return res.status(404).json({ message: "User not found" });
    // Check if user is in the company
    const isInCompany = company.users.some((u) => String(u) === String(userId));
    if (!isInCompany) {
        return res.status(400).json({ message: "User is not a member of this company" });
    }
    // Prevent removing delete permission from the last owner
    if (deletePerm === 0) {
        const owners = await User.find({
            "role.company": companyId,
            "role.delete": 1
        });
        if (owners.length <= 1 && targetUser.role.some((r) => String(r.company) === String(companyId) && r.delete === 1)) {
            return res.status(400).json({ message: "Cannot remove owner permissions from the last owner" });
        }
    }
    // Update user's role for this company
    const newRole = {
        company: companyId,
        read: read !== undefined ? (read ? 1 : 0) : 1,
        create: create !== undefined ? (create ? 1 : 0) : 0,
        update: update !== undefined ? (update ? 1 : 0) : 0,
        delete: deletePerm !== undefined ? (deletePerm ? 1 : 0) : 0
    };
    // Remove existing role and add new one
    targetUser.role = targetUser.role.filter((r) => String(r.company) !== String(companyId));
    targetUser.role.push(newRole);
    await targetUser.save();
    return res.status(200).json({
        message: "Member permissions updated",
        role: newRole
    });
});
// GET /api/companies/:companyId/members
export const getCompanyMembers = asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const authUser = req.user;
    if (!authUser)
        return res.status(401).json({ message: "Unauthorized" });
    if (!companyId)
        return res.status(400).json({ message: "companyId is required" });
    const company = await Company.findById(companyId).populate({
        path: "users",
        select: "name email role"
    });
    if (!company)
        return res.status(404).json({ message: "Company not found" });
    // Check if user has read permission for this company
    const requestingUser = await User.findById(authUser.id);
    if (!requestingUser)
        return res.status(404).json({ message: "User not found" });
    const userRole = requestingUser.role.find((r) => String(r.company) === String(companyId));
    if (!userRole || userRole.read === 0) {
        return res.status(403).json({ message: "Insufficient permissions" });
    }
    const members = company.users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.find((r) => String(r.company) === String(companyId)) || {
            read: 0,
            create: 0,
            update: 0,
            delete: 0
        }
    }));
    return res.status(200).json({ members });
});
