"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdmin = buildAdmin;
const client_1 = require("@prisma/client");
const prisma_1 = require("./prisma");
const prismaModels = Object.fromEntries(client_1.Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));
async function buildAdmin() {
    const [{ default: AdminJS }, { default: AdminJSExpress }, prismaAdapter] = await Promise.all([
        Promise.resolve().then(() => __importStar(require('adminjs'))),
        Promise.resolve().then(() => __importStar(require('@adminjs/express'))),
        Promise.resolve().then(() => __importStar(require('@adminjs/prisma'))),
    ]);
    const { Database, Resource } = prismaAdapter;
    AdminJS.registerAdapter({ Database, Resource });
    const admin = new AdminJS({
        rootPath: '/admin',
        branding: {
            companyName: 'DreamyVoice Admin',
        },
        resources: [
            { resource: { model: prismaModels.User, client: prisma_1.prisma }, options: { navigation: 'Контент' } },
            { resource: { model: prismaModels.Title, client: prisma_1.prisma }, options: { navigation: 'Контент' } },
            { resource: { model: prismaModels.Episode, client: prisma_1.prisma }, options: { navigation: 'Контент' } },
            { resource: { model: prismaModels.Comment, client: prisma_1.prisma }, options: { navigation: 'Модерация' } },
            { resource: { model: prismaModels.Session, client: prisma_1.prisma }, options: { navigation: 'Техническое' } },
        ],
    });
    const router = AdminJSExpress.buildRouter(admin);
    return { admin, router };
}
