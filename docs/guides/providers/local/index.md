# @authxyz/local

Authxyz's local auth provider comes with a wide range of functionality like login , register, reset password , verification and so on...

## Project Setup

Create a new project with an awsome name and install the following dependencies.

```bash
npm i @authxyz/local @authxyz/adapter-mongo express dotenv zod mongoose
```

<!-- !!!
`@authxyz/adapter-mongo` it's a database adapter for the authxyz auth providers. [!ref For more information Click Here](/)
!!! -->

### Code setup

Add this code to your file to make your project up and running.

:::code source="/static/snippets/local/code-setup.js" :::

### Creating a database adapter

A database adapter is something that will handle the read & writes for our package for authentication.

:::code source="/static/snippets/local/full.js" range="14-20" :::

`adataper.addUserSchema()` will create a `User` model in your database which have a schema like this.

```js
const schema = new Schema({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profileImage: String,
  role: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  provider: String,
  auth: {
    access_token: String,
    expires_in: Number,
    scope: String,
    token_type: String,
    refresh_token: String,
  },
});
```

### Initializing the Local auth provider

:::code source="/static/snippets/local/full.js" range="22-30" :::

- `roles` : Roles is an array of strings which you going to have in your app. For example `user` , `admin` etc.
- `adapter` : Database adapter for read & write.
- `auth` : An auth object which contains configuration for auth.

### Creating a user register route

To create a user register route we have to use the `register` function provided by the `Local` class.

:::code source="/static/snippets/local/full.js" range="33" :::

This will create a user and returns the auth token depending upon your auth strategy.

| Method | Payload                                                  |
| ------ | -------------------------------------------------------- |
| POST   | ` {"email": "user@example.com", "password": "password"}` |

You can customise the functions upto how much you want, simply it's upto you. <a href="/">See this to extend your functionality.</a>

On a successful registration you will get a response from the server :

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2MWZmOWRhZmM3MGVjMjhmYzRhNGQ4NiIsImlhdCI6MTcxMzM3MTYxMCwiZXhwIjoxNzEzOTc2NDEwfQ.eV7q3mi7ZmFKF-IoDVlbvy025sm23aQljhsZTAVcqio"
}
```

### Creating a user login route

To create a user register route we have to use the `register` function provided by the `Local` class.

:::code source="/static/snippets/local/full.js" range="32" :::

| Method | Payload                                                  |
| ------ | -------------------------------------------------------- |
| POST   | ` {"email": "user@example.com", "password": "password"}` |

<a href="/">See this to extend your functionality.</a>

On a successful login you will get a response from the server :

### RBAC Middleware for route protection.

You can use the built-in RBAC middleware of local auth to protect the routes.

```javascript
app.get("/", localAuth.protect(["user"]), (req, res) =>
  res.send("protected route")
);
```

`localAuth.protect(["user"])` this function alone will take care of the upcoming request and let the user access the endpoint if it has a role of user.
You can pass down multiple roles as an array also.

### More methods

Similarly you can use other functions such as `forgotPassword` , `resetPassword`, `verify`, `resendVerification`.

- #### Forgot Password

  You can use `forgotPassword` method to add password reset functionality into your application. This requires a <a href="#">mail trigger</a>.

  ```javascript
  app.use(localAuth.forgotPassword("/forgot-password", { role: "user" }));
  ```

  | Method | Payload                          |
  | ------ | -------------------------------- |
  | POST   | ` {"email": "user@example.com"}` |

  On a successful request you will get a response from the server :

        ```json
        { "message": "Password reset code sent." }
        ```

  But this alone can't do all the things. You have to actually send the password reset code to the user.

  - Create a mail client with Nodemailer and add it to your `localAuth` using `mailConfig` method.

  ```javascript
  const mail = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "<your-mail-client>",
      pass: "<your-mail-password>",
    },
  });

  localAuth.mailConfig(mail);
  ```

  - Now add a trigger so that whenever a api request to the forgot password route is successful then send a mail to the user.

  ```javascript
  localAuth.addTrigger("onForgotPassword", ({ verificationCode, user }) => {
    const email = user["email"];

    return {
      config: {
        body: verificationCode,
        subject: "Password Reset Code",
        to: email,
        type: "text",
      },
      type: "onForgotPassword",
    };
  });
  ```

  Now this will add a trigger so that we can send a mail to the user with the reset code .

  <a href="#">See more about mail trigger.</a>

- #### Reset Password

  You can use `resetPassword` method to add password reset functionality into your application.

  ```javascript
  app.use(localAuth.resetPassword("/reset-password", { role: "user" }));
  ```

  | Method | Payload                                                                        |
  | ------ | ------------------------------------------------------------------------------ |
  | POST   | ` {"email": "user@example.com", "password" : "new-password", "code" : 983276}` |

  On a successful request you will get a response from the server :

  ```json
  { "message": "Password Changed." }
  ```

<a>See a full example app build with the local auth provider</a>
