import type { CookieOptions, Response, Request } from "express";
import type { JwtPayload, SignOptions } from "jsonwebtoken";

import jwt from "jsonwebtoken";
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

interface ValidateMethodOptions {
  method: "JWT" | "COOKIE";
  req: Request;
  secret: string;
}

const cookieName = "_auth_kqda";

function signAuth({ method = "JWT", res, data, secret, options }: AuthSign) {
  if (method === "JWT") {
    const token = jwt.sign(data, secret, options.jwtOptions);
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

function validateByMethod({
  method = "JWT",
  req,
  secret,
}: ValidateMethodOptions) {
  if (method === "JWT") {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return { message: "Invalid Auth token" };
    }

    const isValid = jwt.verify(token, secret);

    if (typeof isValid === "object") {
      return {
        id: isValid?.id,
      };
    }
  } else {
    const token = req.signedCookies[cookieName];

    if (!token) {
      return { message: "Invalid requests" };
    }

    return {
      id: token?.id,
    };
  }
}

export { signAuth, validateByMethod };
