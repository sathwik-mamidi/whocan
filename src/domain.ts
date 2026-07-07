import xss from "xss";

export const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;
export const PROFILE_TEXT_LIMIT = 600;
export const MESSAGE_FROM_LIMIT = 80;
export const MESSAGE_TEXT_LIMIT = 1000;
export const MESSAGE_LIST_LIMIT = 50;

export interface Profile {
  readonly username: string;
  readonly bio: string;
  readonly rules: string;
  readonly createdAt: string;
}

export interface PublicProfile extends Profile {
  readonly url: string;
}

export interface ContactMessage {
  readonly id: string;
  readonly from: string;
  readonly message: string;
  readonly createdAt: string;
}

export interface ProfileDraft {
  readonly username: string;
  readonly bio: string;
  readonly rules: string;
}

export interface MessageDraft {
  readonly from: string;
  readonly message: string;
}

type ValidationResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly status: number; readonly error: string };

interface ProfileRequestBody {
  readonly username?: unknown;
  readonly bio?: unknown;
  readonly rules?: unknown;
  readonly who_are_you?: unknown;
  readonly who_can_contact_you?: unknown;
}

interface MessageRequestBody {
  readonly from?: unknown;
  readonly message?: unknown;
}

export function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function cleanText(value: unknown, maxLength: number): string {
  return xss(String(value ?? "").trim()).slice(0, maxLength);
}

export function serializeProfile(profile: Profile): PublicProfile {
  return {
    ...profile,
    url: `/${profile.username}`,
  };
}

export function validateProfileDraft(body: ProfileRequestBody): ValidationResult<ProfileDraft> {
  const username = normalizeUsername(body.username);
  const bio = cleanText(body.bio ?? body.who_are_you, PROFILE_TEXT_LIMIT);
  const rules = cleanText(body.rules ?? body.who_can_contact_you, PROFILE_TEXT_LIMIT);

  if (!isValidUsername(username)) {
    return {
      ok: false,
      status: 400,
      error: "Usernames must be 3-32 characters: lowercase letters, numbers, hyphens, or underscores.",
    };
  }

  if (!bio || !rules) {
    return {
      ok: false,
      status: 400,
      error: "Bio and contact rules are required.",
    };
  }

  return { ok: true, value: { username, bio, rules } };
}

export function validateMessageDraft(body: MessageRequestBody): ValidationResult<MessageDraft> {
  const from = cleanText(body.from, MESSAGE_FROM_LIMIT) || "Anonymous";
  const message = cleanText(body.message, MESSAGE_TEXT_LIMIT);

  if (!message) {
    return {
      ok: false,
      status: 400,
      error: "Message is required.",
    };
  }

  return { ok: true, value: { from, message } };
}

export function parseStoredMessage(raw: string): ContactMessage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ContactMessage>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.from !== "string" ||
      typeof parsed.message !== "string" ||
      typeof parsed.createdAt !== "string"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      from: parsed.from,
      message: parsed.message,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}
