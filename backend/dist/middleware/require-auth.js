"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const http_error_1 = require("../utils/http-error");
const requireAuth = (req, _res, next) => {
    if (!req.currentUser) {
        throw new http_error_1.HttpError(401, 'Authentication required');
    }
    next();
};
exports.requireAuth = requireAuth;
