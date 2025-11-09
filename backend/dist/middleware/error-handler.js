"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const http_error_1 = require("../utils/http-error");
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: 'Validation failed',
            issues: err.issues,
        });
    }
    if (err instanceof http_error_1.HttpError) {
        return res.status(err.status).json({ message: err.message });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
};
exports.errorHandler = errorHandler;
