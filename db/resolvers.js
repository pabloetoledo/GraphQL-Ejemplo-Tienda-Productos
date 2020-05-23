const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const bcrypjs = require('bcryptjs');
require('dotenv').config({ path : 'variables.env' });
const jwt = require('jsonwebtoken');

const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre, apellido } = usuario;
    return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn })
}

//resolvers
const resolvers = {
    Query: {
        obtenerUsuario: async (_, { token }) => {
            const usuarioId = await jwt.verify(token, process.env.SECRETA);
            return usuarioId;
        },

        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({});
                return productos;   
            } catch (error) {
                console.log(error);
            }
        },

        obtenerProducto: async (_, { id }) => {
            // Revisar si el producto existe
            const producto = await Producto.findById(id);

            if(!producto) {
                throw new Error('Producto no encontrado');
            }

            return producto;
        }
    },

    Mutation: {
        nuevoUsuario: async (_, {input}, ctx, info ) => {
            
            const {email, password } = input;
            
            const existeUsuario = await Usuario.findOne({email});
            
            if(existeUsuario) {
                throw new Error('El usuario ya está registrado');
            }

            const salt = await bcrypjs.genSalt(10);
            input.password = await bcrypjs.hash(password, salt);

            try {
                const usuario = new Usuario(input);
                usuario.save();
                return usuario;
            } catch (error) {
                console(error);
            }
            
        },

        autenticarUsuario: async (_, {input}) => {            
            console.log('autenticar: ', input);
            const { email, password } = input;

            //Si el usuario existe
            const existeUsuario = await Usuario.findOne({email});
            if(!existeUsuario) {
                throw new Error('El usuario no existe');
            }
            
            //Revisar si el password es correcto
            const passwordCorrecto = await bcrypjs.compare(password, existeUsuario.password);
            if(!passwordCorrecto) {
                throw new Error('El password es incorrecto');
            }
            
            //Creamos el token
            return {
                token : crearToken(existeUsuario, process.env.SECRETA, '24h')
            }
        },

        nuevoProducto: async (_, { input }) => {
            try {
                const producto = new Producto(input);

                //almacenar en la base de datos
                const resultado = await producto.save()
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },

        actualizarProducto: async (_, { id, input }) => {
            try {                
                // Revisar si el producto existe
                let producto = await Producto.findById(id);

                if(!producto) {
                    throw new Error('Producto no encontrado');
                }

                //Guardar en la base de datos
                producto = await Producto.findOneAndUpdate({ _id : id }, input, { new : true } );
                return producto;

            } catch (error) {
                console.log(error);
            }
        },

        eliminarProducto: async (_, { id }) => {
            try {
                 // Revisar si el producto existe
                 let producto = await Producto.findById(id);

                 if(!producto) {
                     throw new Error('Producto no encontrado');
                 }

                 //Eliminar
                 await Producto.findOneAndDelete({ _id : id});

                 return "Producto Eliminado"

            } catch (error) {
                
            }
        }
    }
}

module.exports = resolvers;