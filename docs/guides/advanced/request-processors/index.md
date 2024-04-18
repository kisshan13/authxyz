# Request Processor

Request processors are very helpful for custom auth implementations.

It can help you with :

- Body validation
- Pre-processing of requests
- Post-processing of auth process.

## Body Validation

Let's say you want the user to login by passing the email, password and name. By default `Local` auth only takes email and password.

```javascript
import { z } from "zod";

const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  name: z.string(),
});

app.use(
  localAuth.login("/api/login", {
    role: "user",
    body: (body) => userLoginSchema.parse(body),
  })
);
```

`body` is a function which will have the `req.body` as it's parameter and so that we can validate the request body.

## Pre-processing of requests

You can do whatever you want with the request and response before it handed over to the auth handler.

```javascript
app.use(
  localAuth.login("/api/login", {
    role: "user",
    body: (body) => userLoginSchema.parse(body),
    pre: (req, res) => {
      console.log("Got an login request.");
      return true;
    },
  })
);
```

`pre` you can pass a pre parameter to the handler, just make sure it should return a truthy value to continue the auth flow.

## Post-processing of requests

You can use post processing for returning custom responses and doing some extra according to your needs.

```javascript
app.use(
  localAuth.login("/api/login", {
    role: "user",
    body: (body) => userLoginSchema.parse(body),
    post: (context, req, res) => {
      // context represents some data related to auth handler
      res.send(context);
    },
  })
);
```
