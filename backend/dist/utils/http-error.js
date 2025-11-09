"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.assertCondition = assertCondition;
class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'HttpError';
    }
}
exports.HttpError = HttpError;
function assertCondition(condition, status, message) {
    if (!condition) {
        throw new HttpError(status, message);
    }
}
