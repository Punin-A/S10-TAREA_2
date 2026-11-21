import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { registerData, loginData } from '../middleware/validation.js';
import { HttpError } from '../utils/http-error.js';

export function authController(users, config) {
  // También se compara un hash cuando el correo no existe.
  const dummyHash = bcrypt.hashSync('cuenta-inexistente-solo-comparacion', 12);
  return {
    async register(req, res) {
      const data = registerData(req.body);
      if (users.findByEmail(data.email)) throw new HttpError(409, 'El correo ya está registrado.');
      const passwordHash = await bcrypt.hash(data.password, 12);
      let user;
      try {
        // El rol no se toma del cliente, incluso si intenta enviarlo.
        user = users.create({ name: data.name, email: data.email, passwordHash, role: 'usuario' });
      } catch (error) {
        if (error.errcode === 2067) throw new HttpError(409, 'El correo ya está registrado.');
        throw error;
      }
      res.status(201).json({ user });
    },
    async login(req, res) {
      const data = loginData(req.body);
      const account = users.findByEmail(data.email);
      const valid = await bcrypt.compare(data.password, account?.passwordHash || dummyHash);
      if (!account || !valid) throw new HttpError(401, 'Correo o contraseña incorrectos.');
      const user = users.findById(account.id);
      const token = jwt.sign({ role: user.role }, config.jwtSecret, {
        algorithm: 'HS256', subject: String(user.id), expiresIn: config.jwtExpiresIn,
        issuer: config.jwtIssuer, audience: config.jwtAudience,
      });
      res.json({ token, tokenType: 'Bearer', expiresIn: config.jwtExpiresIn, user });
    },
  };
}
