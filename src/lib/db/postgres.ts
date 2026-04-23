// PostgreSQL support has been removed
// This file is kept for backwards compatibility but does nothing

export async function getPgClient() {
  throw new Error('PostgreSQL support has been removed. Please use SQLite instead.');
}

export async function closePgClient() {
  // No-op for backwards compatibility
}