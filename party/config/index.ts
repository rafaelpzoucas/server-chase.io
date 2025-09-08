import { PlayerConfig } from "./player";

export const gameConfig = {
  // Arena - tamanho da área de jogo
  arena: {
    width: 800,
    height: 600,
  },

  // Players - configurações dos jogadores
  player: PlayerConfig,

  pique: {
    immunityTime: 3000,
  },
};
