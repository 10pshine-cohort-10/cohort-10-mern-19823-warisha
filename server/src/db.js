import mysql from "mysql2/promise";
export function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "shine_notes",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "shine_notes",
    connectionLimit: 10,
    timezone: "Z",
  });
}
export class MysqlRepository {
  constructor(pool) {
    this.pool = pool;
  }
  async findUser(email) {
    const [rows] = await this.pool.execute(
      "SELECT id,name,email,password_hash FROM users WHERE email=?",
      [email],
    );
    return rows[0];
  }
  async createUser({ name, email, password_hash }) {
    const [result] = await this.pool.execute(
      "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",
      [name, email, password_hash],
    );
    return { id: result.insertId, name, email };
  }
  async createSession(token, userId, expiresAt) {
    await this.pool.execute(
      "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)",
      [token, userId, expiresAt],
    );
  }
  async sessionUser(token) {
    const [rows] = await this.pool.execute(
      "SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()",
      [token],
    );
    return rows[0];
  }
  async deleteSession(token) {
    await this.pool.execute("DELETE FROM sessions WHERE token_hash=?", [token]);
  }
  async listNotes(userId) {
    const [rows] = await this.pool.execute(
      "SELECT id,title,content,created_at,updated_at FROM notes WHERE user_id=? AND id NOT IN (SELECT note_id FROM note_trash) ORDER BY updated_at DESC,id DESC",
      [userId],
    );
    return rows;
  }
  async saveNote(userId, id, { title, content }) {
    if (id) {
      const [result] = await this.pool.execute(
        "UPDATE notes SET title=?,content=?,updated_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=? AND id NOT IN (SELECT note_id FROM note_trash)",
        [title, content, id, userId],
      );
      if (!result.affectedRows) return null;
    } else {
      const [result] = await this.pool.execute(
        "INSERT INTO notes (user_id,title,content) VALUES (?,?,?)",
        [userId, title, content],
      );
      id = result.insertId;
    }
    const [rows] = await this.pool.execute(
      "SELECT id,title,content,created_at,updated_at FROM notes WHERE id=? AND user_id=?",
      [id, userId],
    );
    return rows[0];
  }
  async listTrash(userId) {
    const [rows] = await this.pool.execute('SELECT n.id,n.title,n.content,n.created_at,n.updated_at FROM notes n JOIN note_trash t ON t.note_id=n.id WHERE n.user_id=? ORDER BY t.deleted_at DESC',[userId]);
    return rows;
  }
  async restoreNote(userId,id) {
    const [result] = await this.pool.execute('DELETE t FROM note_trash t JOIN notes n ON n.id=t.note_id WHERE n.id=? AND n.user_id=?',[id,userId]);
    return result.affectedRows > 0;
  }
  async importNotes(userId,notes) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const n of notes) await connection.execute('INSERT INTO notes (user_id,title,content) VALUES (?,?,?)',[userId,n.title,n.content]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }
  async deleteNote(userId, id) {
    const [result] = await this.pool.execute(
      "INSERT INTO note_trash (note_id) SELECT id FROM notes WHERE id=? AND user_id=? AND id NOT IN (SELECT note_id FROM note_trash)",
      [id, userId],
    );
    return result.affectedRows > 0;
  }
}
