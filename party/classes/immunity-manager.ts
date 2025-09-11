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
