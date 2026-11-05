import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

export class SocialLoginError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}

export async function verifyGoogleIdentity(idToken: string) {
  const audience = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!audience || audience === "your-google-client-id") {
    throw new SocialLoginError(503, "Google sign-in is not configured");
  }
  try {
    // The official library verifies the Google signature, audience, issuer and expiry.
    const ticket = await client.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new Error("Missing verified identity");
    }
    return { googleId: payload.sub, email: payload.email.toLowerCase(), name: payload.name || "GooglePlayer" };
  } catch {
    throw new SocialLoginError(401, "Invalid Google credential");
  }
}
