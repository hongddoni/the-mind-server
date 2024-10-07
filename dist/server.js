"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const games = {};
const users = {};
const io = new socket_io_1.Server(httpServer);
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('selectGame', (gameType) => {
        if (!games[gameType]) {
            games[gameType] = { players: [], status: 'waiting' };
        }
        socket.join(gameType);
        io.to(gameType).emit('gameSelected', { gameType, players: games[gameType].players });
    });
    socket.on('joinGame', ({ gameType, nickname }) => {
        const userId = socket.id;
        users[userId] = { nickname, gameType };
        games[gameType].players.push({ id: userId, nickname });
        socket.join(gameType);
        io.to(gameType).emit('playerJoined', { players: games[gameType].players });
    });
    socket.on('playCard', ({ gameType, card }) => {
        io.to(gameType).emit('cardPlayed', { playerId: socket.id, card });
    });
    socket.on('startGame', (gameType) => {
        games[gameType].status = 'playing';
        io.to(gameType).emit('gameStarted', { gameType });
    });
    socket.on('endGame', (gameType) => {
        games[gameType].status = 'ended';
        io.to(gameType).emit('gameEnded', { gameType });
    });
    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            const { gameType } = user;
            games[gameType].players = games[gameType].players.filter(player => player.id !== socket.id);
            io.to(gameType).emit('playerLeft', { players: games[gameType].players });
            delete users[socket.id];
        }
    });
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
