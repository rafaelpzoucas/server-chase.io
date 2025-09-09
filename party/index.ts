// server.ts - PartyKit version with room support
import type * as Party from "partykit/server";
import { GameState } from "./types";
import { updatePlayerPositions } from "./utils/update-player-positions";
import { initRequest } from "./events/init-request";
import { playerInput } from "./events/player-input";
import { disconnect } from "./events/disconnect";
import { gameConfig } from "./config";
import { restartGame } from "./events/restart-game";

export default class GameServer implements Party.Server {
  private gameState: GameState;
  private gameLoop: NodeJS.Timeout | null = null;

  constructor(readonly room: Party.Room) {
    this.gameState = {
      activePlayers: new Map(),
      eliminatedPlayers: new Map(),
      gameStarted: false,
      gameFinished: false,
    };
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const { searchParams } = new URL(ctx.request.url);
    const nickname = searchParams.get("nickname");

    console.log(
      `Player connected: ${conn.id} - Room: ${this.room.id} - Nickname: ${
        nickname || "Unknown"
      }`
    );

    // Armazena o nickname na conexão para usar posteriormente
    if (nickname) {
      (conn as any).nickname = nickname;
    }

    const connections = Array.from(this.room.getConnections());

    // Inicia o game loop quando o primeiro jogador se conecta
    if (connections.length === 1 && !this.gameLoop) {
      console.log(`🎮 Starting game loop for room: ${this.room.id}`);
      this.startGameLoop();
    }

    // Opcional: Notificar outros jogadores sobre o novo jogador
    this.room.broadcast(
      JSON.stringify({
        type: "room:playerConnected",
        payload: {
          playerId: conn.id,
          nickname: nickname || `Player ${conn.id.slice(0, 6)}`,
          totalPlayers: connections.length,
        },
      }),
      [conn.id] // Excluir o próprio jogador da notificação
    );
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "game:initRequest":
          // Passa o nickname armazenado na conexão
          const nickname =
            (sender as any).nickname || `Player ${sender.id.slice(0, 6)}`;
          initRequest(sender, this.gameState, this.room, nickname);
          break;

        case "game:restart":
          restartGame(sender, this.gameState, this.room);
          break;

        case "game:playerInput":
          playerInput(sender, data.payload, this.gameState);
          break;

        case "room:info":
          // Retorna informações da sala
          sender.send(
            JSON.stringify({
              type: "room:info",
              payload: {
                roomId: this.room.id,
                totalPlayers: Array.from(this.room.getConnections()).length,
                gameStarted: this.gameState.gameStarted,
              },
            })
          );
          break;

        case "ping":
          sender.send(JSON.stringify({ type: "pong" }));
          break;

        default:
          console.log("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  onClose(conn: Party.Connection) {
    const nickname = (conn as any).nickname || `Player ${conn.id.slice(0, 6)}`;
    console.log(
      `Player disconnected: ${conn.id} (${nickname}) - Room: ${this.room.id}`
    );

    disconnect(conn, this.gameState, this.room);
    const connections = Array.from(this.room.getConnections());

    // Notificar outros jogadores sobre a desconexão
    this.room.broadcast(
      JSON.stringify({
        type: "room:playerDisconnected",
        payload: {
          playerId: conn.id,
          nickname,
          totalPlayers: connections.length,
        },
      })
    );

    // Para o game loop se não há mais jogadores
    if (connections.length === 0 && this.gameLoop) {
      console.log(`⏹️ Stopping game loop for room: ${this.room.id}`);
      this.stopGameLoop();
    }
  }

  onError(conn: Party.Connection, error: Error) {
    console.error(
      `Connection error for ${conn.id} in room ${this.room.id}:`,
      error
    );
  }

  private startGameLoop() {
    this.gameLoop = setInterval(() => {
      if (this.gameState.activePlayers.size > 0) {
        updatePlayerPositions(this.gameState, this.room);

        // Envia atualizações de posição para todos os clientes
        const playersArray = Array.from(this.gameState.activePlayers.values());
        const message = JSON.stringify({
          type: "game:playersUpdate",
          payload: playersArray,
        });

        this.room.broadcast(message);
      }
    }, 1000 / 60); // 60 FPS
  }

  private stopGameLoop() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }

  // Método para broadcast personalizado (equivalente ao io.emit)
  broadcast(type: string, payload: any, exclude?: Party.Connection) {
    const message = JSON.stringify({ type, payload });

    if (exclude) {
      this.room.broadcast(message, [exclude.id]);
    } else {
      this.room.broadcast(message);
    }
  }

  // Getter para acessar o gameState de outros módulos
  getGameState() {
    return this.gameState;
  }
}

// Para compatibilidade com os módulos existentes
export { GameState };
