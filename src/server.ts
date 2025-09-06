import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { GAME_CONFIG, PLAYER_COLORS } from "./constants";

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
  velocity: { x: number; y: number };
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
    player.color = PLAYER_COLORS.NORMAL;
  });

  // Seleciona um jogador aleatório para ser o pique
  const randomIndex = Math.floor(Math.random() * players.length);
  const selectedPlayer = players[randomIndex];
  selectedPlayer.isIt = true;
  selectedPlayer.color = PLAYER_COLORS.PIQUE;

  // Atualiza o jogador no Map
  gameState.players.set(selectedPlayer.id, selectedPlayer);

  // Notifica todos os jogadores sobre quem está no pique
  io.emit("game:piqueChanged", {
    playerId: selectedPlayer.id,
    players: Array.from(gameState.players.values()),
  });
};

const checkCollisionAndTransferPique = (movingPlayer: Player) => {
  if (!movingPlayer.isIt) return;

  for (const [playerId, otherPlayer] of gameState.players.entries()) {
    if (playerId === movingPlayer.id || otherPlayer.isIt) continue;

    const dx = movingPlayer.position.x - otherPlayer.position.x;
    const dy = movingPlayer.position.y - otherPlayer.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const collisionDistance = movingPlayer.width / 2 + otherPlayer.width / 2;
    if (distance < collisionDistance) {
      // Transfere o pique
      movingPlayer.isIt = false;
      movingPlayer.color = PLAYER_COLORS.NORMAL;

      otherPlayer.isIt = true;
      otherPlayer.color = PLAYER_COLORS.PIQUE;

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

const updatePlayerPositions = () => {
  for (const player of gameState.players.values()) {
    // Atualiza posição baseada na velocidade
    let newX = player.position.x + player.velocity.x;
    let newY = player.position.y + player.velocity.y;

    // Verifica limites do canvas
    newX = Math.max(0, Math.min(GAME_CONFIG.ARENA_WIDTH - player.width, newX));
    newY = Math.max(
      0,
      Math.min(GAME_CONFIG.ARENA_HEIGHT - player.height, newY)
    );

    player.position.x = newX;
    player.position.y = newY;

    // Verifica colisões se o jogador estiver no pique
    if (player.velocity.x !== 0 || player.velocity.y !== 0) {
      checkCollisionAndTransferPique(player);
    }
  }
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

  socket.on("game:initRequest", () => {
    const newPlayer: Player = {
      id: socket.id,
      socketId: socket.id,
      position: getRandomSpawnPosition(
        GAME_CONFIG.ARENA_WIDTH,
        GAME_CONFIG.ARENA_HEIGHT,
        GAME_CONFIG.PLAYER_SIZE,
        GAME_CONFIG.PLAYER_SIZE
      ),
      color: PLAYER_COLORS.NORMAL,
      width: GAME_CONFIG.PLAYER_SIZE,
      height: GAME_CONFIG.PLAYER_SIZE,
      nickname: `Player ${gameState.players.size + 1}`,
      isIt: false,
      velocity: { x: 0, y: 0 },
    };

    gameState.players.set(socket.id, newPlayer);

    socket.emit("game:init", {
      playerId: socket.id,
      player: newPlayer,
      players: Array.from(gameState.players.values()),
      canvasWidth: GAME_CONFIG.ARENA_WIDTH,
      canvasHeight: GAME_CONFIG.ARENA_HEIGHT,
    });

    socket.broadcast.emit("game:playerJoined", newPlayer);

    // Se é o primeiro jogador e o jogo ainda não começou
    if (gameState.players.size === 1 && !gameState.gameStarted) {
      newPlayer.isIt = true;
      newPlayer.color = PLAYER_COLORS.PIQUE;
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
  });

  socket.on("game:playerInput", (data: { input: string; state: boolean }) => {
    const player = gameState.players.get(socket.id);
    if (!player) return;

    switch (data.input) {
      case "up":
        player.velocity.y = data.state
          ? -(
              GAME_CONFIG.PLAYER_SPEED *
              (player.isIt ? GAME_CONFIG.PIQUE_SPEED_BONUS : 1)
            )
          : 0;
        break;
      case "down":
        player.velocity.y = data.state
          ? GAME_CONFIG.PLAYER_SPEED *
            (player.isIt ? GAME_CONFIG.PIQUE_SPEED_BONUS : 1)
          : 0;
        break;
      case "left":
        player.velocity.x = data.state
          ? -(
              GAME_CONFIG.PLAYER_SPEED *
              (player.isIt ? GAME_CONFIG.PIQUE_SPEED_BONUS : 1)
            )
          : 0;
        break;
      case "right":
        player.velocity.x = data.state
          ? GAME_CONFIG.PLAYER_SPEED *
            (player.isIt ? GAME_CONFIG.PIQUE_SPEED_BONUS : 1)
          : 0;
        break;
    }

    gameState.players.set(socket.id, player);
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    const disconnectedPlayer = gameState.players.get(socket.id);
    gameState.players.delete(socket.id);

    socket.broadcast.emit("game:playerLeft", socket.id);

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
