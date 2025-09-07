export const GAME_CONFIG = {
  // Arena - tamanho da área de jogo
  ARENA_WIDTH: 800,
  ARENA_HEIGHT: 600,

  // Players - configurações dos jogadores
  PLAYER_SIZE: 20, // tamanho do quadrado do jogador
  PLAYER_SPEED: 6, // pixels por segundo
  PIQUE_SPEED_BONUS: 1.2, // 20% mais rápido
  FREEZE_DURATION: 1000, // 1 segundo congelado

  // Game - configurações da partida
  GAME_DURATION: 60, // 1 minuto
  POINTS_PER_SECOND: 1, // pontos por segundo para quem não é pique
  POINTS_PER_CATCH: 5, // pontos para quem pega alguém

  // Obstacles - configurações dos obstáculos
  OBSTACLE_COUNT: 8,
  OBSTACLE_MIN_SIZE: 40,
  OBSTACLE_MAX_SIZE: 80,
};

// Cores dos jogadores
export const PLAYER_COLORS = {
  PIQUE: "red", // vermelho
  NORMAL: "gray", // cinza
  SELECTED: "green", // verde
} as const;

// Teclas de movimento
export const MOVEMENT_KEYS = {
  // Player 1 - WASD
  PLAYER_1: {
    UP: "w",
    DOWN: "s",
    LEFT: "a",
    RIGHT: "d",
  },
  // Player 2 - Arrow keys
  PLAYER_2: {
    UP: "ArrowUp",
    DOWN: "ArrowDown",
    LEFT: "ArrowLeft",
    RIGHT: "ArrowRight",
  },
} as const;
