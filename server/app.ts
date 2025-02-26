import { NextFunction, type Request, Response } from 'express';
import { registerRoutes } from './src/routes/routes.ts';
import { log, serveStatic, setupVite } from './vite';
import app from './server.ts';

const port = process.env.SERVER_PORT ?? 5000;
const server = await registerRoutes(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ message });
  throw err;
});

// importantly only setup vite in development and after
// setting up all the other routes so the catch-all route
// doesn't interfere with the other routes
if (app.get('env') === 'development') {
  await setupVite(app, server);
} else {
  serveStatic(app);
}

// ALWAYS serve the app on port 5000
// this serves both the API and the client

server.listen(
  {
    port,
    host: '0.0.0.0',
    reusePort: true,
  },
  () => {
    log(`serving on port ${port}`);
  }
);
