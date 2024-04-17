In this tutorial we'll see how we can implment a simple auth which will use email / password with JWT Token based authentication.

## Installation

!!!warning
For now we only have database adapter for MongoDB.
!!!

```bash
npm i @authxyz/provider-local @authxyz/adapter-mongodb
```

## Setup

- Make a database adapter

:::code source="/static/snippets/mongodb.js" range="12-18" :::
Database adapter used to create entries into the database encapsulating the logic for handling database operations for authentication. However you can extend the functionality and make it according to your needs.

This will creates a table / collection as per your adapter which have schema something like this :
+++ MongoDB
:::code source="/static/snippets/schema/mongoose.js" :::
+++
You can extend these schemas by creating your own schema which must have all the fields in the base schema for your adapter.

- Create a local auth instance

A local auth instance will have all the required middlewares and methods for authentication plus a global middleware which will be really helpful for RBAC authentication.

:::code source="/static/snippets/local-auth.js" :::

- Creating a register route handler

```javascript
const zodSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.use(
  authLocal.register({
    path: "/register",
    role: "admin",
    body: (body) => zodSchema.parse(body),
  })
);
```

Now this will create a user with role of admin.
