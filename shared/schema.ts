// Типы данных и схемы для всего приложения
export interface User {
  id: number;
  username: string;
  password: string;
  coins: number;
  level: number;
  xp: number;
}

export interface Game {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  categoryId: number;
  type: GameType;
  difficulty: Difficulty;
  rating: number;
  featured: boolean;
}

export interface Category {
  id: number;
  name: string;
  iconName: string;
  gamesCount: number;
}

export interface Achievement {
  id: number;
  userId: number;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: Date | null;
}

export interface GameHistory {
  id: number;
  userId: number;
  gameType: GameType;
  bet: number;
  won: boolean;
  winAmount: number | null;
  playedAt: Date;
}

export type GameType = 'slots' | 'poker' | 'blackjack' | 'roulette';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface GamePlayResult {
  success: boolean;
  won: boolean;
  winAmount: number;
  xpEarned: number;
  user: User;
}

export interface GameRules {
  title: string;
  description: string;
  howToPlay: string[];
  winningCombinations: {
    icon: string;
    title: string;
    description: string;
  }[];
}

// Типы для добавления новых данных
export interface InsertUser {
  username: string;
  password: string;
  coins?: number;
  level?: number;
  xp?: number;
}

export interface InsertCategory {
  name: string;
  iconName: string;
  gamesCount?: number;
}

export interface InsertGame {
  name: string;
  description: string;
  imageUrl: string;
  categoryId: number;
  type: string;
  difficulty: string;
  rating?: number;
  featured?: boolean;
}

export interface InsertAchievement {
  userId: number;
  name: string;
  description: string;
  unlocked?: boolean;
  unlockedAt?: Date | null;
}

export interface InsertGameHistory {
  userId: number;
  gameType: string;
  bet: number;
  won: boolean;
  winAmount?: number | null;
  playedAt?: Date;
}
