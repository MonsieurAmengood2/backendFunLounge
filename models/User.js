
//Importar a biblioteca Mongoose, que é usada para interagir com o MongoDB no Node.js.
//O Mongoose facilita a criação de Modelos (Models), que definem como os dados devem ser armazenados na base de dados.
const mongoose = require("mongoose");


//Criar um Modelo (Model) no Mongoose
//Criamos um UserSchema para definir a estrutura dos dados do utilizador
//Define-se aqui um modelo chamado "User".
//Esse modelo deve ter username, email e password
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});


//Cria um modelo (Model) chamado "User", baseado no UserSchema.
//Exporta esse modelo (User), para que possamos usá-lo em outras partes do código.


//O Mongoose cria automaticamente uma coleção no MongoDB com base no modelo .Esse modelo(User) pode ser usado no código do server.js graças ao exports
//Se o nome do modelo for singular ("User") o Mongoose cria a coleção no plural (users).
//Se o MongoDB ainda não tiver uma coleção users, ele cria automaticamente!
module.exports = mongoose.model("User", UserSchema, "users");