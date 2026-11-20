import { createOriginPolicy } from "../lib/originPolicy";

describe("hosted and local frontend origins", () => {
  it("allows the configured production frontend", () => {
    const allowed = createOriginPolicy({ NODE_ENV: "production", FRONTEND_URL: "https://battle.example.test/" });
    expect(allowed("https://battle.example.test")).toBe(true);
  });
  it("does not treat a hostname containing ngrok as trusted", () => {
    const allowed = createOriginPolicy({ NODE_ENV: "production", FRONTEND_URL: "https://battle.example.test" });
    expect(allowed("https://app.ngrok-free.app.attacker.test")).toBe(false);
    expect(allowed("https://battle.example.test.attacker.test")).toBe(false);
  });
  it("requires explicit origins in production but permits local development ports", () => {
    expect(createOriginPolicy({ NODE_ENV: "production" })("http://127.0.0.1:3100")).toBe(false);
    expect(createOriginPolicy({ NODE_ENV: "development" })("http://127.0.0.1:3100")).toBe(true);
    expect(createOriginPolicy({ NODE_ENV: "development" })("http://localhost:3100")).toBe(true);
  });
  it("allows explicit additional frontends and a configured tunnel", () => {
    const allowed = createOriginPolicy({ NODE_ENV: "production", FRONTEND_URL: "https://battle.example.test", ALLOWED_ORIGINS: "https://preview.example.test,https://demo.ngrok-free.app" });
    expect(allowed("https://preview.example.test")).toBe(true);
    expect(allowed("https://demo.ngrok-free.app")).toBe(true);
    expect(allowed("https://another.ngrok-free.app")).toBe(false);
  });
  it("rejects malformed origins and continues to support non-browser API clients", () => {
    const allowed = createOriginPolicy({ NODE_ENV: "production", FRONTEND_URL: "https://battle.example.test" });
    expect(allowed("https://battle.example.test@attacker.test")).toBe(false);
    expect(allowed("null")).toBe(false);
    expect(allowed()).toBe(true);
  });
});
