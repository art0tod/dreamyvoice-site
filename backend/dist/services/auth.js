"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.authenticateUser = authenticateUser;
exports.toPublicUser = toPublicUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../prisma");
const http_error_1 = require("../utils/http-error");
const SALT_ROUNDS = 12;
async function registerUser(input) {
    const username = input.username.trim();
    const existing = await prisma_1.prisma.user.findUnique({ where: { username } });
    if (existing) {
        throw new http_error_1.HttpError(409, 'Username is already taken');
    }
    const totalUsers = await prisma_1.prisma.user.count();
    const role = totalUsers === 0 ? 'ADMIN' : 'USER';
    const passwordHash = await bcryptjs_1.default.hash(input.password, SALT_ROUNDS);
    const user = await prisma_1.prisma.user.create({
        data: {
            username,
            passwordHash,
            role,
        },
    });
    return user;
}
async function authenticateUser(input) {
    const username = input.username.trim();
    const user = await prisma_1.prisma.user.findUnique({ where: { username } });
    if (!user) {
        return null;
    }
    const isValid = await bcryptjs_1.default.compare(input.password, user.passwordHash);
    if (!isValid) {
        return null;
    }
    return user;
}
function toPublicUser(user) {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        avatarKey: user.avatarKey,
        createdAt: user.createdAt,
    };
}
