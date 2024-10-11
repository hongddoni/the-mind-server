"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
const app_1 = require("./app");
const socketEvents_1 = require("./events/socketEvents");
const PORT = process.env.PORT || 3000;
app_1.io.on('connection', (socket) => {
    (0, socketEvents_1.registerSocketEvents)(app_1.io, socket);
});
app_1.httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
