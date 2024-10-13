"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketEvents = registerSocketEvents;
const theMindLogics_1 = require("../logics/theMindLogics");
const games = {
    default: {
        players: [],
        status: 'waiting',
        rule: { level: 0, heart: 0, suriken: 0 }
    }
};
let submittedCard = [];
// Socket 이벤트를 처리하는 함수들
function registerSocketEvents(io, socket) {
    socket.on('joinGame', ({ gameType, nickname }) => {
        const game = games[gameType];
        const userId = socket.id;
        if (game.players.some(player => player.id === userId))
            return;
        const newPlayer = { id: userId, nickname, status: 'waiting', cards: [] };
        game.players.push(newPlayer);
        socket.join(gameType);
        io.to(gameType).emit('playerJoined', { players: game.players });
        if ((0, theMindLogics_1.allPlayersReady)(game))
            startGame(gameType, io);
    });
    socket.on('startGame', (gameType) => {
        startGame(gameType, io);
    });
    socket.on('disconnect', () => {
        Object.keys(games).forEach(gameType => {
            const game = games[gameType];
            game.players = game.players.filter(player => player.id !== socket.id);
            io.to(gameType).emit('playerLeft', { players: game.players });
        });
    });
}
// 게임 시작 함수
function startGame(gameType, io) {
    const game = games[gameType];
    if (!game)
        return;
    game.status = 'playing';
    (0, theMindLogics_1.setGameRule)(game);
    (0, theMindLogics_1.dealCardsToPlayers)(game);
    submittedCard = [];
    game.players.forEach(player => {
        player.status = 'playing';
        io.to(player.id).emit('gameStarted', {
            gameType,
            rule: game.rule,
            cards: player.cards
        });
    });
    io.to(gameType).emit('submittedCardsUpdated', { submittedCard });
}
