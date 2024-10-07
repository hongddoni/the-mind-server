import express from 'express';
import {createServer} from "http";
import {Server, Socket} from "socket.io";
import cors from "cors";

const app = express();
app.use(cors({
    origin: [
        "http://localhost:5173", // 로컬 개발 환경 허용
        "https://the-mind-hongddoni.netlify.app" // Netlify 배포 URL 허용
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true // 인증 정보 포함 허용
}));
const httpServer = createServer(app);

interface Rule {
    level: number;
    heart: number;
    suriken: number;
}

interface Player {
    id: string;
    nickname: string;
    status: 'waiting' | 'ready' | 'playing';
    cards: number[];
}

interface Game {
    players: Player[];
    status: 'waiting' | 'playing' | 'ended';
    rule: Rule;
}

const games: Record<string, Game> = {
    default: {
        players: [],
        status: 'waiting',
        rule: {level: 0, heart: 0, suriken: 0},
    }
};

const io = new Server(httpServer, {
    cors: {
        origin: [
            "http://localhost:5173", // 로컬 개발 환경 허용
            "https://the-mind-hongddoni.netlify.app" // Netlify 배포 URL 허용
        ],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true // 인증 정보(쿠키, 헤더 등)를 포함하여 요청 허용
    }
});

let submittedCard: number[] = [];

// 유저에게 고유한 5장의 카드를 부여
function dealCardsToPlayers(game: Game) {
    const usedNumbers: number[] = []; // 모든 플레이어 간 중복을 방지하기 위해 사용된 숫자를 추적
    const nowLevel = game.rule.level;

    game.players.forEach(player => {
        player.cards = generateUniqueRandomNumbersForGame(nowLevel, 100, usedNumbers);
    });
}

// 게임 내에서 고유한 카드를 생성하는 함수
function generateUniqueRandomNumbersForGame(count: number, max: number, usedNumbers: number[]): number[] {
    const numbers: number[] = [];

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
function allPlayersReady(game: Game) {
    // if(game.players.length < 2) return false;
    return game.players.every(player => player.status === 'ready');
}

// 게임 룰 설정
function setGameRule(game: Game) {
    const playerCount = game.players.length;

    switch (playerCount) {
        case 2:
            game.rule = {level: 1, heart: 2, suriken: 1};
            return;
        case 3:
            game.rule = {level: 1, heart: 3, suriken: 1};
            return;
        case 4:
            game.rule = {level: 1, heart: 4, suriken: 1};
            return;
        default:
            game.rule = {level: 1, heart: 1, suriken: 1};
            return;
    }
}

// 카드 소진 확인 및 레벨 증가
function checkCardsAndLevelUp(gameType: string) {
    const game = games[gameType];
    if (!game) return;
    const allCardsUsed = game.players.every(player => player.cards.length === 0);
    if (allCardsUsed) {
        game.rule.level += 1;

        const playersLength = game.players.length;
        const nowLevel = game.rule.level;

        if ((playersLength <= 2 && nowLevel > 12) || (playersLength === 3 && nowLevel > 10) || (playersLength === 4 && nowLevel > 8)) {
            io.emit('isCleared');
            return;
        }

        dealCardsToPlayers(game); // 새로운 카드 부여

        // 로그 추가
        game.players.forEach(player => {
            io.to(player.id).emit('levelUp', {
                level: game.rule.level,
                cards: player.cards  // 각 플레이어에게 새로운 카드 전달
            });
        });

        // submittedCard 초기화 및 로그
        submittedCard = [];
        io.to(gameType).emit('submittedCardsUpdated', {submittedCard});
    }
}

io.on('connection', (socket: Socket) => {
    function endGame(game: Game, gameType: string) {
        game.status = 'ended';
        resetGame(game);
        io.to(gameType).emit('gameEnded', {gameType});
    }

    function useHeartCard(gameType: string) {
        const game = games[gameType];
        if (!game) return;
        if (submittedCard.length === 0) return;
        if (game.rule.heart <= 0) return;
        game.rule.heart -= 1;
        socket.emit('heartDecreased', {heart: game.rule.heart})
        submittedCard.pop();
        io.to(gameType).emit('submittedCardsUpdated', {submittedCard});
    }

    function useSurikenCard(gameType: string) {
        const game = games[gameType];
        if (!game) return;
        if (game.rule.suriken <= 0) return;

        game.rule.suriken -= 1;

        // 각 플레이어의 가장 작은 카드를 모음
        const smallestCards = game?.players
            .map(player => {
                // 플레이어의 가장 작은 카드를 찾음
                const smallestCard = Math.min(...player.cards);
                return {playerId: player.id, card: smallestCard};
            })
            .filter(playerCard => !isNaN(playerCard.card)) // 카드가 있는 플레이어만 선택
            .sort((a, b) => a.card - b.card); // 카드 크기대로 정렬

        // 정렬된 가장 작은 카드를 제출된 카드 목록에 추가
        smallestCards.forEach(({card}) => {
            submittedCard.push(card);
        });

        // 각 플레이어에서 해당 카드 제거
        smallestCards.forEach(({playerId, card}) => {
            const player = game.players.find(p => p.id === playerId);

            if (player) {
                if (player.cards.length <= 0) return;
                const cardIndex = player.cards.indexOf(card);

                if (cardIndex !== -1) {
                    player.cards.splice(cardIndex, 1); // 플레이어의 카드에서 해당 카드 제거
                    const userCards = player.cards;

                    io.to(gameType).emit('userCards', {userCards});
                }
            }
        });

        io.emit('surikenDecreased', {suriken: game.rule.suriken});

        // 제출된 카드 목록을 업데이트
        io.to(gameType).emit('submittedCardsUpdated', {submittedCard});
        checkCardsAndLevelUp(gameType)
    }

// 게임 상태와 룰을 초기화하는 함수 (restart 시 사용)
    function resetGame(game: Game) {
        setGameRule(game);
        submittedCard = []; // 제출된 카드 초기화

        const user = game.players.find(p => p.id === socket.id);
        if (user) {
            user.cards = [];
            user.status = 'ready'
        }
    }

    function restartGame(gameType: string) {
        const game = games[gameType];
        if (!game) return;

        // 게임을 초기화
        resetGame(game);

        io.to(gameType).emit('gameRestarted', {
            gameType,
            rule: game.rule,
            players: game.players.map(p => ({id: p.id, status: p.status}))
        });

        // 플레이어들이 모두 ready 상태가 되면 게임 시작
        if (allPlayersReady(game)) {
            startGame(gameType);
        }
    }

    function startGame(gameType: string) {
        const game = games[gameType];
        if (!game) return;

        game.status = 'playing';
        setGameRule(game); // 룰 설정
        dealCardsToPlayers(game); // 유저들에게 카드 부여
        submittedCard = []; // 새로운 게임이 시작되면 submittedCard 초기화

        game.players.forEach(v => v.status === 'playing');

        io.to(gameType).emit('submittedCardsUpdated', {submittedCard});

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

    socket.on('useHeart', (gameType: string) => {
        useHeartCard(gameType);
    })

    socket.on('useSuriken', (gameType: string) => {
        useSurikenCard(gameType);
    })

    socket.on('restartGame', (gameType: string) => {
        restartGame(gameType);
    });

    socket.on('selectGame', (gameType: string) => {
        if (!games[gameType]) {
            games[gameType] = {players: [], status: 'waiting', rule: {level: 0, heart: 0, suriken: 0}};
        }
        socket.join(gameType);
        io.to(gameType).emit('gameSelected', {gameType, players: games[gameType].players});
    });

    socket.on('joinGame', ({gameType, nickname}: { gameType: string; nickname: string }) => {
        const game = games[gameType];
        const userId = socket.id;

        if (game.players.some(player => player.id === userId)) {
            return;
        }

        const newPlayer: Player = {id: userId, nickname, status: 'waiting', cards: []};
        game.players.push(newPlayer);
        socket.join(gameType);
        io.to(gameType).emit('playerJoined', {players: game.players});

        // 모든 유저가 ready 상태일 때 게임 자동 시작
        if (allPlayersReady(game)) {
            startGame(gameType);
        }
    });

    socket.on('setPlayerReady', ({gameType}: { gameType: string }) => {
        const game = games[gameType];
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
        const game = games[gameType];
        const player = game.players.find(p => p.id === socket.id);

        if (player) {
            const cardIndex = player.cards.indexOf(card);
            if (cardIndex !== -1) {
                player.cards.splice(cardIndex, 1); // 카드 소진

                // 하트 감소 조건 체크
                if (submittedCard.length > 0 && submittedCard[submittedCard.length - 1] > card) {
                    // 하트가 0이 되면 게임 종료
                    endGame(game, gameType)
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
        const game = games[gameType];
        endGame(game, gameType); // 하트 소진 시 게임 종료
    });

    socket.on('getRuleInfo', () => {
        const game = Object.values(games).find(g => g.players.some(p => p.id === socket.id));
        if (game) {
            socket.emit('ruleInfo', game.rule);
        }
    });

    socket.on('disconnect', () => {
        Object.keys(games).forEach(gameType => {
            const game = games[gameType];
            game.players = game.players.filter(player => player.id !== socket.id);
            io.to(gameType).emit('playerLeft', {players: game.players});
        });
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//https://the-mind-server.fly.dev/
