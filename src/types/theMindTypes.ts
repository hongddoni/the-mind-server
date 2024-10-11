import {GameStatus} from "./commonTypes";

export interface TheMindRule {
    level: number;
    heart: number;
    suriken: number;
}

export interface TheMindPlayer {
    id: string;
    nickname: string;
    status: 'waiting' | 'ready' | 'playing';
    cards: number[];
}

export interface TheMindGame {
    players: TheMindPlayer[];
    status: GameStatus;
    rule: TheMindRule;
}
