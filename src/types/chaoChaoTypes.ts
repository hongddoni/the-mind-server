import {GameStatus} from "./commonTypes";

export type ChaoChaoCharacterStatus =
    | "wating"
    | "playing"
    | "complete"
    | "deleted";

export interface ChaoChaoCharacter {
    id: string; // id = color + index
    ladderLevel: number; // 0 ~ 7
    status: ChaoChaoCharacterStatus;
    completeLevel: number; // 0 ~ 10
}

export interface ChaoChaoPlayer {
    id: string;
    nickname: string;
    color: ChaoChaoPlayerColors;
    status: 'waiting' | 'ready' | 'playing';
    characters: ChaoChaoCharacter[];
}

export interface ChaoChaoRule {

}

export interface ChaoChaoGame {
    players : ChaoChaoPlayer[];
    status: GameStatus;
    rule : ChaoChaoRule;
}
