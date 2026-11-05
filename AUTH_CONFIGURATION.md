# Authentication and frontend configuration

Set server environment values for the API, or in its ignored `.env` file.
Production needs a unique `JWT_SECRET` of at least 32 characters; the development
fallback and example placeholder are rejected. Keep this value server-side.

`FRONTEND_URL` is the exact frontend URL. `ALLOWED_ORIGINS` adds comma-separated
frontend or tunnel URLs. Both HTTP CORS and Socket.IO handshakes use the same
origin policy. Development allows HTTP(S) loopback hosts on local ports;
production requires configured origins. There are no wildcard tunnel origins.

## Google backend

Configure `GOOGLE_CLIENT_ID` for the intended web client. POST
`{"idToken":"<Google ID token>"}` to `/api/auth/google`. The API uses
`google-auth-library` to check the signature, audience, issuer and expiry, then
requires a subject and verified email. This follows Google's
[server-side verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
Only provider-verified profile data reaches account lookup/creation. Existing
accounts are not linked solely because an email matches.

Missing configuration returns 503; invalid credentials return 401; an existing
email belonging to a different login returns 409. Old `{googleId,email,name}`
requests return 400. The current frontend uses email/password and guest entry;
this backend work does not claim a completed Google frontend sign-in flow.
Provider verification is exercised with deterministic verifier fixtures; no live
Google account/token was used in local tests.

## Facebook backend

`/api/auth/facebook` does not issue application tokens. Old profile-ID requests
return 400 and access-token requests return 503 until actual provider-token
verification is implemented. Account IDs/names supplied by callers are not
authentication credentials.

## Other boundaries

Registration and login validate body shapes and password lengths before database
queries. Guest/email flows are covered by the isolated database smoke. Payment
provider callbacks, paid-credit enforcement and account-linking UI are separate
work; social-login changes do not enable payments.
