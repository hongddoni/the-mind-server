import {TheMindGame, TheMindPlayer} from "../types/theMindTypes";
import {Server, Socket} from "socket.io";
import {theMindLogics} from "../logics/theMindLogics";

export const theMindGame: Record<string, TheMindGame> = {
    theMind: {
        players: [],
        status: 'waiting',
        rule: {level: 0, heart: 0, suriken: 0},
    },
};

export let submittedCard: number[] = [];

export function resetSubmittedCard() {
    submittedCard = [];
}

export function theMindSocketEvents(io: Server, socket: Socket) {
    const {
        allPlayersReady,
        checkCardsAndLevelUp,
        useHeartCard,
        startGame,
        endGame,
        useSurikenCard,
        restartGame,
    } = theMindLogics(io);

    socket.on('useHeart', (gameType: string) => {
        useHeartCard(gameType);
    })

    socket.on('useSuriken', (gameType: string) => {
        useSurikenCard(gameType);
    })

    socket.on('restartGame', (gameType: string) => {
        restartGame(gameType, socket.id);
    });

    socket.on('selectGame', (gameType: string) => {
        if (!theMindGame[gameType]) {
            theMindGame[gameType] = {players: [], status: 'waiting', rule: {level: 0, heart: 0, suriken: 0}};
        }
        socket.join(gameType);
        io.to(gameType).emit('gameSelected', {gameType, players: theMindGame[gameType].players});
    });

    socket.on('joinGame', ({gameType, nickname}: { gameType: string; nickname: string }) => {
        const game = theMindGame[gameType];
        const userId = socket.id;
        if(!game) return;

        if (game.players.some(player => player.id === userId)) {
            return;
        }

        const newPlayer: TheMindPlayer = {id: userId, nickname, status: 'waiting', cards: []};
        game.players.push(newPlayer);
        socket.join(gameType);
        io.to(gameType).emit('playerJoined', {players: game.players});

        // 모든 유저가 ready 상태일 때 게임 자동 시작
        if (allPlayersReady(game)) {
            startGame(gameType);
        }
    });

    socket.on('setPlayerReady', ({gameType}: { gameType: string }) => {
        const game = theMindGame[gameType];
        const player = game.players.find(p => p.id === socket.id);
        if (player) {
            player.status = 'ready';  // 플레이어 상태를 ready로 변경
        }

        // 모든 유저가 ready 상태일 때 게임 자동 시작
        if (allPlayersReady(game)) {
            startGame(gameType);
        }
    });

    socket.on('playCard', ({gameType, card}: { gameType: string; card: number }) => {
        const game = theMindGame[gameType];
        const player = game.players.find(p => p.id === socket.id);

        if (player) {
            const cardIndex = player.cards.indexOf(card);
            if (cardIndex !== -1) {
                player.cards.splice(cardIndex, 1); // 카드 소진

                // 하트 감소 조건 체크
                if (submittedCard.length > 0 && submittedCard[submittedCard.length - 1] > card) {
                    // 하트가 0이 되면 게임 종료
                    endGame(game, gameType, socket.id)
                }

                submittedCard.push(card); // 제출된 카드에 추가

                checkCardsAndLevelUp(gameType); // 카드 소진 체크 및 레벨업
                io.to(gameType).emit('submittedCardsUpdated', {submittedCard});
            }
        }
    });

    socket.on('getSubmittedCards', () => {
        socket.emit('submittedCardsUpdated', {submittedCard});
    });

    socket.on('decreaseHeart', (gameType: string) => {
        const game = theMindGame[gameType];
        endGame(game, gameType, socket.id); // 하트 소진 시 게임 종료
    });

    socket.on('getRuleInfo', () => {
        const game = Object.values(theMindGame).find(g => g.players.some(p => p.id === socket.id));
        if (game) {
            socket.emit('ruleInfo', game.rule);
        }
    });

    socket.on('disconnect', () => {
        Object.keys(theMindGame).forEach(gameType => {
            const game = theMindGame[gameType];
            game.players = game.players.filter(player => player.id !== socket.id);
            io.to(gameType).emit('playerLeft', {players: game.players});
        });
    });
}
