import {
  User, Category, Game, Achievement, GameHistory,
  InsertUser, InsertCategory, InsertGame, InsertAchievement, InsertGameHistory
} from '../shared/schema';

export interface IStorage {
  // Операции с пользователями
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCoins(userId: number, amount: number): Promise<User | undefined>;
  updateUserXP(userId: number, amount: number): Promise<User | undefined>;
  
  // Операции с категориями
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Операции с играми
  getGames(): Promise<Game[]>;
  getGameById(id: number): Promise<Game | undefined>;
  getGamesByCategory(categoryId: number): Promise<Game[]>;
  getFeaturedGames(): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  
  // Операции с достижениями
  getAchievementsByUserId(userId: number): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  unlockAchievement(id: number): Promise<Achievement | undefined>;
  
  // Операции с историей игр
  getGameHistoryByUserId(userId: number): Promise<GameHistory[]>;
  createGameHistory(gameHistory: InsertGameHistory): Promise<GameHistory>;
}

// Реализация хранилища в памяти
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private games: Map<number, Game>;
  private achievements: Map<number, Achievement>;
  private gameHistory: Map<number, GameHistory>;
  
  private userIdCounter: number;
  private categoryIdCounter: number;
  private gameIdCounter: number;
  private achievementIdCounter: number;
  private gameHistoryIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.games = new Map();
    this.achievements = new Map();
    this.gameHistory = new Map();
    
    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.gameIdCounter = 1;
    this.achievementIdCounter = 1;
    this.gameHistoryIdCounter = 1;
    
    // Инициализация тестовыми данными
    this.initializeData();
  }
  
  // Методы для работы с пользователями
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    // Создаем пользователя со всеми обязательными полями
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      coins: insertUser.coins !== undefined ? insertUser.coins : 1000,
      level: insertUser.level !== undefined ? insertUser.level : 1,
      xp: insertUser.xp !== undefined ? insertUser.xp : 0
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserCoins(userId: number, amount: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.coins += amount;
    return user;
  }
  
  async updateUserXP(userId: number, amount: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    user.xp += amount;
    
    // Повышение уровня при достижении порога XP
    const xpThreshold = user.level * 100;
    if (user.xp >= xpThreshold) {
      user.level += 1;
      user.xp -= xpThreshold;
    }
    
    return user;
  }
  
  // Методы для работы с категориями
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    // Создаем категорию со всеми обязательными полями
    const category: Category = {
      id,
      name: insertCategory.name,
      iconName: insertCategory.iconName,
      gamesCount: insertCategory.gamesCount !== undefined ? insertCategory.gamesCount : 0
    };
    this.categories.set(id, category);
    return category;
  }
  
  // Методы для работы с играми
  async getGames(): Promise<Game[]> {
    return Array.from(this.games.values());
  }
  
  async getGameById(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }
  
  async getGamesByCategory(categoryId: number): Promise<Game[]> {
    return Array.from(this.games.values()).filter(
      (game) => game.categoryId === categoryId
    );
  }
  
  async getFeaturedGames(): Promise<Game[]> {
    return Array.from(this.games.values()).filter(
      (game) => game.featured
    );
  }
  
  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.gameIdCounter++;
    // Создаем игру со всеми обязательными полями
    const game: Game = {
      id,
      name: insertGame.name,
      description: insertGame.description,
      imageUrl: insertGame.imageUrl,
      categoryId: insertGame.categoryId,
      type: insertGame.type as any,
      difficulty: insertGame.difficulty as any,
      rating: insertGame.rating !== undefined ? insertGame.rating : 45,
      featured: insertGame.featured !== undefined ? insertGame.featured : false
    };
    this.games.set(id, game);
    return game;
  }
  
  // Методы для работы с достижениями
  async getAchievementsByUserId(userId: number): Promise<Achievement[]> {
    return Array.from(this.achievements.values()).filter(
      (achievement) => achievement.userId === userId
    );
  }
  
  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const id = this.achievementIdCounter++;
    // Создаем достижение со всеми обязательными полями
    const achievement: Achievement = {
      id,
      userId: insertAchievement.userId,
      name: insertAchievement.name,
      description: insertAchievement.description,
      unlocked: insertAchievement.unlocked !== undefined ? insertAchievement.unlocked : false,
      unlockedAt: insertAchievement.unlockedAt !== undefined ? insertAchievement.unlockedAt : null
    };
    this.achievements.set(id, achievement);
    return achievement;
  }
  
  async unlockAchievement(id: number): Promise<Achievement | undefined> {
    const achievement = this.achievements.get(id);
    if (!achievement) return undefined;
    
    achievement.unlocked = true;
    achievement.unlockedAt = new Date();
    
    return achievement;
  }
  
  // Методы для работы с историей игр
  async getGameHistoryByUserId(userId: number): Promise<GameHistory[]> {
    return Array.from(this.gameHistory.values()).filter(
      (history) => history.userId === userId
    );
  }
  
  async createGameHistory(insertGameHistory: InsertGameHistory): Promise<GameHistory> {
    const id = this.gameHistoryIdCounter++;
    // Создаем запись истории игры со всеми обязательными полями
    const history: GameHistory = {
      id,
      userId: insertGameHistory.userId,
      gameType: insertGameHistory.gameType as any,
      bet: insertGameHistory.bet,
      won: insertGameHistory.won,
      winAmount: insertGameHistory.winAmount !== undefined ? insertGameHistory.winAmount : 0,
      playedAt: insertGameHistory.playedAt || new Date()
    };
    this.gameHistory.set(id, history);
    return history;
  }
  
  // Инициализация тестовыми данными
  private async initializeData() {
    // Создаем тестового пользователя
    const defaultUser: InsertUser = {
      username: "player1",
      password: "password123",
      coins: 5000
    };
    
    const user = await this.createUser(defaultUser);
    
    // Создаем категории
    const slotsCategory = await this.createCategory({
      name: "Slots",
      iconName: "fa-slot-machine",
      gamesCount: 12
    });
    
    const cardCategory = await this.createCategory({
      name: "Card Games",
      iconName: "fa-cards",
      gamesCount: 8
    });
    
    const tableCategory = await this.createCategory({
      name: "Table Games",
      iconName: "fa-table",
      gamesCount: 6
    });
    
    const specialtyCategory = await this.createCategory({
      name: "Specialty",
      iconName: "fa-dice",
      gamesCount: 4
    });
    
    // Создаем игры
    await this.createGame({
      name: "Lucky Spin",
      description: "Классический игровой автомат с тремя барабанами",
      imageUrl: "/images/slots.jpg",
      categoryId: slotsCategory.id,
      type: "slots",
      difficulty: "beginner",
      rating: 42,
      featured: true
    });
    
    await this.createGame({
      name: "Card Master",
      description: "Испытай удачу в классическом покере",
      imageUrl: "/images/poker.jpg",
      categoryId: cardCategory.id,
      type: "poker",
      difficulty: "intermediate",
      rating: 47,
      featured: true
    });
    
    await this.createGame({
      name: "Black Jack Pro",
      description: "Попробуй набрать 21 очко и обыграть крупье",
      imageUrl: "/images/blackjack.jpg",
      categoryId: cardCategory.id,
      type: "blackjack",
      difficulty: "beginner",
      rating: 45,
      featured: true
    });
    
    await this.createGame({
      name: "Roulette Royale",
      description: "Классическая рулетка с европейскими правилами",
      imageUrl: "/images/roulette.jpg",
      categoryId: tableCategory.id,
      type: "roulette",
      difficulty: "beginner",
      rating: 48,
      featured: true
    });
    
    // Создаем достижения
    await this.createAchievement({
      userId: user.id,
      name: "Новичок",
      description: "Сыграйте свою первую игру",
      unlocked: true,
      unlockedAt: new Date()
    });
    
    await this.createAchievement({
      userId: user.id,
      name: "Счастливчик",
      description: "Выиграйте 5 раз подряд",
      unlocked: false
    });
    
    await this.createAchievement({
      userId: user.id,
      name: "Большой куш",
      description: "Выиграйте более 1000 монет за одну игру",
      unlocked: false
    });
  }
}

// Экземпляр хранилища для использования во всем приложении
export const storage = new MemStorage();
