import { resolveApiOrigin } from "@/lib/apiOrigin";

const publicPage = { origin: "https://quiz.example", hostname: "quiz.example", protocol: "https:" };
const localPage = { origin: "http://127.0.0.1:3100", hostname: "127.0.0.1", protocol: "http:" };

it("keeps a public frontend on its own origin when API configuration is missing", () => {
  expect(resolveApiOrigin(undefined, publicPage)).toBe(publicPage.origin);
});
it.each([
  "http://127.0.0.1:4000", "https://localhost:4000", "https://api.localhost", "https://192.168.1.4",
  "https://10.1.2.3", "https://172.16.2.1", "https://169.254.1.2", "https://[::1]", "https://[fd00::1]",
  "https://[::ffff:127.0.0.1]", "https://quiz.local", "http://api.example", "invalid origin",
])("never directs a public frontend to unsafe API origin %s", configured => {
  expect(resolveApiOrigin(configured, publicPage)).toBe(publicPage.origin);
});
it("uses an HTTPS public API origin", () => {
  expect(resolveApiOrigin("https://api.example", publicPage)).toBe("https://api.example");
  expect(resolveApiOrigin("https://fcdn.example", publicPage)).toBe("https://fcdn.example");
});
it("keeps normal loopback development connections", () => {
  expect(resolveApiOrigin(undefined, localPage)).toBe("http://127.0.0.1:4000");
  expect(resolveApiOrigin("http://localhost:3125", localPage)).toBe("http://localhost:3125");
});
it("does not assume SSR or a private-network frontend is loopback", () => {
  expect(resolveApiOrigin(undefined)).toBe("");
  expect(resolveApiOrigin(undefined, { ...localPage, hostname: "192.168.1.5", origin: "http://192.168.1.5:3100" })).toBe("http://192.168.1.5:3100");
});
