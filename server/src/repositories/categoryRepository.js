import { getDb } from "../config/database.js";

const normalizeName = (name) => String(name || "").trim().toLowerCase();

class CategoryRepository {
  async getAll() {
    const db = getDb();
    return db.all(`
      SELECT c.id, c.name, c.color, COUNT(sc.snippet_id) AS snippet_count
      FROM categories c
      LEFT JOIN snippet_categories sc ON sc.category_id = c.id
      GROUP BY c.id
      ORDER BY LOWER(c.name)
    `);
  }

  async create({ name, color = "" }) {
    const db = getDb();
    const normalizedName = normalizeName(name);
    const result = await db.run("INSERT INTO categories (name, color) VALUES (?, ?) ON CONFLICT DO NOTHING", [normalizedName, color]);
    if (!result.changes) return null;
    return db.get("SELECT id, name, color FROM categories WHERE LOWER(name) = LOWER(?)", [normalizedName]);
  }

  async update(id, { name, color }) {
    const db = getDb();
    const existing = await db.get("SELECT id FROM categories WHERE id = ?", [id]);
    if (!existing) return null;
    await db.run("UPDATE categories SET name = ?, color = ? WHERE id = ?", [normalizeName(name), color, id]);
    return db.get("SELECT id, name, color FROM categories WHERE id = ?", [id]);
  }

  async delete(id) {
    const db = getDb();
    const result = await db.run("DELETE FROM categories WHERE id = ?", [id]);
    return result.changes > 0;
  }
}

export default new CategoryRepository();
