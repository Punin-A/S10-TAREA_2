export function productsRepository(db) {
  const columns = 'id, name, description, category, price_cents / 100.0 AS price, created_at AS createdAt';
  return {
    list(category) {
      return category
        ? db.prepare(`SELECT ${columns} FROM products WHERE category = ? ORDER BY id`).all(category)
        : db.prepare(`SELECT ${columns} FROM products ORDER BY id`).all();
    },
    findById(id) {
      return db.prepare(`SELECT ${columns} FROM products WHERE id = ?`).get(id);
    },
    create({ name, description, category, priceCents }) {
      const result = db.prepare('INSERT INTO products (name, description, category, price_cents) VALUES (?, ?, ?, ?)')
        .run(name, description, category, priceCents);
      return this.findById(Number(result.lastInsertRowid));
    },
    update(id, { name, description, category, priceCents }) {
      const result = db.prepare('UPDATE products SET name = ?, description = ?, category = ?, price_cents = ? WHERE id = ?')
        .run(name, description, category, priceCents, id);
      return result.changes ? this.findById(id) : undefined;
    },
    remove(id) {
      return db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0;
    },
  };
}
