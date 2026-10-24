// config/validateEnv.js
// Checks the .env settings once, at start-up, so a bad config fails loudly
// instead of causing strange errors (or weak security) later.

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const problems = [];
  const warnings = [];

  if (!process.env.MONGO_URI) problems.push('MONGO_URI is missing');
  if (!process.env.JWT_SECRET) problems.push('JWT_SECRET is missing');
  if (!process.env.CLIENT_URL) warnings.push('CLIENT_URL is not set - browsers will be blocked by CORS');

  const secret = process.env.JWT_SECRET || '';
  if (secret && secret.length < 32) {
    (isProduction ? problems : warnings).push(
      `JWT_SECRET is only ${secret.length} characters - use at least 32 random characters. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  if (secret && /^(secret|changeme|password|jwt|your)/i.test(secret)) {
    (isProduction ? problems : warnings).push('JWT_SECRET looks like a placeholder value');
  }

  warnings.forEach((w) => console.warn(`[config] WARNING: ${w}`));

  if (problems.length > 0) {
    problems.forEach((p) => console.error(`[config] ERROR: ${p}`));
    console.error('[config] Fix the problems above in server/.env and restart.');
    process.exit(1);
  }
}

module.exports = validateEnv;
