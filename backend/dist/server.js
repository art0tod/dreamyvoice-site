"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./env");
const session_1 = require("./middleware/session");
const auth_1 = require("./routes/auth");
const titles_1 = require("./routes/titles");
const error_handler_1 = require("./middleware/error-handler");
const admin_1 = require("./admin");
const require_admin_1 = require("./middleware/require-admin");
const admin_auth_1 = require("./routes/admin-auth");
const media_1 = require("./routes/media");
const profile_1 = require("./routes/profile");
async function bootstrap() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: false }));
    app.use((0, cookie_parser_1.default)(env_1.env.SESSION_COOKIE_SECRET));
    app.use(session_1.sessionMiddleware);
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });
    app.use('/auth', auth_1.authRouter);
    app.use('/titles', titles_1.titlesRouter);
    app.use('/admin/auth', admin_auth_1.adminAuthRouter);
    app.use('/media', media_1.mediaRouter);
    app.use('/profile', profile_1.profileRouter);
    const { admin, router } = await (0, admin_1.buildAdmin)();
    app.use(admin.options.rootPath, require_admin_1.requireAdmin, router);
    app.use(error_handler_1.errorHandler);
    app.listen(env_1.env.PORT, () => {
        console.log(`API running on http://localhost:${env_1.env.PORT}`);
    });
}
bootstrap().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
});
