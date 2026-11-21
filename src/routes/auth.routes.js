import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

export function authRoutes(users, config) {
  const router = Router();
  const controller = authController(users, config);
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  return router;
}
