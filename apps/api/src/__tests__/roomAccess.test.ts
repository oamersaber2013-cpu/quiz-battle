import { authorizeRoomAccess, hasRoomAccess, protectRoom, removeRoomAccess, revokeRoomAccess, validRoomPassword } from "../lib/roomAccess";

describe("private room authorization", () => {
  const room = { gameId: "access-test", hostId: "host", isPrivate: true, players: { host: {} } };
  beforeEach(async () => { await protectRoom(room.gameId, "  Exact password  "); });
  afterEach(() => { removeRoomAccess(room.gameId); jest.restoreAllMocks(); });

  it("preserves exact spaces and never approves a missing or wrong password", async () => {
    expect(await authorizeRoomAccess(room, "new-user")).toMatchObject({ success: false, code: "PASSWORD_REQUIRED" });
    expect(await authorizeRoomAccess(room, "new-user", "Exact password")).toMatchObject({ success: false, code: "INVALID_PASSWORD" });
    expect(await authorizeRoomAccess(room, "new-user", "  Exact password  ")).toEqual({ success: true });
    expect(await authorizeRoomAccess(room, "new-user")).toEqual({ success: true });
  });

  it("allows the real host and existing participant to reconnect without repeating the password", async () => {
    expect(await authorizeRoomAccess(room, "host")).toEqual({ success: true });
    expect(await authorizeRoomAccess({ ...room, players: { host: {}, participant: {} } }, "participant")).toEqual({ success: true });
  });

  it("revokes a spectator grant after an explicit leave", async () => {
    await authorizeRoomAccess(room, "spectator", "  Exact password  ");
    expect(hasRoomAccess(room, "spectator")).toBe(true);
    revokeRoomAccess(room.gameId, "spectator");
    expect(hasRoomAccess(room, "spectator")).toBe(false);
    expect((await authorizeRoomAccess(room, "spectator")).code).toBe("PASSWORD_REQUIRED");
  });

  it("limits failed attempts per signed identity and recovers after the window", async () => {
    for (let i = 0; i < 5; i++) expect((await authorizeRoomAccess(room, "guessing-user", "wrong")).code).toBe("INVALID_PASSWORD");
    expect((await authorizeRoomAccess(room, "guessing-user", "  Exact password  ")).code).toBe("RATE_LIMITED");
    expect((await authorizeRoomAccess(room, "another-user", "  Exact password  ")).success).toBe(true);
    const later = Date.now() + 61000;
    jest.spyOn(Date, "now").mockReturnValue(later);
    expect((await authorizeRoomAccess(room, "guessing-user", "  Exact password  ")).success).toBe(true);
  });

  it("checks UTF-8 bytes so bcrypt cannot silently truncate a password", () => {
    expect(validRoomPassword("a".repeat(72))).toBe(true);
    expect(validRoomPassword("a".repeat(73))).toBe(false);
    expect(validRoomPassword("أ".repeat(37))).toBe(false);
    expect(validRoomPassword("😀".repeat(18))).toBe(true);
    expect(validRoomPassword(123)).toBe(false);
  });

  it("fails closed for an unconfigured private room and clears expired grants", async () => {
    await authorizeRoomAccess(room, "spectator", "  Exact password  ");
    removeRoomAccess(room.gameId);
    expect(hasRoomAccess(room, "spectator")).toBe(false);
    expect((await authorizeRoomAccess(room, "spectator", "  Exact password  ")).success).toBe(false);
    expect((await authorizeRoomAccess({ ...room, isPrivate: false }, "any-user")).success).toBe(true);
  });
});
