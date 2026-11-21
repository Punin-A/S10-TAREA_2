import { Router } from 'express';
import { productsController } from '../controllers/products.controller.js';
import { administrator } from '../middleware/auth.js';

export function productsRoutes(products, authenticate) {
  const router = Router();
  const controller = productsController(products);
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.post('/', authenticate, administrator, controller.create);
  router.put('/:id', authenticate, administrator, controller.update);
  router.delete('/:id', authenticate, administrator, controller.remove);
  return router;
}
