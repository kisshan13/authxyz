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
})