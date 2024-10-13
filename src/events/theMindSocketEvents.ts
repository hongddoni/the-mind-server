import {TheMindGame} from "../types/theMindTypes";
import {Server, Socket} from "socket.io";
import {theMindLogics, startTheMind} from "../logics/theMindLogics";

export let submittedCard: number[] = [];

export function resetSubmittedCard() {
    submittedCard = [];
}

export function theMindSocketEvents(io: Server, socket: Socket, selectedGame: TheMindGame) {
    let game: TheMindGame = selectedGame;

    const {
        allPlayersReady,
        checkCardsAndLevelUp,
        useHeartCard,
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

    socket.on('setPlayerReady', ({gameType}: { gameType: string }) => {
        const player = game.players.find(p => p.id === socket.id);
        if (player) {
            player.status = 'ready';  // 플레이어 상태를 ready로 변경
        }

        // 모든 유저가 ready 상태일 때 게임 자동 시작
        if (allPlayersReady(game)) {
            startTheMind(io, gameType);
        }
    });

    socket.on('playCard', ({gameType, card}: { gameType: string; card: number }) => {
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
        endGame(game, gameType, socket.id); // 하트 소진 시 게임 종료
    });

    socket.on('getRuleInfo', () => {
        if (game) {
            socket.emit('ruleInfo', game.rule);
        }
    });

    socket.on('disconnect', () => {
        game.players = game.players.filter(player => player.id !== socket.id);
        io.emit('playerLeft', {players: game.players});
    });
}
