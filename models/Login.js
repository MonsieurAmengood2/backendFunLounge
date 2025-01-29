const mongoose = require("mongoose");

const LoginSchema = new mongoose.Schema({
    username: { type: String, required: true },
    loginTime: { type: Date, default: Date.now }
});

// Criamos a coleção "logins" dentro do MongoDB
module.exports = mongoose.model("Login", LoginSchema, "logins");
