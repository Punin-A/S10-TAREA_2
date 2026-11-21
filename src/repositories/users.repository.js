export function usersRepository(db) {
  const publicColumns = 'id, name, email, role, created_at AS createdAt';
  return {
    findByEmail(email) {
      return db.prepare(`SELECT ${publicColumns}, password_hash AS passwordHash FROM users WHERE email = ?`).get(email);
    },
    findById(id) {
      return db.prepare(`SELECT ${publicColumns} FROM users WHERE id = ?`).get(id);
    },
    create({ name, email, passwordHash, role = 'usuario' }) {
      const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
        .run(name, email, passwordHash, role);
      return this.findById(Number(result.lastInsertRowid));
    },
  };
}
