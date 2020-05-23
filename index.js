const {ApolloServer, gql} = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');

const conectarDB = require('./config/db');

//Conectar a la base de datos
conectarDB();

//servidor
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => {
        const miContext = "Hola";

        return {
            miContext
        }
    }
});

//arrancar el servidor
server.listen().then( ({url}) => {
    console.log(`Servidor listo y corriendo en la URL ${url}`);
})