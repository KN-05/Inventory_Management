// utils/googleVerifier.js
// Verifies a Google ID token ("credential") with Google's official library:
// signature, expiry, issuer and - importantly - that it was issued for THIS
// app (audience = GOOGLE_CLIENT_ID). Returns the few fields we use.
//
// Exposed as an object so automated tests can substitute the call to Google
// (the tests cannot reach Google); the production path always goes through
// google-auth-library.

const { OAuth2Client } = require('google-auth-library');

let client;
const getClient = () => {
  if (!client) client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return client;
};

const googleVerifier = {
  async verify(credential) {
    const ticket = await getClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return {
      sub: payload.sub, // Google's permanent, unique id for this account
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name || '',
    };
  },
};

module.exports = googleVerifier;
