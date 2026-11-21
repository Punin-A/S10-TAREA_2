import { HttpError } from '../utils/http-error.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { message: error.message, ...(error.details ? { details: error.details } : {}) } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'El cuerpo debe ser JSON válido.' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'El cuerpo supera el límite de 16 KB.' } });
  }
  // Solo se registra un código técnico; nunca cuerpos, tokens, contraseñas ni SQL.
  console.error('Error interno:', error.code || 'UNEXPECTED_ERROR');
  return res.status(500).json({ error: { message: 'Error interno del servidor.' } });
}
