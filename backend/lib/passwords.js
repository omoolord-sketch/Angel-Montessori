const bcrypt = require("bcrypt");

const HASH_ROUNDS = Number(process.env.PASSWORD_HASH_ROUNDS || 12);

function isPasswordHash(value) {
  const raw = String(value || "");
  return /^\$2[abxy]?\$\d{2}\$/.test(raw);
}

async function hashPassword(password) {
  return bcrypt.hash(String(password || ""), HASH_ROUNDS);
}

function hashPasswordSync(password) {
  return bcrypt.hashSync(String(password || ""), HASH_ROUNDS);
}

async function verifyPassword(plainPassword, storedPassword) {
  const plain = String(plainPassword || "");
  const stored = String(storedPassword || "");

  if (!stored) {
    return { ok: false, needsUpgrade: false };
  }

  if (isPasswordHash(stored)) {
    const ok = await bcrypt.compare(plain, stored);
    return { ok, needsUpgrade: false };
  }

  const ok = plain === stored;
  return { ok, needsUpgrade: ok };
}

module.exports = {
  HASH_ROUNDS,
  isPasswordHash,
  hashPassword,
  hashPasswordSync,
  verifyPassword,
};
