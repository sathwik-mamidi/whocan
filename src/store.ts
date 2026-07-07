import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import { MESSAGE_LIST_LIMIT, parseStoredMessage, type ContactMessage, type Profile } from "./domain.js";

type RedisClient = ReturnType<typeof createClient>;

export interface WhocanStore {
  connect(): Promise<void>;
  close(): Promise<void>;
  createProfile(profile: Profile): Promise<boolean>;
  getProfile(username: string): Promise<Profile | null>;
  createSession(username: string): Promise<string>;
  getSessionUsername(sessionId: string): Promise<string | null>;
  addMessage(username: string, message: ContactMessage): Promise<void>;
  listMessages(username: string): Promise<ContactMessage[]>;
}

export function profileKey(username: string): string {
  return `profile:${username}`;
}

export function messagesKey(username: string): string {
  return `messages:${username}`;
}

export function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

function toProfile(fields: Record<string, string>): Profile | null {
  const { username, bio, rules, createdAt } = fields;
  if (!username || !bio || !rules || !createdAt) return null;

  return {
    username,
    bio,
    rules,
    createdAt,
  };
}

export class RedisWhocanStore implements WhocanStore {
  constructor(
    private readonly redis: RedisClient,
    private readonly sessionTtlSeconds: number,
  ) {}

  static create(redisUrl: string, sessionTtlSeconds: number): RedisWhocanStore {
    return new RedisWhocanStore(createClient({ url: redisUrl }), sessionTtlSeconds);
  }

  onError(listener: (error: Error) => void): void {
    this.redis.on("error", listener);
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async close(): Promise<void> {
    if (this.redis.isOpen) {
      await this.redis.quit();
    }
  }

  async createProfile(profile: Profile): Promise<boolean> {
    const key = profileKey(profile.username);
    const created = await this.redis.hSetNX(key, "username", profile.username);

    if (!created) return false;

    await this.redis.hSet(key, {
      bio: profile.bio,
      rules: profile.rules,
      createdAt: profile.createdAt,
    });

    return true;
  }

  async getProfile(username: string): Promise<Profile | null> {
    return toProfile(await this.redis.hGetAll(profileKey(username)));
  }

  async createSession(username: string): Promise<string> {
    const sessionId = randomUUID();
    await this.redis.set(sessionKey(sessionId), username, { EX: this.sessionTtlSeconds });
    return sessionId;
  }

  async getSessionUsername(sessionId: string): Promise<string | null> {
    return this.redis.get(sessionKey(sessionId));
  }

  async addMessage(username: string, message: ContactMessage): Promise<void> {
    const key = messagesKey(username);
    await this.redis.lPush(key, JSON.stringify(message));
    await this.redis.lTrim(key, 0, MESSAGE_LIST_LIMIT - 1);
  }

  async listMessages(username: string): Promise<ContactMessage[]> {
    const messages = await this.redis.lRange(messagesKey(username), 0, MESSAGE_LIST_LIMIT - 1);
    return messages.flatMap((message) => {
      const parsed = parseStoredMessage(message);
      return parsed ? [parsed] : [];
    });
  }
}
