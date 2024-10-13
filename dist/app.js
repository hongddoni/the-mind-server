"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = exports.app = void 0;
// app.ts
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "https://the-mind-hongddoni.netlify.app"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
}));
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://the-mind-hongddoni.netlify.app"
        ],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
});
exports.io = io;
