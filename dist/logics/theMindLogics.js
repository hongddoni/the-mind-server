"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueRandomNumbersForGame = generateUniqueRandomNumbersForGame;
exports.theMindAllPlayersReady = theMindAllPlayersReady;
exports.dealCardsToPlayers = dealCardsToPlayers;
exports.setGameRule = setGameRule;
exports.startTheMind = startTheMind;
exports.theMindLogics = theMindLogics;
const theMindSocketEvents_1 = require("../events/theMindSocketEvents");
const server_1 = require("../server");
function generateUniqueRandomNumbersForGame(count, max, usedNumbers) {
    const numbers = [];
    while (numbers.length < count) {
        const rand = Math.floor(Math.random() * max) + 1;
        // 중복되지 않도록 숫자를 생성하고, 이미 사용된 숫자와도 비교
        if (!numbers.includes(rand) && !usedNumbers.includes(rand)) {
            numbers.push(rand);
            usedNumbers.push(rand); // 다른 플레이어와 중복되지 않도록 사용된 숫자로 저장
        }
    }
    return numbers;
}
// 모든 유저가 ready 상태인지 확인
function theMindAllPlayersReady(game) {
    if (game.players.length < 2)
        return false;
    return game.players.every(player => player.status === 'ready');
}
// 유저에게 고유한 5장의 카드를 부여
function dealCardsToPlayers(game) {
    const usedNumbers = []; // 모든 플레이어 간 중복을 방지하기 위해 사용된 숫자를 추적
    const nowLevel = game.rule.level;
    game.players.forEach(player => {
        player.cards = generateUniqueRandomNumbersForGame(nowLevel, 100, usedNumbers);
    });
}
function setGameRule(game) {
    const playerCount = game.players.length;
    switch (playerCount) {
        case 2:
            game.rule = { level: 1, heart: 2, suriken: 1 };
            return;
        case 3:
            game.rule = { level: 1, heart: 3, suriken: 1 };
            return;
        case 4:
            game.rule = { level: 1, heart: 4, suriken: 1 };
            return;
        default:
            game.rule = { level: 1, heart: 1, suriken: 1 };
            return;
    }
}
function startTheMind(io, gameType) {
    const game = server_1.theMindGame;
    if (!game)
        return;
    game.status = 'playing';
    setGameRule(game); // 룰 설정
    dealCardsToPlayers(game); // 유저들에게 카드 부여
    (0, theMindSocketEvents_1.resetSubmittedCard)(); // 새로운 게임이 시작되면 submittedCard 초기화
    game.players.forEach(v => v.status === 'playing');
    io.to(gameType).emit('submittedCardsUpdated', { submittedCard: theMindSocketEvents_1.submittedCard });
    // 각 플레이어에게 개별 카드를 전송
    game.players.forEach(player => {
        player.status = 'playing'; // 플레이어 상태를 'playing'으로 설정
        io.to(player.id).emit('gameStarted', {
            gameType,
            rule: game.rule,
            cards: player.cards
        });
    });
}
function theMindLogics(io) {
    // 카드 소진 확인 및 레벨 증가
    function checkCardsAndLevelUp(gameType) {
        const game = server_1.theMindGame;
        if (!game)
            return;
        const allCardsUsed = game.players.every(player => player.cards.length === 0);
        if (allCardsUsed) {
            game.rule.level += 1;
            const playersLength = game.players.length;
            const nowLevel = game.rule.level;
            if ((playersLength <= 2 && nowLevel > 12) || (playersLength === 3 && nowLevel > 10) || (playersLength === 4 && nowLevel > 8)) {
                io.emit('isCleared');
                return;
            }
            // heart card up
            if (playersLength > 1) {
                switch (game.rule.level) {
                    case 2:
                        game.rule = { level: game.rule.level, heart: game.rule.heart + 1, suriken: game.rule.suriken };
                        break;
                    case 5:
                        game.rule = { level: game.rule.level, heart: game.rule.heart + 1, suriken: game.rule.suriken };
                        break;
                    case 8:
                        if (playersLength === 4)
                            break;
                        game.rule = { level: game.rule.level, heart: game.rule.heart + 1, suriken: game.rule.suriken };
                        break;
                    case 11:
                        if (playersLength === 3)
                            break;
                        game.rule = { level: game.rule.level, heart: game.rule.heart + 1, suriken: game.rule.suriken };
                        break;
                    default:
                        break;
                }
                // suriken card up
                switch (game.rule.level) {
                    case 3:
                        game.rule = { level: game.rule.level, heart: game.rule.heart, suriken: game.rule.suriken + 1 };
                        break;
                    case 6:
                        game.rule = { level: game.rule.level, heart: game.rule.heart, suriken: game.rule.suriken + 1 };
                        break;
                    case 9:
                        if (playersLength === 4)
                            break;
                        game.rule = { level: game.rule.level, heart: game.rule.heart, suriken: game.rule.suriken + 1 };
                        break;
                    case 12:
                        if (playersLength === 3)
                            break;
                        game.rule = { level: game.rule.level, heart: game.rule.heart, suriken: game.rule.suriken + 1 };
                        break;
                    default:
                        break;
                }
                io.to(gameType).emit('ruleInfo', game.rule);
            }
            dealCardsToPlayers(game); // 새로운 카드 부여
            // 로그 추가
            game.players.forEach(player => {
                io.to(player.id).emit('levelUp', {
                    level: game.rule.level,
                    cards: player.cards // 각 플레이어에게 새로운 카드 전달
                });
            });
            // submittedCard 초기화 및 로그
            (0, theMindSocketEvents_1.resetSubmittedCard)();
            io.to(gameType).emit('submittedCardsUpdated', { submittedCard: theMindSocketEvents_1.submittedCard });
        }
    }
    function useHeartCard(gameType) {
        const game = server_1.theMindGame;
        if (!game)
            return;
        if (theMindSocketEvents_1.submittedCard.length === 0)
            return;
        if (game.rule.heart <= 0)
            return;
        game.rule.heart -= 1;
        io.to(gameType).emit('heartDecreased', { heart: game.rule.heart });
        theMindSocketEvents_1.submittedCard.pop();
        io.to(gameType).emit('submittedCardsUpdated', { submittedCard: theMindSocketEvents_1.submittedCard });
    }
    function endGame(game, gameType, socketId) {
        game.status = 'ended';
        resetGame(game, socketId);
        io.to(gameType).emit('gameEnded', { gameType });
    }
    function useSurikenCard(gameType) {
        const game = server_1.theMindGame;
        if (!game)
            return;
        if (game.rule.suriken <= 0)
            return;
        game.rule.suriken -= 1;
        // 각 플레이어의 가장 작은 카드를 모음
        const smallestCards = game === null || game === void 0 ? void 0 : game.players.map(player => {
            // 플레이어의 가장 작은 카드를 찾음
            const smallestCard = Math.min(...player.cards);
            return { playerId: player.id, card: smallestCard };
        }).filter(playerCard => !isNaN(playerCard.card)).sort((a, b) => a.card - b.card); // 카드 크기대로 정렬
        // 각 플레이어에서 해당 카드 제거
        smallestCards.forEach(({ playerId, card }) => {
            const player = game.players.find(p => p.id === playerId);
            if (player) {
                if (player.cards.length <= 0)
                    return;
                const cardIndex = player.cards.indexOf(card);
                if (cardIndex !== -1) {
                    player.cards.splice(cardIndex, 1); // 플레이어의 카드에서 해당 카드 제거
                    const userCards = player.cards;
                    io.to(gameType).emit('userCards', { userCards, playerId: player.id });
                }
            }
        });
        io.emit('surikenDecreased', { suriken: game.rule.suriken });
        // 제출된 카드 목록을 업데이트
        io.to(gameType).emit('submittedCardsUpdated', { submittedCard: theMindSocketEvents_1.submittedCard });
        checkCardsAndLevelUp(gameType);
    }
    // 게임 상태와 룰을 초기화하는 함수 (restart 시 사용)
    function resetGame(game, socketId) {
        setGameRule(game);
        (0, theMindSocketEvents_1.resetSubmittedCard)(); // 제출된 카드 초기화
        const user = game.players.find(p => p.id === socketId);
        if (user) {
            user.cards = [];
            user.status = 'ready';
        }
    }
    function restartGame(gameType, socketId) {
        const game = server_1.theMindGame;
        if (!game)
            return;
        // 게임을 초기화
        resetGame(game, socketId);
        io.to(gameType).emit('gameRestarted', {
            gameType,
            rule: game.rule,
            players: game.players.map(p => ({ id: p.id, status: p.status }))
        });
        // 플레이어들이 모두 ready 상태가 되면 게임 시작
        if (theMindAllPlayersReady(game)) {
            startTheMind(io, gameType);
        }
    }
    return {
        dealCardsToPlayers,
        allPlayersReady: theMindAllPlayersReady,
        setGameRule,
        checkCardsAndLevelUp,
        useHeartCard,
        startGame: startTheMind,
        endGame,
        useSurikenCard,
        restartGame,
    };
}
