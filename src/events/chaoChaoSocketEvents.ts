import {Server, Socket} from "socket.io";
import {ChaoChaoGame} from "../types/chaoChaoTypes";
import {ChaoChaoLogics, isChaoChaoAllMembersReady} from "../logics/chaoChaoLogics";

export function chaoChaoSocketEvents(io: Server, socket: Socket, selectedGame: ChaoChaoGame) {
    let game: ChaoChaoGame = selectedGame;
    const {startChaoChao, judgeLie, rollTheDice, transUserStatusToPlaying} = ChaoChaoLogics(io)

    socket.on('chaoChaoStatus', () => {
        socket.emit('chaoChaoStatusUpdated', game);
    });

    socket.on('setChaoChaoPlayerReady', () => {
        const player = game.players.find(p => p.id === socket.id);
        if (!player) return;
        player.status = 'ready';
        game.status = 'playing';
        if (isChaoChaoAllMembersReady()) {
            startChaoChao(io);
            io.emit('chaoChaoStatusUpdated', game);
        }
    })

    socket.on('judgeLie', ({userId}: {userId: string}) => {
        judgeLie(userId);
        socket.emit('chaoChaoStatusUpdated', game);
    });

    socket.on('judgeTrue', ({userId}: {userId: string}) => {
        transUserStatusToPlaying(userId)
        socket.emit('chaoChaoStatusUpdated', game);
    })

    socket.on('submitDice', ({userId, realValue, submitValue} : {userId: string, realValue: string, submitValue: string}) => {
        rollTheDice({userId, realValue, submitValue});
        socket.emit('chaoChaoStatusUpdated', game);
    })

    socket.on('disconnect', () => {
        game.players = game.players.filter(player => player.id !== socket.id);
        io.emit('playerLeft', {players: game.players});
    });
}
