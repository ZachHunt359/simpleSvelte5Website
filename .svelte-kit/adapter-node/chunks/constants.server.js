import { p as private_env } from "./shared-server.js";
const one_day = 60 * 60 * 24;
const AUTH_TOKEN_EXPIRY_SECONDS = Number(
  private_env?.AUTH_TOKEN_EXPIRY_SECONDS ?? one_day * 365
);
export {
  AUTH_TOKEN_EXPIRY_SECONDS as A
};
