"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chaoChaoSocketEvents = chaoChaoSocketEvents;
const chaoChaoLogics_1 = require("../logics/chaoChaoLogics");
function chaoChaoSocketEvents(io, socket, selectedGame) {
    let game = selectedGame;
    const { startChaoChao, judgeLie, rollTheDice, transUserStatusToPlaying } = (0, chaoChaoLogics_1.ChaoChaoLogics)(io);
    socket.on('chaoChaoStatus', () => {
        socket.emit('chaoChaoStatusUpdated', game);
    });
    socket.on('setChaoChaoPlayerReady', () => {
        const player = game.players.find(p => p.id === socket.id);
        if (!player)
            return;
        player.status = 'ready';
        game.status = 'playing';
        if ((0, chaoChaoLogics_1.isChaoChaoAllMembersReady)()) {
            startChaoChao(io);
            io.emit('chaoChaoStatusUpdated', game);
        }
    });
    socket.on('judgeLie', ({ userId }) => {
        judgeLie(userId);
        socket.emit('chaoChaoStatusUpdated', game);
    });
    socket.on('judgeTrue', ({ userId }) => {
        transUserStatusToPlaying(userId);
        socket.emit('chaoChaoStatusUpdated', game);
    });
    socket.on('submitDice', ({ userId, realValue, submitValue }) => {
        rollTheDice({ userId, realValue, submitValue });
        socket.emit('chaoChaoStatusUpdated', game);
    });
    socket.on('disconnect', () => {
        game.players = game.players.filter(player => player.id !== socket.id);
        io.emit('playerLeft', { players: game.players });
    });
}
