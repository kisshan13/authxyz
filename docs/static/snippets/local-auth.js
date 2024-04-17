const localAuth = new authentic.LocalAuth({
    validationMethod: "JWT", // Token validation method can be JWT or COOKIE
    secret: "<your-jwt-secret>",
    roles: ["user", "admin"], // Roles which can later used to perform authentication based on roles.
    adapter: adapter, // Your database adapter.
})