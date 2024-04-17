You can extend you token signing method by passing the props which you want .

```javascript
const localAuth = new authentic.LocalAuth({
  validationMethod: "JWT",
  secret: "<your-jwt-secret>",
  roles: ["user", "admin"],
  adapter: adapter, 
  options: {
    cookieOptions: {}, // Pass your own options for cookie auth.
    jwtOptions: {}, // Pass your own options for JWT auth.
  },
});
```
