import type { CookieOptions, Response } from "express";
import type { SignOptions } from "jsonwebtoken";

import { sign } from "jsonwebtoken";
import moment from "moment";

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

const cookieName = "_auth_kqda";

function signAuth({ method = "JWT", res, data, secret, options }: AuthSign) {
  if (method === "JWT") {
    const token = sign(data, secret, options.jwtOptions);
    return token;
  } else {
    res.cookie(cookieName, data, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      signed: true,
      expires: moment().add(7, "days").toDate(),
      ...(options?.cookieOptions && {
        ...options.cookieOptions,
      }),
    });
  }
}

export default signAuth;
