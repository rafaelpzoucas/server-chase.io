// server.ts - PartyKit version with immunity system and 2-player alternating mechanic
import type * as Party from "partykit/server";
import { GameState } from "./types";
import { updatePlayerPositions } from "./utils/update-player-positions";
import { initRequest } from "./events/init-request";
import { playerInput } from "./events/player-input";
import { disconnect } from "./events/disconnect";
import { gameConfig } from "./config";
import { restartGame } from "./events/restart-game";
import { TwoPlayerManager } from "./classes/two-player-manager";
import { transferPique } from "./utils/transfer-it";

// ✅ Importar o gerenciador de imunidade
export class ImmunityManager {
  private immunityTimers = new Map<string, NodeJS.Timeout>();

  setImmunity(
    playerId: string,
    durationMs: number,
    callback: () => void
  ): void {
    // Limpa timer anterior se existir
    this.clearImmunity(playerId);

    // Cria novo timer
    const timer = setTimeout(() => {
      callback();
      this.immunityTimers.delete(playerId);
    }, durationMs);

    this.immunityTimers.set(playerId, timer);
  }

  clearImmunity(playerId: string): void {
    const existingTimer = this.immunityTimers.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.immunityTimers.delete(playerId);
    }
  }

  clearAllImmunities(): void {
    this.immunityTimers.forEach((timer) => clearTimeout(timer));
    this.immunityTimers.clear();
  }
}

export default class GameServer implements Party.Server {
  private gameState: GameState;
  private gameLoop: NodeJS.Timeout | null = null;
  private immunityManager: ImmunityManager;
  private twoPlayerManager: TwoPlayerManager;

  constructor(readonly room: Party.Room) {
    this.gameState = {
      activePlayers: new Map(),
      eliminatedPlayers: new Map(),
      gameStarted: false,
      gameFinished: false,
    };

    this.immunityManager = new ImmunityManager();
    this.twoPlayerManager = new TwoPlayerManager();
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const { searchParams } = new URL(ctx.request.url);
    const nickname = searchParams.get("nickname");

    console.log(
      `Player connected: ${conn.id} - Room: ${this.room.id} - Nickname: ${
        nickname || "Unknown"
      }`
    );

    if (nickname) {
      (conn as any).nickname = nickname;
    }

    const connections = Array.from(this.room.getConnections());

    if (connections.length === 1 && !this.gameLoop) {
      console.log(`🎮 Starting game loop for room: ${this.room.id}`);
      this.startGameLoop();
    }

    this.room.broadcast(
      JSON.stringify({
        type: "room:playerConnected",
        payload: {
          playerId: conn.id,
          nickname: nickname || `Player ${conn.id.slice(0, 6)}`,
          totalPlayers: connections.length,
        },
      }),
      [conn.id]
    );
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "game:initRequest":
          const nickname =
            (sender as any).nickname || `Player ${sender.id.slice(0, 6)}`;
          initRequest(sender, this.gameState, this.room, nickname);

          // ✅ Verificar se deve ativar modo 2 jogadores após init
          this.checkTwoPlayerMode();
          break;

        case "game:restart":
          this.immunityManager.clearAllImmunities();
          this.twoPlayerManager.stop(this.room); // ✅ Parar modo 2 jogadores
          restartGame(this.gameState, this.room);
          break;

        case "game:playerInput":
          playerInput(sender, data.payload, this.gameState);
          if (this.gameState.activePlayers.size === 2) {
            this.checkTwoPlayerMode();
          }
          break;

        case "room:info":
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

    this.immunityManager.clearImmunity(conn.id);
    disconnect(conn, this.gameState, this.room);

    const connections = Array.from(this.room.getConnections());

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

    // ✅ Verificar modo 2 jogadores após desconexão
    this.checkTwoPlayerMode();

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

    this.immunityManager.clearAllImmunities();
    this.twoPlayerManager.stop(this.room); // ✅ Parar modo 2 jogadores
  }

  // ✅ Método para verificar e gerenciar o modo 2 jogadores
  private checkTwoPlayerMode() {
    const activePlayersCount = this.gameState.activePlayers.size;

    if (
      activePlayersCount === 2 &&
      this.gameState.gameStarted &&
      !this.gameState.gameFinished
    ) {
      // Ativar modo 2 jogadores se não estiver ativo
      if (!this.twoPlayerManager.isRunning()) {
        this.twoPlayerManager.start(this.gameState, this.room, () =>
          this.alternateItPlayer()
        );
      }
    } else {
      // Desativar modo 2 jogadores se estiver ativo
      if (this.twoPlayerManager.isRunning()) {
        this.twoPlayerManager.stop(this.room);

        this.room.broadcast(
          JSON.stringify({
            type: "game:twoPlayerModeStopped",
            payload: {
              message: "Modo 2 jogadores desativado.",
            },
          })
        );
      }
    }
  }

  // ✅ Método para alternar o jogador "it"
  private alternateItPlayer() {
    const activePlayers = Array.from(this.gameState.activePlayers.values());

    if (activePlayers.length !== 2) {
      console.log("❌ Cannot alternate - not exactly 2 players");
      return;
    }

    // Encontrar o jogador atual "it"
    const currentItPlayer = activePlayers.find((player) => player.isIt);
    const otherPlayer = activePlayers.find((player) => !player.isIt);

    if (!currentItPlayer || !otherPlayer) {
      console.log("❌ Cannot alternate - no clear it/non-it players");
      return;
    }

    transferPique(currentItPlayer, otherPlayer, this.gameState, this.room);

    console.log(
      `🔄 Alternated IT: ${currentItPlayer.nickname} -> ${otherPlayer.nickname}`
    );

    // Dar 3 segundos de imunidade ao ex-it para evitar tag imediato
    this.setPlayerImmunity(currentItPlayer.id, 3000);

    // Notificar todos os jogadores
    this.room.broadcast(
      JSON.stringify({
        type: "game:itAlternated",
        payload: {
          newItPlayer: {
            id: otherPlayer.id,
            nickname: otherPlayer.nickname,
          },
          formerItPlayer: {
            id: currentItPlayer.id,
            nickname: currentItPlayer.nickname,
          },
          activePlayers: Array.from(this.gameState.activePlayers.values()),
          nextAlternateIn: 10000, // Próxima alternância em 10s
        },
      })
    );
  }

  broadcast(type: string, payload: any, exclude?: Party.Connection) {
    const message = JSON.stringify({ type, payload });

    if (exclude) {
      this.room.broadcast(message, [exclude.id]);
    } else {
      this.room.broadcast(message);
    }
  }

  getGameState() {
    return this.gameState;
  }

  getImmunityManager() {
    return this.immunityManager;
  }

  // ✅ Getter para o two player manager
  getTwoPlayerManager() {
    return this.twoPlayerManager;
  }

  setPlayerImmunity(playerId: string, durationMs: number) {
    const player = this.gameState.activePlayers.get(playerId);
    if (!player) return;

    player.isImmune = true;
    this.gameState.activePlayers.set(playerId, player);

    this.immunityManager.setImmunity(playerId, durationMs, () => {
      const currentPlayer = this.gameState.activePlayers.get(playerId);
      if (currentPlayer) {
        currentPlayer.isImmune = false;
        this.gameState.activePlayers.set(playerId, currentPlayer);

        this.room.broadcast(
          JSON.stringify({
            type: "game:immunityExpired",
            payload: {
              playerId,
              activePlayers: Array.from(this.gameState.activePlayers.values()),
            },
          })
        );
      }
    });
  }
}

export { GameState };
