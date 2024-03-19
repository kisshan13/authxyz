import type { CookieOptions, Response } from "express";
import type { SignOptions } from "jsonwebtoken";

import jwt from "jsonwebtoken";
import moment from "moment";

export const cookieName = "_auth_kqda";

interface AuthJWTSign {
  data: any;
  options?: SignOptions;
  secret: string;
}

interface AuthCookieSign {
  data: any;
  options?: CookieOptions;
}

interface AuthSign {
  method: "JWT" | "COOKIE";
  secret?: string;
  data: any;
  res: Response;
  options: {
    cookieOptions?: CookieOptions;
    jwtOptions?: SignOptions;
  };
}

function signJwtAuth({ data, options, secret }: AuthJWTSign) {
  return jwt.sign(data, secret, options);
}

function signCookieAuth(res: Response, { data, options }: AuthCookieSign) {
  res.cookie(cookieName, data, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    signed: true,
    expires: moment().add(7, "days").toDate(),
    ...(options && {
      ...options,
    }),
  });
}

function signAuth({ method = "JWT", res, data, secret, options }: AuthSign) {
  if (method === "JWT") {
    return signJwtAuth({ data, options: options.jwtOptions, secret });
  } else {
    return signCookieAuth(res, { data, options: options.cookieOptions });
  }
}

export { signCookieAuth, signJwtAuth, signAuth };
