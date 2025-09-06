import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { GameState } from "./types";
import { updatePlayerPositions } from "./utils/update-player-positions";
import { initRequest } from "./events/init-request";
import { playerInput } from "./events/player-input";
import { disconnect } from "./events/disconnect";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CORS_ORIGIN!,
      "http://localhost:3000",
      "http://192.168.5.14:3000",
      "http://192.168.5.18:3000",
    ],
    methods: ["GET", "POST"],
  },
});

const gameState: GameState = {
  players: new Map(),
  gameStarted: false,
};

// Game loop do servidor
setInterval(() => {
  if (gameState.players.size > 0) {
    updatePlayerPositions();

    // Envia atualizações de posição para todos os clientes
    const playersArray = Array.from(gameState.players.values());
    io.emit("game:playersUpdate", playersArray);
  }
}, 1000 / 60); // 60 FPS

io.on("connection", (socket) => {
  console.log(`Player connected, ${socket.id}`);

  socket.on("game:initRequest", () => initRequest(socket));

  socket.on("game:playerInput", (data: { input: string; state: boolean }) =>
    playerInput(socket, data)
  );

  socket.on("disconnect", () => disconnect(socket));

  socket.on("ping", () => {
    socket.emit("pong");
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
  console.log(`Players connected: ${gameState.players.size}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
  });
});

export { io, gameState };
