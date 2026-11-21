import { HttpError } from '../utils/http-error.js';

function invalid(field, message) {
  throw new HttpError(400, 'Datos inválidos.', [{ field, message }]);
}

function bodyObject(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('body', 'Envía un objeto JSON.');
  const extra = Object.keys(body).find((key) => !allowed.includes(key));
  if (extra) invalid(extra, 'Campo no permitido.');
}

function text(value, field, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    invalid(field, `Debe ser texto de ${min} a ${max} caracteres, sin contar espacios al inicio o al final.`);
  }
  return value.trim();
}

function email(value) {
  const normalized = text(value, 'email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) invalid('email', 'Correo electrónico inválido.');
  return normalized;
}

function password(value) {
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value, 'utf8') > 72 || !value.trim()) {
    invalid('password', 'Debe tener al menos 12 caracteres y como máximo 72 bytes UTF-8.');
  }
  return value;
}

export function registerData(body) {
  bodyObject(body, ['name', 'email', 'password']);
  return { name: text(body.name, 'name', 2, 100), email: email(body.email), password: password(body.password) };
}

export function loginData(body) {
  bodyObject(body, ['email', 'password']);
  if (typeof body.password !== 'string' || !body.password.length || Buffer.byteLength(body.password, 'utf8') > 72) {
    invalid('password', 'Debe ser texto no vacío de hasta 72 bytes UTF-8.');
  }
  return { email: email(body.email), password: body.password };
}

export function productData(body) {
  bodyObject(body, ['name', 'description', 'category', 'price']);
  const name = text(body.name, 'name', 1, 150);
  const description = text(body.description, 'description', 1, 2000);
  const category = text(body.category, 'category', 1, 80);
  const price = body.price;
  const cents = typeof price === 'number' ? Math.round(price * 100) : NaN;
  if (!Number.isFinite(price) || price <= 0 || price > 9999999.99 ||
      !Number.isSafeInteger(cents) || cents < 1 || Math.abs(price * 100 - cents) > 0.000001) {
    invalid('price', 'Debe ser un número mayor que cero, máximo 9999999.99 y con hasta dos decimales.');
  }
  return { name, description, category, priceCents: cents };
}

export function positiveId(value, field = 'id') {
  if (!((typeof value === 'string' && /^[1-9]\d*$/.test(value)) || typeof value === 'number') ||
      !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    invalid(field, 'Debe ser un entero positivo seguro.');
  }
  return Number(value);
}

export function favoriteData(body) {
  bodyObject(body, ['productId']);
  return positiveId(body.productId, 'productId');
}

export function categoryFilter(query) {
  const extra = Object.keys(query).find((key) => key !== 'category');
  if (extra) invalid(extra, 'Filtro no permitido. Usa category.');
  return query.category === undefined ? undefined : text(query.category, 'category', 1, 80);
}
