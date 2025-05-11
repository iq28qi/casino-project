import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Простой логгер запросов
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Перехватываем ответы для логирования
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Обрезаем слишком длинные сообщения
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(`[express] ${logLine}`);
    }
  });

  next();
});

(async () => {
  // Регистрируем маршруты и получаем HTTP-сервер
  const server = await registerRoutes(app);

  // Обработчик ошибок
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Внутренняя ошибка сервера";

    res.status(status).json({ message });
    console.error(err);
  });

  // Настраиваем сервер для обслуживания статических файлов клиента в продакшне
  if (app.get("env") !== "development") {
    app.use(express.static("./dist/public"));
    
    // Обслуживаем SPA для всех остальных маршрутов
    app.get("*", (_req, res) => {
      res.sendFile("index.html", { root: "./dist/public" });
    });
  }

  // Запускаем сервер на порту 5000
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    console.log(`[express] serving on port ${port}`);
  });
})();
