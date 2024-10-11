import express from 'express';
import {createServer} from "http";
import {Server, Socket} from "socket.io";
import cors from "cors";
import {TheMindGame, TheMindRule, TheMindPlayer} from "./types/theMindTypes";
import {ChaoChaoPlayer, ChaoChaoCharacter,ChaoChaoCharacterStatus, ChaoChaoGame} from "./types/chaoChaoTypes";
import {GameStatus} from "../src/types/commonTypes";
// server.ts
import { httpServer, io } from './app';
import {theMindSocketEvents} from "./events/theMindSocketEvents";

const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
    theMindSocketEvents(io, socket);
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//https://the-mind-server.fly.dev/
