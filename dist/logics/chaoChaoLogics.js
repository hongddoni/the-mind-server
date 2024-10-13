"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isChaoChaoAllMembersReady = isChaoChaoAllMembersReady;
exports.setChaoChaoMembers = setChaoChaoMembers;
exports.setChaoChaoRule = setChaoChaoRule;
exports.ChaoChaoLogics = ChaoChaoLogics;
const server_1 = require("../server");
function isChaoChaoAllMembersReady() {
    return server_1.chaoChaoGame.players.every(p => p.status === 'ready');
}
function setChaoChaoMembers() {
    server_1.chaoChaoGame.players.forEach((p, idx) => {
        if (idx === 0) {
            p.status = 'roll';
        }
        else {
            p.status = 'judge';
        }
    });
}
function setChaoChaoStatus() {
    server_1.chaoChaoGame.status = 'playing';
}
function setChaoChaoRule() {
    server_1.chaoChaoGame.rule = {
        completedPlayers: [],
        rollingTurn: server_1.chaoChaoGame.players[0].id,
        rollingStatus: "paused",
        rollingNumber: '0',
        publishNumber: ''
    };
}
function initializeChaoChao() {
    setChaoChaoMembers();
    setChaoChaoRule();
    setChaoChaoStatus();
}
let memberSubmitStatus = [];
function ChaoChaoLogics(io) {
    function startChaoChao(io) {
        initializeChaoChao();
    }
    function findPlayer(userId) {
        var _a;
        return (_a = server_1.chaoChaoGame.players.find(p => p.id === userId)) !== null && _a !== void 0 ? _a : null;
    }
    function findCharacter(player) {
        const playingCharacter = player.characters.find(c => c.status === 'playing');
        if (playingCharacter)
            return playingCharacter;
        const waitingCharacter = player.characters.find(c => c.status === 'waiting');
        if (waitingCharacter)
            return waitingCharacter;
    }
    function deleteCharacter(userId) {
        const player = findPlayer(userId);
        if (!player)
            return;
        const character = findCharacter(player);
        if (!character)
            return;
        character.status = 'deleted';
    }
    function moveCharacter(userId, moveStep) {
        const player = findPlayer(userId);
        if (!player)
            return;
        const character = findCharacter(player);
        if (!character)
            return;
        character.status = 'playing';
        const moveLevel = character.ladderLevel + Number(moveStep);
        character.ladderLevel = moveLevel;
        if (moveLevel > 7) {
            character.status = "complete";
            character.completeLevel = server_1.chaoChaoGame.rule.completedPlayers.length + 1;
            server_1.chaoChaoGame.rule.completedPlayers.push(character.id);
        }
        io.emit('chaoChaoStatusUpdated', server_1.chaoChaoGame);
    }
    function rollTheDice({ userId, realValue, submitValue }) {
        server_1.chaoChaoGame.rule.publishNumber = submitValue;
        server_1.chaoChaoGame.rule.rollingNumber = realValue;
        memberSubmitStatus = [];
        io.emit('chaoChaoStatusUpdated', server_1.chaoChaoGame);
    }
    function setNextTurn() {
        const idx = server_1.chaoChaoGame.players.findIndex(p => p.id === server_1.chaoChaoGame.rule.rollingTurn);
        let nextIdx = idx + 2 > server_1.chaoChaoGame.players.length ? 0 : idx + 1;
        const nextIdxIsGameOver = server_1.chaoChaoGame.players[nextIdx].characters.every(v => (v.status !== 'waiting') && v.status !== 'playing');
        if (nextIdxIsGameOver) {
            nextIdx = nextIdx + 1 > server_1.chaoChaoGame.players.length ? 0 : nextIdx;
        }
        server_1.chaoChaoGame.rule.rollingTurn = server_1.chaoChaoGame.players[nextIdx].id;
        server_1.chaoChaoGame.players[nextIdx].status = 'roll';
        server_1.chaoChaoGame.players.forEach(p => {
            if (p.id !== server_1.chaoChaoGame.rule.rollingTurn) {
                p.status = 'playing';
            }
        });
        io.emit('chaoChaoStatusUpdated', server_1.chaoChaoGame);
    }
    function turnEnd() {
        if (memberSubmitStatus.length === server_1.chaoChaoGame.players.length - 1) {
            if (memberSubmitStatus.every(v => v)) {
                moveCharacter(server_1.chaoChaoGame.rule.rollingTurn, server_1.chaoChaoGame.rule.publishNumber);
            }
            setNextTurn();
            server_1.chaoChaoGame.rule.publishNumber = '';
            server_1.chaoChaoGame.rule.rollingNumber = '';
        }
        io.emit('chaoChaoStatusUpdated', server_1.chaoChaoGame);
    }
    function transUserStatusToPlaying(userId) {
        const player = server_1.chaoChaoGame.players.find(p => p.id === userId);
        if (player) {
            player.status = 'submit';
        }
        memberSubmitStatus.push(true);
        turnEnd();
        io.emit('chaoChaoStatusUpdated', server_1.chaoChaoGame);
    }
    function judgeLie(userId) {
        memberSubmitStatus.push(false);
        // 거짓이 아닌데 상대가 의심한 경우
        console.log(server_1.chaoChaoGame.rule.publishNumber);
        console.log(server_1.chaoChaoGame.rule.rollingNumber);
        if (server_1.chaoChaoGame.rule.publishNumber === server_1.chaoChaoGame.rule.rollingNumber) {
            incorrectJudge(userId);
        }
        else {
            // 거짓인 경우
            correctJudge(userId);
        }
        // 모든 플레이어 제출상태로 업데이트
        server_1.chaoChaoGame.players.forEach(v => v.status = 'submit');
        setNextTurn();
        server_1.chaoChaoGame.rule.publishNumber = '';
        server_1.chaoChaoGame.rule.rollingNumber = '';
        io.emit('chaoChaoStatusUpdated', server_1.chaoChaoGame);
    }
    function correctJudge(userId) {
        // 굴린 사람 삭제
        deleteCharacter(server_1.chaoChaoGame.rule.rollingTurn);
        // 맞힌 사람 옮겨주기
        moveCharacter(userId, server_1.chaoChaoGame.rule.publishNumber);
    }
    function incorrectJudge(userId) {
        // 틀리면 정답 외친 사람 삭제
        deleteCharacter(userId);
        // 굴린 사람 말 옮겨주기
        moveCharacter(server_1.chaoChaoGame.rule.rollingTurn, server_1.chaoChaoGame.rule.publishNumber);
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
