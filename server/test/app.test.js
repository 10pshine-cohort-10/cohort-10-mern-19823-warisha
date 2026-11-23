import { expect } from "chai";
import request from "supertest";
import pino from "pino";
import { createApp } from "../src/app.js";
import { MysqlRepository } from "../src/db.js";

class MemoryRepository {
  users = [];
  sessions = new Map();
  notes = [];
  trashed = new Set();
  async findUser(email) {
    return this.users.find((u) => u.email === email);
  }
  async createUser(data) {
    const user = { id: this.users.length + 1, ...data };
    this.users.push(user);
    return user;
  }
  async createSession(token, id, expires) {
    this.sessions.set(token, { id, expires });
  }
  async sessionUser(token) {
    const session = this.sessions.get(token);
    return session && session.expires > new Date()
      ? this.users.find((u) => u.id === session.id)
      : null;
  }
  async deleteSession(token) {
    this.sessions.delete(token);
  }
  async listNotes(id) {
    return this.notes.filter((n) => n.user_id === id && !this.trashed.has(n.id));
  }
  async saveNote(userId, id, data) {
    if (id) {
      const n = this.notes.find((n) => n.id === id && n.user_id === userId && !this.trashed.has(n.id));
      if (!n) return null;
      Object.assign(n, data);
      return n;
    }
    const n = {
      id: this.notes.length + 1,
      user_id: userId,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.notes.push(n);
    return n;
  }
  async listTrash(id) { return this.notes.filter(n=>n.user_id===id && this.trashed.has(n.id)); }
  async restoreNote(userId,id) { if(!this.notes.some(n=>n.id===id&&n.user_id===userId))return false;return this.trashed.delete(id); }
  async importNotes(userId,notes) {for(const n of notes)await this.saveNote(userId,null,n);}
  async deleteNote(userId, id) {
    const index = this.notes.findIndex(
      (n) => n.id === id && n.user_id === userId,
    );
    if (index < 0) return false;
    if(this.trashed.has(id)) return false;
    this.trashed.add(id);
    return true;
  }
}
const origin = "http://127.0.0.1:5173";
describe("Authentication and private notes API", function () {
  this.timeout(15000);
  let app, repo;
  beforeEach(() => {
    repo = new MemoryRepository();
    app = createApp({
      repository: repo,
      logger: pino({ level: "silent" }),
      origin,
    });
  });
  const signup = (agent, email = "one@example.com") =>
    agent
      .post("/api/auth/signup")
      .set("Origin", origin)
      .send({ name: "Warisha", email, password: "MyStrongPass123!" });
  it('moves notes to private trash and restores without losing content',async()=>{
    const a=request.agent(app), b=request.agent(app);await signup(a);await signup(b,'two@example.com');
    const created=await a.post('/api/notes').set('Origin',origin).send({title:'Keep me',content:'<p>Private</p>'});const id=created.body.note.id;
    expect((await a.delete('/api/notes/'+id).set('Origin',origin)).status).eq(204);
    expect((await a.get('/api/notes')).body.notes).length(0);expect((await a.get('/api/trash')).body.notes[0].content).eq('<p>Private</p>');
    expect((await b.get('/api/trash')).body.notes).length(0);expect((await b.post('/api/notes/'+id+'/restore').set('Origin',origin)).status).eq(404);
    expect((await a.put('/api/notes/'+id).set('Origin',origin).send({title:'Cannot edit trash',content:''})).status).eq(404);
    expect((await a.post('/api/notes/'+id+'/restore').set('Origin',origin)).status).eq(204);
    expect((await a.get('/api/notes')).body.notes[0].id).eq(id);
  });
  it('validates the entire backup before importing and sanitizes imported HTML',async()=>{
    const a=request.agent(app);await signup(a);
    const result=await a.post('/api/notes/import').set('Origin',origin).send({format:'folio-notes-v1',notes:[{title:'Imported',content:'<p onclick="bad()">Safe</p><script>bad()</script>'}]});expect(result.status).eq(201);expect(result.body.count).eq(1);
    expect((await a.get('/api/notes')).body.notes[0].content).eq('<p>Safe</p>');
    for(const notes of [[{title:'Valid',content:''},{title:'',content:''}],[],Array(101).fill({title:'Too many',content:''})]) expect((await a.post('/api/notes/import').set('Origin',origin).send({format:'folio-notes-v1',notes})).status).eq(400);
    expect((await a.get('/api/notes')).body.notes).length(1);
    expect((await request(app).post('/api/notes/import').set('Origin',origin).send({})).status).eq(401);
  });
  it("hashes passwords, sets an HttpOnly cookie and restores the session", async () => {
    const agent = request.agent(app);
    const result = await signup(agent);
    expect(result.status).eq(201);
    expect(result.body.user).not.have.property("password_hash");
    expect(repo.users[0].password_hash).not.eq("MyStrongPass123!");
    expect(result.headers["set-cookie"][0]).include("HttpOnly");
    expect(result.headers["set-cookie"][0]).include("SameSite=Lax");
    expect((await agent.get("/api/auth/me")).status).eq(200);
  });
  it('redacts newly issued session cookies in response logs',async()=>{
    let output='';const logger=pino({level:'info'},{write:line=>{output+=line;}});
    const logged=createApp({repository:repo,logger,origin});
    const response=await signup(request(logged));
    const token=response.headers['set-cookie'][0].split(';')[0].split('=')[1];
    expect(output).not.include(token);expect(output).include('[Redacted]');
  });
  it("rejects invalid registration and duplicate email", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/signup")
          .set("Origin", origin)
          .send({ name: "A", email: "bad", password: "short" })
      ).status,
    ).eq(400);
    await signup(request(app));
    expect((await signup(request(app))).status).eq(409);
  });
  it("rejects bad passwords, supports login and invalidates logout", async () => {
    await signup(request(app));
    const agent = request.agent(app);
    expect(
      (
        await agent
          .post("/api/auth/login")
          .set("Origin", origin)
          .send({ email: "one@example.com", password: "bad" })
      ).status,
    ).eq(401);
    expect(
      (
        await agent
          .post("/api/auth/login")
          .set("Origin", origin)
          .send({ email: "one@example.com", password: "MyStrongPass123!" })
      ).status,
    ).eq(200);
    expect(
      (await agent.post("/api/auth/logout").set("Origin", origin)).status,
    ).eq(204);
    expect((await agent.get("/api/auth/me")).status).eq(401);
  });
  it("blocks unauthenticated access and cross-site mutations", async () => {
    expect((await request(app).get("/api/notes")).status).eq(401);
    expect(
      (
        await request(app)
          .post("/api/notes")
          .set("Origin", "https://evil.example")
          .send({ title: "x", content: "" })
      ).status,
    ).eq(403);
  });
  it("creates, updates and deletes a note while sanitizing unsafe HTML", async () => {
    const agent = request.agent(app);
    await signup(agent);
    const created = await agent.post("/api/notes").set("Origin", origin).send({
      title: "Plan",
      content: '<p onclick="evil()">Hello</p><script>alert(1)</script>',
    });
    expect(created.status).eq(201);
    expect(created.body.note.content).eq("<p>Hello</p>");
    const id = created.body.note.id;
    const updated = await agent
      .put(`/api/notes/${id}`)
      .set("Origin", origin)
      .send({ title: "Updated", content: "<strong>Safe</strong>" });
    expect(updated.status).eq(200);
    expect(updated.body.note.title).eq("Updated");
    expect((await agent.get("/api/notes")).body.notes).have.length(1);
    expect(
      (await agent.delete(`/api/notes/${id}`).set("Origin", origin)).status,
    ).eq(204);
    expect((await agent.get("/api/notes")).body.notes).have.length(0);
  });
  it("prevents a second user from reading, modifying or deleting private notes", async () => {
    const one = request.agent(app),
      two = request.agent(app);
    await signup(one);
    await signup(two, "two@example.com");
    const result = await one
      .post("/api/notes")
      .set("Origin", origin)
      .send({ title: "Secret", content: "Private" });
    const id = result.body.note.id;
    expect((await two.get("/api/notes")).body.notes).have.length(0);
    expect(
      (
        await two
          .put(`/api/notes/${id}`)
          .set("Origin", origin)
          .send({ title: "Stolen", content: "" })
      ).status,
    ).eq(404);
    expect(
      (await two.delete(`/api/notes/${id}`).set("Origin", origin)).status,
    ).eq(404);
    expect((await one.get("/api/notes")).body.notes[0].title).eq("Secret");
  });
  it("validates note titles and identifiers", async () => {
    const agent = request.agent(app);
    await signup(agent);
    expect(
      (
        await agent
          .post("/api/notes")
          .set("Origin", origin)
          .send({ title: " ", content: "" })
      ).status,
    ).eq(400);
    expect(
      (await agent.delete("/api/notes/not-an-id").set("Origin", origin)).status,
    ).eq(400);
  });
  it("handles database failures without leaking implementation details", async () => {
    repo.findUser = async () => {
      throw new Error("secret database password");
    };
    const result = await signup(request(app));
    expect(result.status).eq(500);
    expect(JSON.stringify(result.body)).not.include("secret");
  });
  it("rejects expired sessions", async () => {
    const agent = request.agent(app);
    await signup(agent);
    for (const session of repo.sessions.values()) session.expires = new Date(0);
    expect((await agent.get("/api/notes")).status).eq(401);
  });
  it("rejects passwords over bcrypt UTF-8 byte limit", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .set("Origin", origin)
      .send({
        name: "Unicode User",
        email: "unicode@example.com",
        password: "😀".repeat(20),
      });
    expect(response.status).eq(400);
  });
  it("returns safe errors for invalid JSON, oversized bodies and missing endpoints", async () => {
    const invalid = await request(app)
      .post("/api/auth/signup")
      .set("Origin", origin)
      .set("Content-Type", "application/json")
      .send("{invalid");
    expect(invalid.status).eq(400);
    const large = await request(app)
      .post("/api/notes")
      .set("Origin", origin)
      .send({ title: "Large", content: "x".repeat(160000) });
    expect(large.status).eq(413);
    expect((await request(app).get("/api/missing")).status).eq(404);
  });
  it("redacts cookies and never serializes SQL details in error logs", async () => {
    let output = "";
    const logger = pino(
      { level: "info" },
      {
        write: (line) => {
          output += line;
        },
      },
    );
    const unsafe = new Error("PRIVATE_NOTE_SENTINEL");
    unsafe.code = "ER_TEST";
    unsafe.sql = "PRIVATE_SQL_SENTINEL";
    repo.findUser = async () => {
      throw unsafe;
    };
    const logged = createApp({ repository: repo, logger, origin });
    await request(logged)
      .post("/api/auth/signup")
      .set("Origin", origin)
      .set("Cookie", "session=PRIVATE_COOKIE_SENTINEL")
      .send({
        name: "Example",
        email: "one@example.com",
        password: "PRIVATE_PASSWORD_SENTINEL",
      });
    expect(output).include("ER_TEST");
    for (const secret of [
      "PRIVATE_NOTE_SENTINEL",
      "PRIVATE_SQL_SENTINEL",
      "PRIVATE_COOKIE_SENTINEL",
      "PRIVATE_PASSWORD_SENTINEL",
    ])
      expect(output).not.include(secret);
  });
});
describe("MySQL data access ownership boundaries", () => {
  it("binds values and includes owner conditions for update, read and delete", async () => {
    const calls = [];
    const pool = {
      execute: async (sql, args) => {
        calls.push({ sql, args });
        if (sql.startsWith("SELECT")) return [[{ id: 8, title: "New" }]];
        return [{ affectedRows: 1 }];
      },
    };
    const repo = new MysqlRepository(pool);
    await repo.saveNote(2, 8, { title: "New", content: "text" });
    await repo.deleteNote(2, 8);
    await repo.listNotes(2);
    expect(calls[0].sql).include("WHERE id=? AND user_id=?");
    expect(calls[0].args).deep.eq(["New", "text", 8, 2]);
    expect(calls[1].args).deep.eq([8, 2]);
    expect(calls[2].args).deep.eq([8, 2]);
    expect(calls[3].args).deep.eq([2]);
  });
});

describe('Transactional backup import',()=>{
 it('rolls back and releases the connection if a later insert fails',async()=>{
  let inserted=0,rolledBack=false,committed=false,released=false;
  const connection={beginTransaction:async()=>{},execute:async()=>{if(++inserted===2)throw new Error('Simulated database failure');},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{released=true;}};
  const repo=new MysqlRepository({getConnection:async()=>connection});
  let failed=false;try{await repo.importNotes(1,[{title:'A',content:''},{title:'B',content:''}]);}catch{failed=true;}
  expect(failed).eq(true);expect(rolledBack).eq(true);expect(committed).eq(false);expect(released).eq(true);
 });
});
