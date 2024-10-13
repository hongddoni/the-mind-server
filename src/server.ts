import {httpServer, io} from './app';
import {theMindSocketEvents} from "./events/theMindSocketEvents";
import {TheMindGame, TheMindPlayer} from "./types/theMindTypes";
import {theMindAllPlayersReady, startTheMind} from "./logics/theMindLogics";
import {ChaoChaoColorsArray, ChaoChaoGame, ChaoChaoPlayer} from "./types/chaoChaoTypes";
import {chaoChaoSocketEvents} from "./events/chaoChaoSocketEvents";

const PORT = process.env.PORT || 3000;

export let theMindGame: TheMindGame = {
    players: [],
    status: 'waiting',
    rule: {level: 0, heart: 0, suriken: 0},
};

export let chaoChaoGame: ChaoChaoGame = {
    players: [],
    status: "waiting",
    rule : {
        completedPlayers: [],
        rollingTurn: '',
        rollingNumber: '',
        publishNumber: '',
        rollingStatus: "waiting"
    }
};

io.on('connection', (socket) => {
    socket.on('selectGame', (gameType: string) => {
        socket.join(gameType);
        if (gameType === 'theMind') {
            theMindGame = {players: [], status: 'waiting', rule: {level: 0, heart: 0, suriken: 0}};
            io.to(gameType).emit('gameSelected', {gameType, players: theMindGame.players});
        }

        if (gameType === 'chaoChao') {
            chaoChaoGame = {
                players: [],
                status: 'waiting',
                rule : {
                    completedPlayers: [],
                    rollingTurn: '',
                    rollingNumber: '',
                    publishNumber: '',
                    rollingStatus: "waiting"
                }
            }
            io.to(gameType).emit('gameSelected', {players: chaoChaoGame.players})
        }
    });

    socket.on('joinGame', ({gameType, nickname}: { gameType: string; nickname: string }) => {
        const userId = socket.id;

        if (gameType === 'theMind') {
            const game = theMindGame;
            if (game.players.some(player => player.id === userId)) {
                return;
            }
            const newPlayer: TheMindPlayer = {id: userId, nickname, status: 'waiting', cards: []};
            game.players.push(newPlayer);
            socket.join(gameType);
            io.to(gameType).emit('playerJoined', {players: game.players});

            // 모든 유저가 ready 상태일 때 게임 자동 시작
            if (theMindAllPlayersReady(game)) {
                startTheMind(io, gameType);
            }

            theMindSocketEvents(io, socket, theMindGame);
        }

        if (gameType === 'chaoChao') {
            const game = chaoChaoGame;
            const color = ChaoChaoColorsArray[chaoChaoGame.players.length];
            if (game.players.some(player => player.id === userId)) return;

            const newPlayer: ChaoChaoPlayer = {
                id: userId,
                nickname,
                status: "waiting",
                color,
                characters: Array.from({length: 1}).map((_, idx) => {
                    return {
                        id: `${color}-${idx}`,
                        ladderLevel: 0,
                        status: 'waiting',
                        completeLevel: 0,
                        color
                    }
                })
            }

            chaoChaoGame.players.push(newPlayer);
            socket.join(gameType);
            io.to(gameType).emit('playerJoined', {players: game.players});

            chaoChaoSocketEvents(io, socket, chaoChaoGame);
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//https://the-mind-server.fly.dev/
