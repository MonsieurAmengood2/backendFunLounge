
//Carregar o arquivo .env: O arquivo .env está localizado algures numa diretoria. Este arquivo geralmente contém variáveis de ambiente, que são valores de configuração sensíveis ou específicas de ambiente 
// (como credenciais de base de dados, chaves de API, etc.
//As variáveis são lidas dentro do arquivo .env e definidas no ambiente do Node.js, tornando-as acessíveis via process.env.
//Arquivo .env (Exemplo):
//MONGO_USERS=mongodb://localhost:27017/mydb
//MONGO_LOGINS=mongodb://localhost:27017/logins
//PORT=3001
//SECRET_KEY=abc123
require("dotenv").config();

//Importar o Express.js, um framework para Node.js que facilita a criação de APIs e servidores web
// Facilita o processamento de requisições HTTP tornando mais simples a criação de APIs e servidores web.
//Com o Express.js, podemos usar app.get() e app.post() para criar endpoints na API
const express = require("express");


//Agora com isto podemos usar o jwt.sign() para gerar um token.
const jwt = require("jsonwebtoken"); 

// função de hash que criptografa senhas para aumentar a segurança dos dados armazenados
//A biblioteca bcrypt fornece duas funções principais para lidar com senhas:
const bcrypt = require("bcryptjs"); 

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

//process.env.MONGO_USERS acede à variável de ambiente MONGO_USERS que foi definida no arquivo .env.
//Segurança: Assim evita-se colocar informações sensíveis diretamente no código. As variáveis de ambiente são carregadas separadamente no arquivo .env, o que ajuda a proteger dados como senhas e chaves secretas.
const usersDB = mongoose.createConnection(process.env.MONGO_USERS) 
usersDB.on("connected", () => console.log("Conectado ao MongoDB (Users)!"));


const loginsDB = mongoose.createConnection(process.env.MONGO_LOGINS)
loginsDB.on("connected", () => console.log("Conectado ao MongoDB (Logins)!"));

// Criar os modelos separados para cada base de dados
const UserModel = usersDB.model("User", new mongoose.Schema({
    username: String,
    email: String,
    password: String
}));

