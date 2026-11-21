import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/http-error.js';

export function authentication(users, config) {
  return (req, res, next) => {
    const header = req.get('Authorization');
    const match = header?.match(/^Bearer ([^\s]+)$/i);
    if (!match) throw new HttpError(401, 'Se requiere un token Bearer válido.');
    let payload;
    try {
      payload = jwt.verify(match[1], config.jwtSecret, {
        algorithms: ['HS256'], issuer: config.jwtIssuer, audience: config.jwtAudience,
      });
    } catch {
      throw new HttpError(401, 'Token inválido o vencido.');
    }
    if (typeof payload !== 'object' || !Number.isInteger(payload.exp) ||
        typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub) ||
        !Number.isSafeInteger(Number(payload.sub))) {
      throw new HttpError(401, 'Token inválido o vencido.');
    }
    // La identidad viene del JWT verificado y el rol actual se consulta en la base.
    const user = users.findById(Number(payload.sub));
    if (!user) throw new HttpError(401, 'Token inválido o vencido.');
    req.user = user;
    next();
  };
}

export function administrator(req, res, next) {
  if (req.user.role !== 'administrador') throw new HttpError(403, 'Se requiere el rol administrador.');
  next();
}
