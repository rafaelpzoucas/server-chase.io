import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

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

interface Player {
  id: string;
  socketId: string;
  position: { x: number; y: number };
  color: string;
  width: number;
  height: number;
  nickname?: string;
  isIt: boolean;
}

interface GameState {
  players: Map<string, Player>;
  gameStarted: boolean;
}

const gameState: GameState = {
  players: new Map(),
  gameStarted: false,
};

const isPositionTooClose = (position: { x: number; y: number }): boolean => {
  const MIN_DISTANCE = 100;

  for (const player of gameState.players.values()) {
    const distance = Math.sqrt(
      Math.pow(position.x - player.position.x, 2) +
        Math.pow(position.y - player.position.y, 2)
    );

    if (distance < MIN_DISTANCE) return true;
  }

  return false;
};

const getRandomSpawnPosition = (
  canvasWidth: number,
  canvasHeight: number,
  playerWidth: number,
  playerHeight: number
) => {
  let attempts = 0;
  let position: { x: number; y: number };

  do {
    position = {
      x: Math.random() * (canvasWidth - playerWidth) + playerWidth / 2,
      y: Math.random() * (canvasHeight - playerHeight) + playerHeight / 2,
    };

    attempts++;
  } while (attempts < 10 && isPositionTooClose(position));

  return position;
};

const selectRandomPlayerAsIt = () => {
  const players = Array.from(gameState.players.values());
  if (players.length === 0) return;

  // Remove o pique de todos os jogadores
  players.forEach((player) => {
    player.isIt = false;
    player.color = "gray";
  });

  // Seleciona um jogador aleatório para ser o pique
  const randomIndex = Math.floor(Math.random() * players.length);
  const selectedPlayer = players[randomIndex];
  selectedPlayer.isIt = true;
  selectedPlayer.color = "red";

  // Atualiza o jogador no Map
  gameState.players.set(selectedPlayer.id, selectedPlayer);

  // Notifica todos os jogadores sobre quem está no pique
  io.emit("game:piqueChanged", {
    playerId: selectedPlayer.id,
    players: Array.from(gameState.players.values()),
  });
};

const checkCollisionAndTransferPique = (
  movingPlayer: Player,
  position: { x: number; y: number }
) => {
  if (!movingPlayer.isIt) return;

  for (const [playerId, otherPlayer] of gameState.players.entries()) {
    if (playerId === movingPlayer.id || otherPlayer.isIt) continue;

    const dx = position.x - otherPlayer.position.x;
    const dy = position.y - otherPlayer.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const collisionDistance = movingPlayer.width / 2 + otherPlayer.width / 2;
    if (distance < collisionDistance) {
      // Transfere o pique
      movingPlayer.isIt = false;
      movingPlayer.color = "gray";

      otherPlayer.isIt = true;
      otherPlayer.color = "red";

      // Atualiza no Map
      gameState.players.set(movingPlayer.id, movingPlayer);
      gameState.players.set(playerId, otherPlayer);

      // Notifica todos os jogadores sobre a mudança de pique
      io.emit("game:piqueTransferred", {
        fromPlayerId: movingPlayer.id,
        toPlayerId: playerId,
        players: Array.from(gameState.players.values()),
      });

      break; // Para depois da primeira colisão
    }
  }
};

io.on("connection", (socket) => {
  console.log(`Player connected, ${socket.id}`);

  socket.on(
    "game:initRequest",
    (data: {
      canvasWidth: number;
      canvasHeight: number;
      playerWidth: number;
      playerHeight: number;
    }) => {
      const { canvasWidth, canvasHeight, playerWidth, playerHeight } = data;

      const newPlayer: Player = {
        id: socket.id,
        socketId: socket.id,
        position: getRandomSpawnPosition(
          canvasWidth,
          canvasHeight,
          playerWidth,
          playerHeight
        ),
        color: "gray",
        width: playerWidth,
        height: playerHeight,
        nickname: `Player ${gameState.players.size + 1}`,
        isIt: false,
      };

      gameState.players.set(socket.id, newPlayer);

      socket.emit("game:init", {
        playerId: socket.id,
        player: newPlayer,
        players: Array.from(gameState.players.values()),
      });

      socket.broadcast.emit("game:playerJoined", newPlayer);

      // Se é o primeiro jogador e o jogo ainda não começou
      if (gameState.players.size === 1 && !gameState.gameStarted) {
        newPlayer.isIt = true;
        newPlayer.color = "red";
        gameState.players.set(socket.id, newPlayer);
        gameState.gameStarted = true;

        // Notifica que o jogo começou
        io.emit("game:started", {
          itPlayerId: socket.id,
          players: Array.from(gameState.players.values()),
        });
      }
      // Se há mais de um jogador e nenhum está no pique, seleciona um aleatório
      else if (
        gameState.players.size > 1 &&
        !Array.from(gameState.players.values()).some((p) => p.isIt)
      ) {
        selectRandomPlayerAsIt();
      }
    }
  );

  socket.on(
    "game:playerMove",
    (data: { position: { x: number; y: number } }) => {
      const player = gameState.players.get(socket.id);
      if (!player) return;

      const maxDistance = 20;
      const distance = Math.sqrt(
        Math.pow(data.position.x - player.position.x, 2) +
          Math.pow(data.position.y - player.position.y, 2)
      );

      if (distance <= maxDistance) {
        checkCollisionAndTransferPique(player, data.position);

        player.position = data.position;

        socket.broadcast.emit("game:playerMoved", {
          playerId: socket.id,
          position: data.position,
        });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    const disconnectedPlayer = gameState.players.get(socket.id);
    gameState.players.delete(socket.id);

    socket.broadcast.emit("game.playerLeft", socket.id);

    if (disconnectedPlayer?.isIt && gameState.players.size > 0) {
      selectRandomPlayerAsIt();
    }

    // Se não há mais jogadores, reseta o jogo
    if (gameState.players.size === 0) {
      gameState.gameStarted = false;
    }
  });

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
