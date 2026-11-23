import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import pino from "pino";
import pinoHttp from "pino-http";

const signup = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z
    .string()
    .min(10)
    .max(72)
    .refine(
      (s) => Buffer.byteLength(s, "utf8") <= 72,
      "Password must not exceed 72 UTF-8 bytes.",
    ),
});
const login = signup.omit({ name: true }).extend({
  password: z
    .string()
    .min(1)
    .max(72)
    .refine(
      (s) => Buffer.byteLength(s, "utf8") <= 72,
      "Password must not exceed 72 UTF-8 bytes.",
    ),
});
const note = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().max(100000),
});
function cleanContent(content) {
return sanitizeHtml(content, {
      allowedTags: [
        "p",
        "br",
        "strong",
        "em",
        "s",
        "ul",
        "ol",
        "li",
        "blockquote",
        "h2",
        "h3",
        "code",
        "pre",
        "hr",
      ],
      allowedAttributes: {},
    });
}
const digest = (token) => createHash("sha256").update(token).digest("hex");
const idParam = z.coerce.number().int().positive().safe();
export function createApp({
  repository,
  logger = pino(),
  origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173",
  production = process.env.NODE_ENV === "production",
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      redact: [
        "req.headers.cookie",
        "req.headers.authorization",
        "res.headers.set-cookie",
        'req.headers["x-api-key"]',
      ],
      autoLogging: true,
    }),
  );
  app.use(express.json({ limit: "150kb" }));
  app.use(cookieParser());
  app.use("/api", (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== origin
    )
      return res.status(403).json({ error: "Request origin is not allowed." });
    next();
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Please try again later." },
  });
  const safeUser = ({ id, name, email }) => ({ id, name, email });
  async function newSession(res, user) {
    const token = randomBytes(32).toString("hex");
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    await repository.createSession(
      digest(token),
      user.id,
      new Date(Date.now() + maxAge),
    );
    res.cookie("session", token, {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      maxAge,
      path: "/api",
    });
  }
  async function requireUser(req, res, next) {
    const token = req.cookies.session;
    const user = token && (await repository.sessionUser(digest(token)));
    if (!user)
      return res.status(401).json({ error: "Please sign in to continue." });
    req.user = user;
    next();
  }
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/auth/signup", authLimit, async (req, res) => {
    const data = signup.parse(req.body);
    if (await repository.findUser(data.email))
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    const password_hash = await bcrypt.hash(data.password, 12);
    let user;
    try {
      user = await repository.createUser({ ...data, password_hash });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY")
        return res
          .status(409)
          .json({ error: "An account with this email already exists." });
      throw e;
    }
    await newSession(res, user);
    logger.info({ userId: user.id, event: "signup" }, "User registered");
    res.status(201).json({ user: safeUser(user) });
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const data = login.parse(req.body);
    const user = await repository.findUser(data.email);
    const valid = await bcrypt.compare(
      data.password,
      user?.password_hash ||
        "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
    );
    if (!user || !valid)
      return res.status(401).json({ error: "Email or password is incorrect." });
    if (req.cookies.session)
      await repository.deleteSession(digest(req.cookies.session));
    await newSession(res, user);
    logger.info({ userId: user.id, event: "login" }, "User signed in");
    res.json({ user: safeUser(user) });
  });
  app.post("/api/auth/logout", async (req, res) => {
    if (req.cookies.session)
      await repository.deleteSession(digest(req.cookies.session));
    res.clearCookie("session", {
      path: "/api",
      httpOnly: true,
      sameSite: "lax",
      secure: production,
    });
    res.status(204).end();
  });
  app.get("/api/auth/me", requireUser, (req, res) =>
    res.json({ user: safeUser(req.user) }),
  );
  app.get("/api/notes", requireUser, async (req, res) =>
    res.json({ notes: await repository.listNotes(req.user.id) }),
  );
  async function save(req, res) {
    const data = note.parse(req.body);
    data.content = cleanContent(data.content);
    const id = req.params.id ? idParam.parse(req.params.id) : null;
    const saved = await repository.saveNote(req.user.id, id, data);
    if (!saved) return res.status(404).json({ error: "Note not found." });
    logger.info(
      {
        userId: req.user.id,
        noteId: saved.id,
        event: id ? "note_updated" : "note_created",
      },
      "Note saved",
    );
    res.status(id ? 200 : 201).json({ note: saved });
  }
  app.get('/api/trash', requireUser, async (req,res) => res.json({notes:await repository.listTrash(req.user.id)}));
  app.post('/api/notes/:id/restore', requireUser, async (req,res) => {
    if (!(await repository.restoreNote(req.user.id,idParam.parse(req.params.id)))) return res.status(404).json({error:'Note not found.'});
    logger.info({userId:req.user.id,event:'note_restored'},'Note restored');
    res.status(204).end();
  });
  app.post('/api/notes/import', requireUser, async (req,res) => {
    const data=z.object({format:z.literal('folio-notes-v1'),notes:z.array(note).min(1).max(100)}).parse(req.body);
    const notes=data.notes.map(n=>({...n,content:cleanContent(n.content)}));
    await repository.importNotes(req.user.id,notes);
    logger.info({userId:req.user.id,event:'notes_imported',count:notes.length},'Notes imported');
    res.status(201).json({count:notes.length});
  });
  app.post("/api/notes", requireUser, save);
  app.put("/api/notes/:id", requireUser, save);
  app.delete("/api/notes/:id", requireUser, async (req, res) => {
    const id = idParam.parse(req.params.id);
    if (!(await repository.deleteNote(req.user.id, id)))
      return res.status(404).json({ error: "Note not found." });
    logger.info(
      { userId: req.user.id, noteId: id, event: "note_trashed" },
      "Note moved to trash",
    );
    res.status(204).end();
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  app.use((err, req, res, _next) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        error: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON." });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request is too large." });
    // Driver errors can contain SQL values, including note bodies and hashes.
    req.log.error(
      { errorType: err.name, errorCode: err.code || "INTERNAL_ERROR" },
      "Request failed",
    );
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });
  return app;
}
