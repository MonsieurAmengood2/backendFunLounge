const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const User = require("./models/User"); // Importar modelo de usuário

const app = express();
const PORT = 3001;

// Conexão com o MongoDB sem opções desnecessárias
mongoose.connect("mongodb://127.0.0.1:27017/funloungeDB")
    .then(() => console.log("✅ Conectado ao MongoDB!"))
    .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err));

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rota de Registro de Usuário
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "⚠️ Preencha todos os campos!" });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ message: "⚠️ Usuário já existe!" });
        }

        const newUser = new User({ username, email, password });
        await newUser.save();

        console.log("📌 Usuário registrado no MongoDB:", newUser);
        res.status(201).json({ message: "✅ Usuário registrado com sucesso!" });

    } catch (error) {
        console.error("❌ Erro ao registrar usuário:", error);
        res.status(500).json({ message: "Erro no servidor!" });
    }
});

// Rota de Login
app.post("/login", async (req, res) => {
    console.log("📥 Requisição de login recebida!", req.body);
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "⚠️ Preencha todos os campos!" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.log("❌ Usuário não encontrado:", username);
            return res.status(401).json({ message: "❌ Credenciais inválidas!" });
        }

        if (user.password !== password) {
            console.log("❌ Senha incorreta para:", username);
            return res.status(401).json({ message: "❌ Credenciais inválidas!" });
        }

        console.log(`✅ Usuário ${username} fez login com sucesso!`);
        return res.status(200).json({ token: "fake-jwt-token" });
    } catch (error) {
        console.error("❌ Erro no login:", error);
        res.status(500).json({ message: "Erro no servidor!" });
    }
});

// Rota para Listar Usuários
app.get("/users", async (req, res) => {
    try {
        const users = await User.find({});
        console.log("📋 Lista de usuários do MongoDB:", users);
        res.json(users);
    } catch (error) {
        console.error("❌ Erro ao buscar usuários:", error);
        res.status(500).json({ message: "Erro no servidor!" });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}...`);
});