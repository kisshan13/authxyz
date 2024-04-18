You can add mail triggers for sending mail updates.

## Configuring a mail trigger

```javascript
import { createTransporter } from "nodemailer";
import LocalAuth from "@authxyz/local";
import MongoAdapter from "@authxyz/adapter-mongodb";

const database = mongoose.createConnection("<your-database-url>");

const adapter = new MongoAdapter({
  database: database,
});

const mail = createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "<your-email-address>",
    pass: "<your-email-password>",
  },
});

const localAuth = new LocalAuth({
  roles: ["user"],
  adapter: adapter,
  auth: {
    options: { expiresIn: "7days" },
    type: "JWT",
    secret: "SECRET",
  },
});

localAuth.addTrigger("onLogin", ({ verificationCode, user }) => {
  return {
    config: {
      body: "Verification Code",
      subject: verificationCode,
      to: user.email,
      type: "text",
    },
    type: "onLogin",
  };
});
```

Similarly you can add triggers for events like `onRegister`, `onForgotPassword`, `onPasswordChange`, `onVerificationSuccess` and `onVerificationResent`.
