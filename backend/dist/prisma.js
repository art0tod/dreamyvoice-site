"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const env_1 = require("./env");
const basePrisma = new client_1.PrismaClient();
exports.prisma = basePrisma.$extends({
    query: {
        episode: {
            create({ args, query }) {
                validateEpisodePayload(args.data);
                return query(args);
            },
            update({ args, query }) {
                validateEpisodePayload(args.data);
                return query(args);
            },
            upsert({ args, query }) {
                validateEpisodePayload(args.create);
                validateEpisodePayload(args.update);
                return query(args);
            },
            createMany({ args, query }) {
                validateEpisodePayload(args.data);
                return query(args);
            },
            updateMany({ args, query }) {
                validateEpisodePayload(args.data);
                return query(args);
            },
        },
    },
});
function validateEpisodePayload(payload) {
    const values = collectPlayerSrcValues(payload);
    values.forEach(assertAllowedHost);
}
function collectPlayerSrcValues(payload) {
    if (!payload)
        return [];
    if (Array.isArray(payload)) {
        return payload.flatMap(collectPlayerSrcValues);
    }
    if (typeof payload !== 'object') {
        return [];
    }
    const data = payload;
    const rawValue = pickString(data.playerSrc) ??
        pickString(data.player_src) ??
        pickString(data.playerSRC) ??
        pickString(data.set);
    return rawValue ? [rawValue] : [];
}
function pickString(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (value && typeof value === 'object' && typeof value.set === 'string') {
        return value.set;
    }
    return undefined;
}
function assertAllowedHost(urlString) {
    let parsed;
    try {
        parsed = new URL(urlString);
    }
    catch {
        throw new Error('player_src must be a valid URL');
    }
    const host = parsed.hostname.toLowerCase();
    if (!env_1.env.playerAllowedHostsSet.has(host)) {
        throw new Error(`player_src host "${host}" is not allowed`);
    }
}
