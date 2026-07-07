import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { AppConfig } from "./config.js";
import {
  isValidUsername,
  normalizeUsername,
  serializeProfile,
  validateMessageDraft,
  validateProfileDraft,
  type ContactMessage,
  type Profile,
} from "./domain.js";
import type { WhocanStore } from "./store.js";

interface CreateAppOptions {
  readonly config: AppConfig;
  readonly store: WhocanStore;
}

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

function asyncRoute(handler: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

function sendPage(res: Response, config: AppConfig, fileName: string): void {
  res.sendFile(path.join(config.htmlDir, fileName));
}

function setSessionCookie(res: Response, config: AppConfig, sessionId: string): void {
  res.cookie(config.cookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    maxAge: config.sessionTtlSeconds * 1000,
  });
}

async function getSessionUsername(req: Request, config: AppConfig, store: WhocanStore): Promise<string | null> {
  const sessionId = req.cookies?.[config.cookieName];
  if (typeof sessionId !== "string" || !sessionId) return null;

  const username = await store.getSessionUsername(sessionId);
  return username && isValidUsername(username) ? username : null;
}

function notFoundProfile(res: Response): Response {
  return res.status(404).json({ error: "Profile not found." });
}

function statusFromError(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;

  const status = Number((error as { status: unknown }).status);
  return Number.isInteger(status) && status >= 400 && status < 500 ? status : null;
}

export function createApp({ config, store }: CreateAppOptions): express.Express {
  const app = express();
  const createProfile: RequestHandler = asyncRoute(async (req, res) => {
    const draft = validateProfileDraft(req.body);
    if (!draft.ok) return res.status(draft.status).json({ error: draft.error });

    const profile: Profile = {
      ...draft.value,
      createdAt: new Date().toISOString(),
    };

    const created = await store.createProfile(profile);
    if (!created) return res.status(409).json({ error: "Username already exists." });

    const sessionId = await store.createSession(profile.username);
    setSessionCookie(res, config, sessionId);
    return res.status(201).json({ status: "created", profile: serializeProfile(profile) });
  });

  app.disable("x-powered-by");
  app.use(cookieParser());
  app.use(express.static(config.publicDir, { maxAge: config.isProduction ? "1h" : 0 }));
  app.use(express.json({ limit: "20kb" }));
  app.use(express.urlencoded({ extended: true, limit: "20kb" }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/profiles", createProfile);
  app.post("/api/trial", createProfile);

  app.get(
    "/api/me",
    asyncRoute(async (req, res) => {
      const username = await getSessionUsername(req, config, store);
      if (!username) return res.status(401).json({ error: "Not signed in." });

      const profile = await store.getProfile(username);
      if (!profile) return notFoundProfile(res);

      return res.json({ profile: serializeProfile(profile) });
    }),
  );

  app.get(
    "/api/me/messages",
    asyncRoute(async (req, res) => {
      const username = await getSessionUsername(req, config, store);
      if (!username) return res.status(401).json({ error: "Not signed in." });

      const messages = await store.listMessages(username);
      return res.json({ messages });
    }),
  );

  app.get(
    "/api/profiles/:username",
    asyncRoute(async (req, res) => {
      const username = normalizeUsername(req.params.username);
      if (!isValidUsername(username)) return notFoundProfile(res);

      const profile = await store.getProfile(username);
      if (!profile) return notFoundProfile(res);

      return res.json({ profile: serializeProfile(profile) });
    }),
  );

  app.post(
    "/api/profiles/:username/messages",
    asyncRoute(async (req, res) => {
      const username = normalizeUsername(req.params.username);
      if (!isValidUsername(username)) return notFoundProfile(res);

      const profile = await store.getProfile(username);
      if (!profile) return notFoundProfile(res);

      const draft = validateMessageDraft(req.body);
      if (!draft.ok) return res.status(draft.status).json({ error: draft.error });

      const message: ContactMessage = {
        id: randomUUID(),
        ...draft.value,
        createdAt: new Date().toISOString(),
      };

      await store.addMessage(username, message);
      return res.status(201).json({ status: "sent" });
    }),
  );

  app.get(
    "/",
    asyncRoute(async (req, res) => {
      const username = await getSessionUsername(req, config, store);
      if (username) return res.redirect(`/${username}`);

      sendPage(res, config, "home.html");
      return undefined;
    }),
  );

  app.get(
    "/:username",
    asyncRoute(async (req, res) => {
      const requestedUsername = normalizeUsername(req.params.username);
      if (!isValidUsername(requestedUsername)) {
        sendPage(res, config, "home.html");
        return undefined;
      }

      const currentUsername = await getSessionUsername(req, config, store);
      sendPage(res, config, currentUsername === requestedUsername ? "user_dashboard.html" : "chat_with_user.html");
      return undefined;
    }),
  );

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = statusFromError(error);
    if (status) {
      res.status(status).json({ error: status === 413 ? "Request body too large." : "Invalid request." });
      return;
    }

    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  };

  app.use(errorHandler);

  return app;
}
