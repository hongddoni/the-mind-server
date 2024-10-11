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
