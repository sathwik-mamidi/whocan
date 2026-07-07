import assert from "node:assert/strict";
import test from "node:test";
import {
  MESSAGE_TEXT_LIMIT,
  PROFILE_TEXT_LIMIT,
  parseStoredMessage,
  validateMessageDraft,
  validateProfileDraft,
} from "../src/domain.ts";

test("validates and normalizes profile drafts", () => {
  const result = validateProfileDraft({
    username: "  Sathwik_Mamidi  ",
    bio: "Builder",
    rules: "Founders and engineering teams",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, {
    username: "sathwik_mamidi",
    bio: "Builder",
    rules: "Founders and engineering teams",
  });
});

test("rejects invalid profile drafts", () => {
  const invalidUsername = validateProfileDraft({
    username: "no",
    bio: "Builder",
    rules: "Founders",
  });

  assert.equal(invalidUsername.ok, false);
  if (invalidUsername.ok) return;
  assert.equal(invalidUsername.status, 400);

  const missingRules = validateProfileDraft({
    username: "sathwik",
    bio: "Builder",
    rules: "",
  });

  assert.equal(missingRules.ok, false);
});

test("sanitizes and limits user-authored profile text", () => {
  const result = validateProfileDraft({
    username: "sathwik",
    bio: `<script>alert("x")</script>${"a".repeat(PROFILE_TEXT_LIMIT + 20)}`,
    rules: "Relevant operators only",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.bio.includes("<script>"), false);
  assert.equal(result.value.bio.length, PROFILE_TEXT_LIMIT);
});

test("validates contact message drafts", () => {
  const result = validateMessageDraft({
    from: "",
    message: "I would like to discuss an infra role.",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.from, "Anonymous");
  assert.equal(result.value.message, "I would like to discuss an infra role.");
});

test("rejects empty messages and limits long messages", () => {
  const empty = validateMessageDraft({ message: "" });
  assert.equal(empty.ok, false);

  const long = validateMessageDraft({
    message: "a".repeat(MESSAGE_TEXT_LIMIT + 20),
  });

  assert.equal(long.ok, true);
  if (!long.ok) return;
  assert.equal(long.value.message.length, MESSAGE_TEXT_LIMIT);
});

test("parses stored messages defensively", () => {
  assert.equal(parseStoredMessage("not json"), null);
  assert.equal(parseStoredMessage(JSON.stringify({ id: "1" })), null);

  const stored = {
    id: "1",
    from: "Alex",
    message: "Hello",
    createdAt: "2026-07-09T00:00:00.000Z",
  };

  assert.deepEqual(parseStoredMessage(JSON.stringify(stored)), stored);
});
