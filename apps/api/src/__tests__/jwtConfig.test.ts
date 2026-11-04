import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { generateToken, verifyToken } from "../lib/auth";
import { getJwtSecret } from "../lib/jwtConfig";

describe("shared API JWT configuration", () => {
  const originalSecret = process.env.JWT_SECRET;
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it.each([undefined, "local-regression-secret"])("accepts guest and account tokens with secret %s", async secret => {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    const app = Fastify();
    await app.register(fastifyJwt, { secret: getJwtSecret() });
    await app.ready();
    try {
      const payload = { userId: "regression-user", username: "Player", role: "free" };
      expect(app.jwt.verify(generateToken(payload))).toMatchObject(payload);
      expect(verifyToken(app.jwt.sign(payload))).toMatchObject(payload);
    } finally { await app.close(); }
  });
});
