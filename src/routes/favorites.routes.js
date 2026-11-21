import { Router } from 'express';
import { favoritesController } from '../controllers/favorites.controller.js';

export function favoritesRoutes(favorites, products, authenticate) {
  const router = Router();
  const controller = favoritesController(favorites, products);
  router.use(authenticate);
  router.get('/', controller.list);
  router.post('/', controller.add);
  router.delete('/:productId', controller.remove);
  return router;
}
