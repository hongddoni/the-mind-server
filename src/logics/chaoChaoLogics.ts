import {Server} from "socket.io";
import {chaoChaoGame as game} from "../server";
import {ChaoChaoPlayer} from "../types/chaoChaoTypes";

export function isChaoChaoAllMembersReady() {
    return game.players.every(p => p.status === 'ready');
}

export function setChaoChaoMembers() {
    game.players.forEach((p, idx) => {
        if (idx === 0) {
            p.status = 'roll'
        } else {
            p.status = 'judge'
        }
    });
}

function setChaoChaoStatus() {
    game.status = 'playing';
}

export function setChaoChaoRule() {
    game.rule = {
        completedPlayers: [],
        rollingTurn: game.players[0].id,
        rollingStatus: "paused",
        rollingNumber: '0',
        publishNumber: ''
    }
}

function initializeChaoChao() {
    setChaoChaoMembers();
    setChaoChaoRule();
    setChaoChaoStatus();
}

let memberSubmitStatus: boolean[] = [];

export function ChaoChaoLogics(io: Server) {
    function startChaoChao(io: Server) {
        initializeChaoChao();
    }

    function findPlayer(userId: string) {
        return game.players.find(p => p.id === userId) ?? null;
    }

    function findCharacter(player: ChaoChaoPlayer) {
        const playingCharacter = player.characters.find(c => c.status === 'playing');
        if (playingCharacter) return playingCharacter;

        const waitingCharacter = player.characters.find(c => c.status === 'waiting')
        if (waitingCharacter) return waitingCharacter;
    }

    function deleteCharacter(userId: string) {
        const player = findPlayer(userId);
        if (!player) return;

        const character = findCharacter(player);
        if (!character) return;

        character.status = 'deleted';
    }

    function moveCharacter(userId: string, moveStep: string) {
        const player = findPlayer(userId);
        if (!player) return;
        const character = findCharacter(player);
        if (!character) return;
        character.status = 'playing';

        const moveLevel = character.ladderLevel + Number(moveStep);
        character.ladderLevel = moveLevel;

        if (moveLevel > 7) {
            character.status = "complete";
            character.completeLevel = game.rule.completedPlayers.length + 1;
            game.rule.completedPlayers.push(character.id);
        }

        io.emit('chaoChaoStatusUpdated', game);
    }

    function rollTheDice({userId, realValue, submitValue}: { userId: string, realValue: string, submitValue: string }) {
        game.rule.publishNumber = submitValue;
        game.rule.rollingNumber = realValue;
        memberSubmitStatus = [];

        io.emit('chaoChaoStatusUpdated', game);
    }

    function setNextTurn() {
        const idx = game.players.findIndex(p => p.id === game.rule.rollingTurn);
        let nextIdx = idx + 2 > game.players.length ? 0 : idx + 1;
        const nextIdxIsGameOver = game.players[nextIdx].characters.every(v => (v.status !== 'waiting') && v.status !== 'playing');

        if (nextIdxIsGameOver) {
            nextIdx = nextIdx + 1 > game.players.length ? 0 : nextIdx;
        }

        game.rule.rollingTurn = game.players[nextIdx].id;
        game.players[nextIdx].status = 'roll';

        game.players.forEach(p => {
            if (p.id !== game.rule.rollingTurn) {
                p.status = 'playing';
            }
        })
        io.emit('chaoChaoStatusUpdated', game);
    }

    function turnEnd() {
        if (memberSubmitStatus.length === game.players.length - 1) {
            if (memberSubmitStatus.every(v => v)) {
                moveCharacter(game.rule.rollingTurn, game.rule.publishNumber);
            }
            setNextTurn();
            game.rule.publishNumber = '';
            game.rule.rollingNumber = '';
        }
        io.emit('chaoChaoStatusUpdated', game);
    }

    function transUserStatusToPlaying(userId: string) {
        const player = game.players.find(p => p.id === userId);
        if (player) {
            player.status = 'submit';
        }
        memberSubmitStatus.push(true);
        turnEnd();
        io.emit('chaoChaoStatusUpdated', game);
    }

    function judgeLie(userId: string) {
        memberSubmitStatus.push(false);
        // 거짓이 아닌데 상대가 의심한 경우
        console.log(game.rule.publishNumber)
        console.log(game.rule.rollingNumber)
        if (game.rule.publishNumber === game.rule.rollingNumber) {
            incorrectJudge(userId);
        } else {
            // 거짓인 경우
            correctJudge(userId);
        }

        // 모든 플레이어 제출상태로 업데이트
        game.players.forEach(v => v.status = 'submit');

        setNextTurn();
        game.rule.publishNumber = '';
        game.rule.rollingNumber = '';
        io.emit('chaoChaoStatusUpdated', game);
    }

    function correctJudge(userId: string) {
        // 굴린 사람 삭제
        deleteCharacter(game.rule.rollingTurn);
        // 맞힌 사람 옮겨주기
        moveCharacter(userId, game.rule.publishNumber);
    }

    function incorrectJudge(userId: string) {
        // 틀리면 정답 외친 사람 삭제
        deleteCharacter(userId);
        // 굴린 사람 말 옮겨주기
        moveCharacter(game.rule.rollingTurn, game.rule.publishNumber)
    }

    return {
        startChaoChao,
        findPlayer,
        deleteCharacter,
        moveCharacter,
        transUserStatusToPlaying,
        judgeLie,
        rollTheDice
    };
}
