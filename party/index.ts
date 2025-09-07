// server.ts - PartyKit version
import type * as Party from "partykit/server";
import { GameState } from "./types";
import { updatePlayerPositions } from "./utils/update-player-positions";
import { initRequest } from "./events/init-request";
import { playerInput } from "./events/player-input";
import { disconnect } from "./events/disconnect";

export default class GameServer implements Party.Server {
  private gameState: GameState;
  private gameLoop: NodeJS.Timeout | null = null;

  constructor(readonly room: Party.Room) {
    this.gameState = {
      players: new Map(),
      gameStarted: false,
    };
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Player connected: ${conn.id}`);
    const connections = Array.from(this.room.getConnections());

    // Inicia o game loop quando o primeiro jogador se conecta
    if (connections.length === 1 && !this.gameLoop) {
      this.startGameLoop();
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "game:initRequest":
          initRequest(sender, this.gameState, this.room);
          break;

        case "game:playerInput":
          playerInput(sender, data.payload, this.gameState);
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
    console.log(`Player disconnected: ${conn.id}`);
    disconnect(conn, this.gameState, this.room);
    const connections = Array.from(this.room.getConnections());

    // Para o game loop se não há mais jogadores
    if (connections.length === 0 && this.gameLoop) {
      this.stopGameLoop();
    }
  }

  onError(conn: Party.Connection, error: Error) {
    console.error(`Connection error for ${conn.id}:`, error);
  }

  private startGameLoop() {
    console.log("🎮 Starting game loop...");

    this.gameLoop = setInterval(() => {
      if (this.gameState.players.size > 0) {
        updatePlayerPositions(this.gameState, this.room);

        // Envia atualizações de posição para todos os clientes
        const playersArray = Array.from(this.gameState.players.values());
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
      console.log("⏹️ Stopping game loop...");
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
