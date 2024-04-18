![](/static/media/authxyz.png)

# Authxyz

Simple yet powerful library for authentication which supports RBAC (Role-based access control) by default.

### It's upto you...

+++ Express with MongoDB
- Install Dependencies
```bash
npm install @authxyz/adapter-mongodb @authxyz/local
npm install express zod dotenv mongoose
```
- Initialize your application
:::code source="/static/snippets/mongodb.js" range="" :::

It's enough to add login and register api into your application, it will take care of authentication and authorization both.

[!ref](/guides/guides.md)