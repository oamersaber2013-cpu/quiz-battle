jest.mock("@quiz-battle/db", () => ({
  prisma: {
    user: { findMany: jest.fn() },
    leaderboard: { upsert: jest.fn() },
  },
}));

describe("Scheduled leaderboard updates", () => {
  let scheduledUpdate: () => Promise<void>;
  const unref = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    unref.mockReset();
    jest.spyOn(global, "setInterval").mockImplementation(((callback: () => Promise<void>) => {
      scheduledUpdate = callback;
      return { unref };
    }) as any);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("handles a database outage and retries on the next scheduled update", async () => {
    const { prisma } = require("@quiz-battle/db");
    const outage = new Error("PostgreSQL unavailable");
    prisma.user.findMany.mockRejectedValueOnce(outage).mockResolvedValue([]);
    require("../lib/analytics");

    await expect(scheduledUpdate()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith("Leaderboard update error:", outage);
    await expect(scheduledUpdate()).resolves.toBeUndefined();
    expect(prisma.user.findMany).toHaveBeenCalledTimes(4);
  });

  it("does not keep the API process alive solely for the background timer", () => {
    require("../lib/analytics");
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
    expect(unref).toHaveBeenCalledTimes(1);
  });
});
