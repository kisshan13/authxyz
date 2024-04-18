# Custom Schema

You can extend the base schema of your adapter by using your own schema.

### Example

```javascript
const userSchema = new Schema({
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

  orders: {
    type: [mongoose.Types.ObjectId],
    ref: "Orders",
  },
});

const User = database.model("Orders");

localAuth.addUserSchema(User);
```

Just make sure it should extend the base schema to avoid any unexpected behaviour.
