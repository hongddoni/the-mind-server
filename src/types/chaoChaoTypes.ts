import {GameStatus} from "./commonTypes";

export type ChaoChaoCharacterStatus =
    | "waiting"
    | "playing"
    | "complete"
    | "deleted";

export type ChaoChaoColors = "blue" | "yellow" | "purple" | "green";
export const ChaoChaoColorsArray = ["blue", "yellow", "purple", "green"] as const;

export interface ChaoChaoCharacter {
    id: string; // id = color + index
    ladderLevel: number; // 0 ~ 6
    status: ChaoChaoCharacterStatus;
    completeLevel: number; // 0 ~ 10
    color: ChaoChaoColors;
}

export interface ChaoChaoPlayer {
    id: string;
    nickname: string;
    color: ChaoChaoColors;
    status: 'waiting' | 'ready' | 'roll' | 'judge' | 'submit' | 'playing';
    characters: ChaoChaoCharacter[];
}

export interface ChaoChaoRule {
    completedPlayers: string[];
    rollingTurn: string; // id
    rollingNumber: string;
    publishNumber: string;
    rollingStatus: 'paused' | 'ready' | 'insert' | 'waiting';
}

export interface ChaoChaoGame {
    players : ChaoChaoPlayer[];
    status: GameStatus;
    rule : ChaoChaoRule;
}
