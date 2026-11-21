import bcrypt from 'bcryptjs';
import { loadConfig } from '../src/config/env.js';
import { openDatabase } from '../src/db/database.js';
import { registerData } from '../src/middleware/validation.js';
import { usersRepository } from '../src/repositories/users.repository.js';
import { productsRepository } from '../src/repositories/products.repository.js';

export const sampleProducts = [
  { name: 'Teclado mecánico', description: 'Teclado compacto de ejemplo con conexión USB.', category: 'Tecnología', priceCents: 4590 },
  { name: 'Ratón inalámbrico', description: 'Ratón óptico de ejemplo con receptor USB.', category: 'Tecnología', priceCents: 1850 },
  { name: 'Cuaderno A5', description: 'Cuaderno ficticio de 100 hojas rayadas.', category: 'Papelería', priceCents: 375 },
  { name: 'Lámpara de escritorio', description: 'Lámpara LED ficticia con luz regulable.', category: 'Hogar', priceCents: 2499 },
  { name: 'Botella reutilizable', description: 'Botella de ejemplo de acero, capacidad 750 ml.', category: 'Deportes', priceCents: 1290 },
];

export async function seedDatabase(db, admin) {
  const data = registerData(admin);
  const users = usersRepository(db);
  const products = productsRepository(db);
  const existing = users.findByEmail(data.email);
  if (existing && existing.role !== 'administrador') {
    throw new Error('ADMIN_EMAIL ya pertenece a un usuario; usa otro correo para el administrador.');
  }
  const passwordHash = existing ? null : await bcrypt.hash(data.password, 12);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!existing) users.create({ name: data.name, email: data.email, passwordHash, role: 'administrador' });
    // No duplica ni repone datos cuando ya existe un catálogo.
    if (products.list().length === 0) sampleProducts.forEach((product) => products.create(product));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

if (import.meta.main) {
  let db;
  try {
    const config = loadConfig();
    db = openDatabase(config.databasePath);
    await seedDatabase(db, { name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
    console.log('Inicialización completada: administrador local y catálogo de ejemplo. Las cuentas existentes conservan su contraseña.');
  } catch (error) {
    console.error('No se pudo inicializar:', error.message);
    process.exitCode = 1;
  } finally {
    db?.close();
  }
}
