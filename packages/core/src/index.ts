import { signAuth, signCookieAuth, signJwtAuth } from "./sign.js";
import {
  middlewareProtect,
  middlewareValidateAuthorization,
  useProtect,
} from "./middleware.js";
import { errorFormatter, jwtError } from "./errors.js";

export default {
  signAuth,
  signCookieAuth,
  signJwtAuth,
  middlewareProtect,
  middlewareValidateAuthorization,
  useProtect,
  errorFormatter,
  jwtError,
};
