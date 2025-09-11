import { GameState } from "../types";
import * as Party from "partykit/server";

export class TwoPlayerManager {
  private alternateTimer: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  start(
    gameState: GameState,
    room: Party.Room,
    alternateCallback: () => void
  ): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log("🔄 Starting 2-player alternating mode");

    // Inicia o timer de alternância a cada 10 segundos
    this.alternateTimer = setInterval(() => {
      if (gameState.activePlayers.size === 2) {
        alternateCallback();
      } else {
        // Se não há mais 2 jogadores, para o sistema
        this.stop(room);
      }
    }, 13000); // 13 segundos

    // Notifica os jogadores sobre o modo alternado
    room.broadcast(
      JSON.stringify({
        type: "game:twoPlayerModeStarted",
        payload: {
          message:
            "Modo 2 jogadores ativado! O 'it' alternará a cada 10 segundos.",
          nextAlternateIn: 10000,
        },
      })
    );
  }

  stop(room: Party.Room): void {
    if (!this.isActive) return;

    this.isActive = false;
    console.log("⏹️ Stopping 2-player alternating mode");

    if (this.alternateTimer) {
      clearInterval(this.alternateTimer);
      this.alternateTimer = null;
    }

    // Notifica os jogadores sobre o modo alternado
    room.broadcast(
      JSON.stringify({
        type: "game:twoPlayerModeFinished",
        payload: {
          message: "Modo 2 jogadores finalizado!",
        },
      })
    );
  }

  isRunning(): boolean {
    return this.isActive;
  }
}
