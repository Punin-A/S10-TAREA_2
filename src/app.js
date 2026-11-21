import express from 'express';
import helmet from 'helmet';
import { usersRepository } from './repositories/users.repository.js';
import { productsRepository } from './repositories/products.repository.js';
import { favoritesRepository } from './repositories/favorites.repository.js';
import { authentication } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRoutes } from './routes/auth.routes.js';
import { productsRoutes } from './routes/products.routes.js';
import { favoritesRoutes } from './routes/favorites.routes.js';

export function createApp(db, config) {
  const app = express();
  const users = usersRepository(db);
  const products = productsRepository(db);
  const favorites = favoritesRepository(db);
  const authenticate = authentication(users, config);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/auth', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, authRoutes(users, config));
  app.use('/api/products', productsRoutes(products, authenticate));
  app.use('/api/favorites', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, favoritesRoutes(favorites, products, authenticate));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use((req, res) => res.status(404).json({ error: { message: 'Ruta no encontrada.' } }));
  app.use(errorHandler);
  return app;
}
