import "dotenv/config";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import request from "supertest";
import pino from "pino";
import { createPool, MysqlRepository } from "./src/db.js";
import { createApp } from "./src/app.js";

const pool = createPool();
const origin = "http://127.0.0.1:5173";
const app = createApp({
  repository: new MysqlRepository(pool),
  logger: pino({ level: "silent" }),
  origin,
});
const emails = [
  `integration-a-${randomUUID()}@example.test`,
  `integration-b-${randomUUID()}@example.test`,
];
try {
  const a = request.agent(app),
    b = request.agent(app);
  const password = randomUUID();
  for (const [i, agent] of [a, b].entries())
    assert.equal(
      (
        await agent
          .post("/api/auth/signup")
          .set("Origin", origin)
          .send({
            name: "Isolated integration account",
            email: emails[i],
            password,
          })
      ).status,
      201,
    );
  const content =
    "<h2>Heading</h2><p><strong>Bold</strong> <em>italic</em></p><ul><li>List</li></ul><blockquote><p>Quote</p></blockquote>";
  const created = await a
    .post("/api/notes")
    .set("Origin", origin)
    .send({ title: "Integration note", content });
  assert.equal(created.status, 201);
  const id = created.body.note.id;
  assert.equal(created.body.note.content, content);
  assert.equal((await b.get("/api/notes")).body.notes.length, 0);
  assert.equal(
    (
      await b
        .put(`/api/notes/${id}`)
        .set("Origin", origin)
        .send({ title: "Denied", content: "" })
    ).status,
    404,
  );
  assert.equal(
    (await b.delete(`/api/notes/${id}`).set("Origin", origin)).status,
    404,
  );
  assert.equal(
    (
      await a
        .put(`/api/notes/${id}`)
        .set("Origin", origin)
        .send({ title: "Updated", content })
    ).status,
    200,
  );
  const [rows] = await pool.execute(
    "SELECT title,content FROM notes WHERE id=?",
    [id],
  );
  assert.equal(rows[0].title, "Updated");
  assert.equal(rows[0].content, content);
  assert.equal(
    (await a.post("/api/auth/logout").set("Origin", origin)).status,
    204,
  );
  assert.equal((await a.get("/api/notes")).status, 401);
  assert.equal(
    (
      await a
        .post("/api/auth/login")
        .set("Origin", origin)
        .send({ email: emails[0], password })
    ).status,
    200,
  );
  assert.equal((await a.get("/api/notes")).body.notes[0].id, id);
  assert.equal(
    (await a.delete(`/api/notes/${id}`).set("Origin", origin)).status,
    204,
  );
  assert.equal((await a.get("/api/notes")).body.notes.length, 0);
  assert.equal((await a.get('/api/trash')).body.notes[0].id,id);
  assert.equal((await b.get('/api/trash')).body.notes.length,0);
  assert.equal((await b.post('/api/notes/'+id+'/restore').set('Origin',origin)).status,404);
  assert.equal((await a.put('/api/notes/'+id).set('Origin',origin).send({title:'Denied',content:''})).status,404);
  assert.equal((await a.post('/api/notes/'+id+'/restore').set('Origin',origin)).status,204);
  assert.equal((await a.get('/api/notes')).body.notes[0].content,content);
  const imported=await a.post('/api/notes/import').set('Origin',origin).send({format:'folio-notes-v1',notes:[{title:'Backup',content:'<p>Restored backup</p>'},{title:'Backup two',content:''}]});
  assert.equal(imported.status,201);assert.equal(imported.body.count,2);
  assert.equal((await a.get('/api/notes')).body.notes.length,3);
  assert.equal((await b.get('/api/notes')).body.notes.length,0);
  console.log(
    "PASS: real MySQL registration, rich text, persistence, isolation, update, logout/login, trash/restore and transactional import.",
  );
} finally {
  await pool.execute("DELETE FROM users WHERE email IN (?,?)", emails);
  await pool.end();
  console.log("Cleaned up this run's temporary accounts only.");
}
