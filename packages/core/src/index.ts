import { signAuth, signCookieAuth, signJwtAuth } from "./sign.js";
import {
  middlewareProtect,
  middlewareValidateAuthorization,
  useProtect,
} from "./middleware.js";
import { errorFormatter, jwtError } from "./errors.js";

const core = {
  sign: { signAuth, signCookieAuth, signJwtAuth },
  middlewares: {
    middlewareProtect,
    middlewareValidateAuthorization,
    useProtect,
  },
  errors: { jwtError },
};

export default core;
