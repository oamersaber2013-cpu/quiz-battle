// Read at call time so tokens use the API's .env after bootstrap loads it.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" &&
      (!secret || secret.length < 32 || secret.includes("change-in-production"))) {
    throw new Error("Set a unique JWT_SECRET of at least 32 characters in production");
  }
  return secret || "dev-secret-change-in-production";
}
