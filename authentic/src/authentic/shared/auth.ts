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

export { signCookieAuth, signJwtAuth };
