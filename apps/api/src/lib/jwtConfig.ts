// Read at call time so tokens use the API's .env after bootstrap loads it.
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev-secret-change-in-production";
}
