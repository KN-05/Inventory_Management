// utils/createWithRetry.js
// Documents that carry a generated, UNIQUE number (invoice, purchase order)
// are numbered by "count + 1, check it is free, then insert". Two requests
// arriving at the same moment both see the same free number, and the second
// insert fails with MongoDB's duplicate-key error (E11000) - on a real
// database a burst of 8 simultaneous sales lost 7 of them that way.
// This helper catches exactly that error for the numbered field, waits a few
// milliseconds (so the competing requests de-synchronise), generates a fresh
// number and tries again. Any other error is passed straight through.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isDuplicateOn = (err, field) =>
  err && err.code === 11000 && (err.keyPattern?.[field] !== undefined || String(err.message).includes(field));

async function createWithGeneratedNumber({ field, generate, create, attempts = 10 }) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const number = await generate();
    try {
      return await create(number);
    } catch (err) {
      if (!isDuplicateOn(err, field)) throw err;
      lastError = err;
      await sleep(5 + Math.floor(Math.random() * 40 * (attempt + 1)));
    }
  }
  throw lastError;
}

module.exports = { createWithGeneratedNumber };
