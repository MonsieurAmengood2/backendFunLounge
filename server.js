

require("dotenv").config();

//Importar o Express.js, um framework para Node.js que facilita a criação de APIs e servidores web
// Facilita o processamento de requisições HTTP tornando mais simples a criação de APIs e servidores web.
//Com o Express.js, podemos usar app.get() e app.post() para criar endpoints na API
const express = require("express");


//Permitir requisições externas.
const cors = require("cors");

///Quando uma aplicação envia uma requisição POST ou PUT para o servidor com dados no body, o Node.js não entende automaticamente esses dados e por isso se usa o bodyParser para contornar esse problem
const bodyParser = require("body-parser");

//Importar o Mongoose, uma biblioteca do Node.js que me permite conectar ao MongoDB e trabalhar com bases de dados.
const mongoose = require("mongoose");

//Importar o modelo de utilizador (User), que define como os dados dos utilizadores serão armazenados no MongoDB.
const User = require("./models/User"); 


const Login = require("./models/Login"); 

// O Express.js funciona como um servidor em Node.js. Ele permite receber, processar e responder a requisições HTTP feitas por aplicações frontend, apps Android, ou qualquer outro cliente.
//O Express cria um servidor web que escuta requisições numa porta específica e responde a elas.
const app = express();

const PORT = process.env.PORT || 3001;

// 🔹 Conectar à base de dados `users` (onde os utilizadores serão registrados)
const usersDB = mongoose.createConnection(process.env.MONGO_USERS, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
usersDB.on("connected", () => console.log("✅ Conectado ao MongoDB (Users)!"));

// 🔹 Conectar à base de dados `logins` (onde serão armazenados os logins)
const loginsDB = mongoose.createConnection(process.env.MONGO_LOGINS, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
loginsDB.on("connected", () => console.log("✅ Conectado ao MongoDB (Logins)!"));

// Criar os modelos separados para cada base de dados
const UserModel = usersDB.model("User", new mongoose.Schema({
    username: String,
    email: String,
    password: String
}));

const LoginModel = loginsDB.model("Login", new mongoose.Schema({
    username: String,
    loginTime: { type: Date, default: Date.now }
}));


//Ativa o CORS para permitir que outros domínios ou aplicações acedam à API.
app.use(cors());

//Se for enviado um json assim:{ "username": "joao123", "password": "senha123" } o servidor consegue processar os dados corretamente
app.use(bodyParser.json());

// Definir uma rota POST /register, que será chamada pelo frontend ou app
//O async é usado porque a operação de acesso à base de dados leva tempo
app.post("/register", async (req, res) => {

    //Pegar os valores username, email e password do req.body (dados enviados pelo frontend).
    const { username, email, password } = req.body;
    
    //Se algum dos campos estiver vazio, retorna um erro "400 - Bad Request"
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Preencha todos os campos!" });
    }

    try {

        //Se um utilizador com joao123 ou joao@example.com já existir na base, existingUser ficará com esses dados
        const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
        
        //Se o utilizar já existir, retorna o erro 409 - Conflict
        if (existingUser) {
            return res.status(409).json({ message: "Utilizador já existe!" });
        }
        
        //Cria um novo objeto User com os dados fornecidos.
        const newUser = new UserModel({ username, email, password });

        //save() serve para armazenar esse utilizador na coleção users do MongoDB
        await newUser.save();
        
        //Exibe no terminal do servidor os dados do utilizador recém-criado
        console.log("Utilizador registrado no MongoDB:", newUser);

        //mensagem no frontend
        res.status(201).json({ message: "Utilizador registrado com sucesso!" });

    ///Se houver algum erro inesperado salta para aqui
    } catch (error) {
        console.error("Erro ao registrar utilizador:", error);
        res.status(500).json({ message: "Erro no servidor!" });
    }
});

// Permite que um utilizador faça Login 
//req (request)->Representa a requisição HTTP feita pelo cliente contendo informações como body, headers e params.
//res (response)->Representa a resposta que o servidor vai enviar para o cliente.
//async → Torna a função assíncrona, permitindo usar await para operações demoradas (ex: acessar o MongoDB).
app.post("/login", async (req, res) => {

    //Exibe uma mensagem no terminal sempre que um utilizador faz login
    console.log("Requisição de login recebida!", req.body);

    //Extrai username e password do req.body
    //req.body contém os dados enviados pelo cliente (frontend, app Android, etc.)
    //Portanto aqui usa-se a desestruturação de objeto para pegar apenas os dados que interessam do req.body, mesmo que o body tenha mais dados.
    const { username, password } = req.body;
    
    //Verifica se username e password estão vazios (undefined ou null).
    //Se algum dos campos estiver vazio, retorna 400 - Bad Request com a mensagem "Preencha todos os campos!"
    if (!username || !password) {
        return res.status(400).json({ message: "Preencha todos os campos!" });
    }

    try {

        //Acessa à base de dados que leva tempo para responder.
        //Com async, o Node.js continua a rodar outras tarefas enquanto espera a resposta do MongoDB.
        //A função findOne() é um método do Mongoose,usada para interagir com o MongoDB
        // Aqui acede-se à coleção users no base de dados MongoDB procurando-se um único utilizador onde username seja igual ao valor passado.
        const user = await UserModel.findOne({ username });

        //Se o usuário não existir, user será null
        if (!user) {
            //Se um utilizador tentar fazer login com um nome que não está na base de dados, essa mensagem aparece no terminal do servidor
            // O console.log é útil para fazer debug 
            console.log(" Utilizador não encontrado:", username);

            //Resposta enviada para o frontend
            return res.status(401).json({ message: "Credenciais inválidas!" });
        }

        if (user.password !== password) {
            console.log("Senha incorreta para:", username);
            // Se a senha fornecida pelo utilizador está incorreta é devolvido este erro 401 - Unauthorized
            //O return res.status(401).json(...) no Node.js envia uma resposta HTTP para a app, dizendo que o login falhou.
            //A app recebe essa resposta e exibe um Toast baseado no código HTTP
            return res.status(401).json({ message: " Credenciais inválidas!" });
        }
        //Se a senha estiver correta, exibe-se uma mensagem no terminal do servidor
        console.log(`O Utilizador ${username} fez login com sucesso!`);

        const loginEntry = new LoginModel({ username });
        await loginEntry.save();

        //Retorna um "token fake" 
        return res.status(200).json({ token: "fake-jwt-token" });

    //Se ocorrer qualquer erro inesperado, o código entra no catch (error)
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro no servidor!" });
    }
});

// Listar todos os utilizadores registrados no MongoDB
app.get("/users", async (req, res) => {
    try {
        const users = await UserModel.find({});
        console.log(" Lista de utilizadores no MongoDB:", users);
        res.json(users);

    } catch (error) {
        console.error("Erro ao buscar utilizadores:", error);
        res.status(500).json({ message: "Erro no servidor!" });
    }
});

//Esse código inicia o servidor Express.js para que ele comece a escutar requisições HTTP feitas pelo browser, frontend ou outros clientes.
app.listen(PORT, () => {
    console.log(`Servidor a rodar na porta ${PORT}...`);
});