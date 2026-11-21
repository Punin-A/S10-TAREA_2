export function favoritesRepository(db) {
  return {
    list(userId) {
      return db.prepare(`SELECT p.id, p.name, p.description, p.category,
          p.price_cents / 100.0 AS price, p.created_at AS createdAt, f.created_at AS favoritedAt
        FROM favorites f JOIN products p ON p.id = f.product_id
        WHERE f.user_id = ? ORDER BY f.created_at, p.id`).all(userId);
    },
    add(userId, productId) {
      db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(userId, productId);
    },
    remove(userId, productId) {
      return db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?')
        .run(userId, productId).changes > 0;
    },
  };
}