const LoginModel = loginsDB.model("Login", new mongoose.Schema({
    user: String,
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

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Email inválido! Domínio Não Aceite" });
    }

    if (!isValidPassword(password)) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres, uma letra maiúscula, uma minúscula e um símbolo!" });
    }

    try {

        //Se um utilizador com joao123 ou joao@example.com já existir na base, existingUser ficará com esses dados
        const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
        
        //Se o utilizador já existir, retorna o erro 409 - Conflict
        if (existingUser) {
            return res.status(409).json({ message: "Utilizador já existe!" });
        }

        // Definir quantas vezes o bcrypt aplicará a função de hash para reforçar a segurança.
        const saltRounds = 10;  
        //Criar um hash seguro da senha antes de armazená-la na base de dados
        const hashedPassword = await bcrypt.hash(password, saltRounds); // Cria um hash seguro
        
        //Cria um novo objeto User com os dados fornecidos.
        const newUser = new UserModel({ username, email, password: hashedPassword });

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

// Função para validar email
function isValidEmail(email) {
    const allowedDomains = ["@gmail.com", "@outlook.pt", "@outlook.com", "@hotmail.com"];
    return allowedDomains.some(domain => email.endsWith(domain));
}

// Função para validar senha
function isValidPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#\$%^&*.,?]).{6,}$/;
    return regex.test(password);
}


// Permite que um utilizador faça Login 
//req (request)->Representa a requisição HTTP feita pelo cliente contendo informações como body, headers e params.
//res (response)->Representa a resposta que o servidor vai enviar para o cliente.
//async → Torna a função assíncrona, permitindo usar await para operações demoradas (ex: acessar o MongoDB).
app.post("/login", async (req, res) => {

    //Exibe uma mensagem no terminal sempre que um utilizador faz login
    console.log("Requisição de login recebida!");

    //Extrai username e password do req.body
    //req.body contém os dados enviados pelo cliente (frontend, app Android, etc.)
    //Portanto aqui usa-se a desestruturação de objeto para pegar apenas os dados que interessam do req.body, mesmo que o body tenha mais dados.
    const { loginInput, password } = req.body; // loginInput pode ser username ou email
    
    //Verifica se username e password estão vazios (undefined ou null).
    //Se algum dos campos estiver vazio, retorna 400 - Bad Request com a mensagem "Preencha todos os campos!"
    if (!loginInput || !password) {
        return res.status(400).json({ message: "Preencha todos os campos!" });
    }

    try {

        //Acessa à base de dados que leva tempo para responder.
        //Com async, o Node.js continua a rodar outras tarefas enquanto espera a resposta do MongoDB.
        //A função findOne() é um método do Mongoose,usada para interagir com o MongoDB
        // Aqui acede-se à coleção users no base de dados MongoDB procurando-se um único utilizador onde username ou email seja igual ao valor passado.
       // Buscar o utilizador pelo username OU pelo email
       // 🔹 Procurar o utilizador pelo "username" OU pelo "email"
       const foundUser = await UserModel.findOne({ 
        $or: [{ username: loginInput }, { email: loginInput }]
        });

        //Se o ytilizador não existir, user será null
        if (!foundUser) {
            //Se um utilizador tentar fazer login com um nome que não está na base de dados, essa mensagem aparece no terminal do servidor
            // O console.log é útil para fazer debug 
            console.log(" Utilizador não encontrado:", loginInput);

            //Resposta enviada para o frontend
            return res.status(401).json({ message: "Credenciais inválidas!" });
        }

         //O bcrypt.compare() está automatizado para comparar a senha digitada com o hash guardado na base de dados.
         //O bcrypt compara a senha digitada com o hash salvo e retorna true (se for igual) ou false (se for diferente)
         const isPasswordValid = await bcrypt.compare(password, foundUser.password);
         
         //Se a senha está errada
         if (!isPasswordValid) {
             console.log("Senha incorreta para:", loginInput);
             return res.status(401).json({ message: "Credenciais inválidas!" });
         }

        
        //Se a senha estiver correta, exibe-se uma mensagem no terminal do servidor
        console.log(`O Utilizador ${loginInput} fez login com sucesso!`);

        const loginEntry = new LoginModel({ user:loginInput });
        await loginEntry.save();



        //O jwt.sign() é uma função da biblioteca jsonwebtoken usada para gerar um token JWT.Essa função recebe 3 parâmetros:

        //Token completo (dividido em partes),exemplo:
        //eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.      <- HEADER
        //eyJ1c2VybmFtZSI6ImpvYW8xMjMiLCJlbWFpbCI6ImpvYW9AZW1haWwuY29tIiwiaWF0IjoxNjcxNTY4MTgzLCJleHAiOjE2NzE1NzE3ODN9. <- PAYLOAD
        //G_Z0B6oTz9XJlxnFuMVfIu5PzA1FbR4N8yD_LmvLTc8  <- SIGNATURE
        
        //O Utilizador envia o nome e senha para o servidor
        //O servidor verifica se as credenciais estão corretas
        //Se estiverem corretas, o servidor cria um JWT
        //O servidor retorna o token JWT para o cliente
        //O cliente usa esse token para acessar rotas protegidas

        //Depois que o servidor retorna o JWT, o cliente (frontend) faz o seguinte:
        //Armazena o token podendo ser salvo no localStorage, sessionStorage ou cookies.

        //Se o tempo de expiração (exp) do token ainda não tiver acabado, o utilizador pode: Fechar a app e reabrir sem precisar fazer login novamente.
        //Enviar o token para o servidor em cada requisição para comprovar que está autenticado.
        //Mas quando o token expira, o utilizador precisa fazer login novamente
        const token = jwt.sign(
            { username: foundUser.username, email: foundUser.email }, // Payload (dados do utilizador)
            process.env.SECRET_KEY, // Chave secreta para assinar o token
            { expiresIn: "1h" } // O token expira em 1 hora.Esse token expira numa1 hora, e depois disso, o utilizador precisará fazer login novamente para obter um novo.
        );

        return res.status(200).json({ token });

    //Se ocorrer qualquer erro inesperado, o código entra no catch (error)
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: "Erro no servidor!" });
    }
});


//Esse código inicia o servidor Express.js para que ele comece a escutar requisições HTTP feitas pelo browser, frontend ou outros clientes.
app.listen(PORT, () => {
    console.log(`Servidor a rodar na porta ${PORT}...`);
});