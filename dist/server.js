"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chaoChaoGame = exports.theMindGame = void 0;
const app_1 = require("./app");
const theMindSocketEvents_1 = require("./events/theMindSocketEvents");
const theMindLogics_1 = require("./logics/theMindLogics");
const chaoChaoTypes_1 = require("./types/chaoChaoTypes");
const chaoChaoSocketEvents_1 = require("./events/chaoChaoSocketEvents");
const PORT = process.env.PORT || 3000;
exports.theMindGame = {
    players: [],
    status: 'waiting',
    rule: { level: 0, heart: 0, suriken: 0 },
};
exports.chaoChaoGame = {
    players: [],
    status: "waiting",
    rule: {
        completedPlayers: [],
        rollingTurn: '',
        rollingNumber: '',
        publishNumber: '',
        rollingStatus: "waiting"
    }
};
app_1.io.on('connection', (socket) => {
    socket.on('selectGame', (gameType) => {
        socket.join(gameType);
        if (gameType === 'theMind') {
            exports.theMindGame = { players: [], status: 'waiting', rule: { level: 0, heart: 0, suriken: 0 } };
            app_1.io.to(gameType).emit('gameSelected', { gameType, players: exports.theMindGame.players });
        }
        if (gameType === 'chaoChao') {
            exports.chaoChaoGame = {
                players: [],
                status: 'waiting',
                rule: {
                    completedPlayers: [],
                    rollingTurn: '',
                    rollingNumber: '',
                    publishNumber: '',
                    rollingStatus: "waiting"
                }
            };
            app_1.io.to(gameType).emit('gameSelected', { players: exports.chaoChaoGame.players });
        }
    });
    socket.on('joinGame', ({ gameType, nickname }) => {
        const userId = socket.id;
        if (gameType === 'theMind') {
            const game = exports.theMindGame;
            if (game.players.some(player => player.id === userId)) {
                return;
            }
            const newPlayer = { id: userId, nickname, status: 'waiting', cards: [] };
            game.players.push(newPlayer);
            socket.join(gameType);
            app_1.io.to(gameType).emit('playerJoined', { players: game.players });
            // 모든 유저가 ready 상태일 때 게임 자동 시작
            if ((0, theMindLogics_1.theMindAllPlayersReady)(game)) {
                (0, theMindLogics_1.startTheMind)(app_1.io, gameType);
            }
            (0, theMindSocketEvents_1.theMindSocketEvents)(app_1.io, socket, exports.theMindGame);
        }
        if (gameType === 'chaoChao') {
            const game = exports.chaoChaoGame;
            const color = chaoChaoTypes_1.ChaoChaoColorsArray[exports.chaoChaoGame.players.length];
            if (game.players.some(player => player.id === userId))
                return;
            const newPlayer = {
                id: userId,
                nickname,
                status: "waiting",
                color,
                characters: Array.from({ length: 1 }).map((_, idx) => {
                    return {
                        id: `${color}-${idx}`,
                        ladderLevel: 0,
                        status: 'waiting',
                        completeLevel: 0,
                        color
                    };
                })
            };
            exports.chaoChaoGame.players.push(newPlayer);
            socket.join(gameType);
            app_1.io.to(gameType).emit('playerJoined', { players: game.players });
            (0, chaoChaoSocketEvents_1.chaoChaoSocketEvents)(app_1.io, socket, exports.chaoChaoGame);
        }
    });
});
app_1.httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//https://the-mind-server.fly.dev/
