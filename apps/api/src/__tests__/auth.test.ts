import { hashPassword, verifyPassword, generateToken, verifyToken } from "../lib/auth";

describe("Authentication", () => {
  describe("Password Hashing", () => {
    it("should hash password correctly", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it("should verify correct password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      const valid = await verifyPassword(password, hash);
      
      expect(valid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "testPassword123";
      const hash = await hashPassword(password);
      const valid = await verifyPassword("wrongPassword", hash);
      
      expect(valid).toBe(false);
    });
  });

  describe("JWT Tokens", () => {
    it("should generate valid token", () => {
      const payload = {
        userId: "user123",
        username: "testuser",
        role: "free",
      };
      
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    it("should verify valid token", () => {
      const payload = {
        userId: "user123",
        username: "testuser",
        role: "free",
      };
      
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.username).toBe(payload.username);
    });

    it("should reject invalid token", () => {
      const decoded = verifyToken("invalid.token.here");
      
      expect(decoded).toBeNull();
    });
  });
});
