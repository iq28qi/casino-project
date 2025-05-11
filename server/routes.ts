import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { WebSocketServer } from "ws";

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Настраиваем сессии
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "casino-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000 // очищать просроченные записи каждые 24ч
      }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 неделя
      },
    })
  );

  // Настраиваем аутентификацию
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Неверное имя пользователя." });
        }
        if (user.password !== password) {
          return done(null, false, { message: "Неверный пароль." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Маршруты аутентификации
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Требуется имя пользователя и пароль" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Имя пользователя уже занято" });
      }
      
      const user = await storage.createUser({ username, password });
      return res.status(201).json({ id: user.id, username: user.username });
    } catch (err) {
      return res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      coins: user.coins,
      level: user.level,
      xp: user.xp
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.status(200).json({ message: "Успешно вышли из системы" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      coins: user.coins,
      level: user.level,
      xp: user.xp
    });
  });

  // Маршруты категорий
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // Маршруты игр
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getGames();
      res.json(games);
    } catch (err) {
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/games/featured", async (req, res) => {
    try {
      const games = await storage.getFeaturedGames();
      res.json(games);
    } catch (err) {
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  app.get("/api/games/category/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Неверный ID категории" });
      }
      
      const games = await storage.getGamesByCategory(categoryId);
      res.json(games);
    } catch (err) {
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // Маршруты достижений
  app.get("/api/achievements", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    try {
      const user = req.user as any;
      const achievements = await storage.getAchievementsByUserId(user.id);
      res.json(achievements);
    } catch (err) {
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // Маршруты истории игр
  app.get("/api/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    try {
      const user = req.user as any;
      const history = await storage.getGameHistoryByUserId(user.id);
      res.json(history);
    } catch (err) {
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // Маршрут для игры
  app.post("/api/play/:gameType", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    try {
      const user = req.user as any;
      const { gameType } = req.params;
      const { bet } = req.body;
      
      if (!bet || typeof bet !== 'number' || bet <= 0) {
        return res.status(400).json({ message: "Неверная ставка" });
      }
      
      if (user.coins < bet) {
        return res.status(400).json({ message: "Недостаточно монет" });
      }
      
      let won = false;
      let winAmount = 0;
      let xpEarned = Math.floor(bet / 10); // Базовый опыт за игру
      
      // Обновляем монеты пользователя на сумму ставки
      await storage.updateUserCoins(user.id, -bet);
      
      // Логика игры
      switch (gameType) {
        case 'slots':
          // Слоты: 40% шанс выигрыша с двойной выплатой
          won = Math.random() < 0.4;
          winAmount = won ? bet * 2 : 0;
          break;
          
        case 'roulette':
          // Рулетка: 45% шанс выигрыша с двойной выплатой
          won = Math.random() < 0.45;
          winAmount = won ? bet * 2 : 0;
          break;
          
        case 'blackjack':
          // Блэкджек: 48% шанс выигрыша с выплатой 1.5
          won = Math.random() < 0.48;
          winAmount = won ? Math.floor(bet * 1.5) : 0;
          break;
          
        case 'poker':
          // Покер: 35% шанс выигрыша с тройной выплатой
          won = Math.random() < 0.35;
          winAmount = won ? bet * 3 : 0;
          break;
          
        default:
          return res.status(400).json({ message: "Неверный тип игры" });
      }
      
      // Если победа, обновляем монеты
      if (won) {
        await storage.updateUserCoins(user.id, winAmount);
        xpEarned += Math.floor(winAmount / 20); // Бонусный опыт за победу
      }
      
      // Добавляем опыт независимо от выигрыша/проигрыша
      const updatedUser = await storage.updateUserXP(user.id, xpEarned);
      
      // Записываем историю игры
      const gameHistoryData = {
        userId: user.id,
        gameType,
        bet,
        won,
        winAmount,
        playedAt: new Date()
      };
      
      await storage.createGameHistory(gameHistoryData);
      
      res.json({
        success: true,
        won,
        winAmount,
        xpEarned,
        user: {
          id: updatedUser?.id,
          username: updatedUser?.username,
          coins: updatedUser?.coins,
          level: updatedUser?.level,
          xp: updatedUser?.xp
        }
      });
      
    } catch (err) {
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // Создаем HTTP-сервер
  const httpServer = createServer(app);
  
  // Настраиваем WebSocket-сервер для обновлений в реальном времени
  const wss = new WebSocketServer({ server: httpServer });
  
  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      // Обработка входящих сообщений при необходимости
    });
  });

  return httpServer;
}
