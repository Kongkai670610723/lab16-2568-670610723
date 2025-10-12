// src/config/jwt.ts
export const JWT_SECRET =
  process.env.JWT_SECRET ??
  (() => { throw new Error("JWT_SECRET is not set"); })();
