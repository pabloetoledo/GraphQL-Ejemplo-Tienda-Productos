const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
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
        },

        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({});
                return clientes;
            } catch (error) {
                console.log(error)
            }
        },

        obtenerClientesVendedor: async (_, {}, ctx) => {
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() });
                return clientes;
            } catch (error) {
                console.log(error)
            }
        },

        obtenerCliente: async (_, { id }, ctx) => {
            try {
                const cliente = await Cliente.findById(id);
                
                if(!cliente){
                    throw new Error('Cliente no encontrado'); 
                }
1
                if(cliente.vendedor.toString() !==  ctx.usuario.id ) {
                    throw new Error('No tienes las credenciales'); 
                }

                return cliente;
            } catch (error) {
                console.log(error)
            }
        },

        obtenerPedidos: async () => {
            try {
                const pedidos = await Pedido.find({});
                return pedidos;
            } catch (error) {
                console.log(error)
            }
        },

        obtenerPedidosVendedor: async (_, {}, ctx) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id });
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },

        obtenerPedido: async (_, { id }, ctx) => {
            try {
                const pedido = await Pedido.findById(id);

                if(!pedido) {
                    throw new Error('El pedido no existe');                    
                }

                if(pedido.vendedor.toString() !== ctx.usuario.id) {
                    throw new Error('No tienes las credenciales. Accion no permitida'); 
                }

                return pedido;
            } catch (error) {
                console.log(error);
            }
        },

        obtenerPedidosEstado: async(_, { estado }, ctx) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });
                return pedidos;
            } catch (error) {
                console.log(error);
            }
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
        },

        nuevoCliente: async (_, { input }, ctx) => {
            const { email } = input;

            //verificar si el cliente ya esta registrado
            const cliente = await Cliente.findOne({ email });

            if(cliente) {
                throw new Error('El cliente ya esta registrado');
            }

            const nuevoCliente = new Cliente(input);

            //asignar vendedor
            nuevoCliente.vendedor = ctx.usuario.id;

            try {
                //guardar cliente
                
                const resultado = await nuevoCliente.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }            
        },

        actualizarCliente: async (_, {id, input}, ctx) => {
            //verificar si existe o no
            let cliente = await Cliente.findById(id);

            if(!cliente) {
                throw new Error('El cliente no existe');
            }

            //verificar si el vendedor es el que edita
            if(cliente.vendedor.toString() !==  ctx.usuario.id ) {
                throw new Error('No tienes las credenciales'); 
            }

            //guardar cliente
            cliente = await Cliente.findOneAndUpdate({ _id : id }, input, { new : true });
            return cliente;
        },

        eliminarCliente: async (_, { id: ID}, ctx) => {
            //verificar si existe o no
            let cliente = await Cliente.findById(id);

            if(!cliente) {
                throw new Error('El cliente no existe');
            }

            //verificar si el vendedor es el que edita
            if(cliente.vendedor.toString() !==  ctx.usuario.id ) {
                throw new Error('No tienes las credenciales'); 
            }

            //Eliminar
            await Cliente.findOneAndDelete({ _id : id });

            return "Cliente eliminado";
        },
        
        nuevoPedido: async (_, { input }, ctx) => {
            //verificar si el cliente existe
            const { cliente } = input;

            let clienteExiste = await Cliente.findById(cliente);

            if(!clienteExiste) {
                throw new Error('El cliente no existe');
            }

            //Verificar si el cliente es del vendedor            
            if(clienteExiste.vendedor.toString() !==  ctx.usuario.id ) {
                throw new Error('No tienes las credenciales'); 
            }

            //Revisar que el stock este disponible
            for await (const articulo of input.pedido) {
                const { id } = articulo;

                const producto = await Producto.findById(id);

                if(articulo.cantidad > producto.existencia) {
                    throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`);
                } else {
                    //Restar una cantidad a lo disponible
                    producto.existencia = producto.existencia - articulo.cantidad;
                    await producto.save();
                }
            }

            //Crear nuevo Pedido
            const nuevoPedido = new Pedido(input);

            //Asignarle un vendedor
            nuevoPedido.vendedor = ctx.usuario.id; 

            //Guardar en db
            const resultado = await nuevoPedido.save();
            return resultado;
        },

        actualizarPedido: async(_, { id, input }, ctx) => {

            const { cliente } = input;

            //Si el pedido existe
            const existePedido = await Pedido.findById(id);

            if(!existePedido) {
                throw new Error('El pedido no existe');
            }

            //Si el cliente existe
            const existeCliente = await Cliente.findById(id);

            if(!existeCliente) {
                throw new Error('El cliente no existe');
            }

            //Si el pedido pertenece al vendedor
            if(existeCliente.vendedor.toString() !==  ctx.usuario.id ) {
                throw new Error('No tienes las credenciales'); 
            }

            //Revisar el stock
            if(input.pedido){
                for await (const articulo of input.pedido) {
                    const { id } = articulo;
    
                    const producto = await Producto.findById(id);
    
                    if(articulo.cantidad > producto.existencia) {
                        throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`);
                    } else {
                        //Restar una cantidad a lo disponible
                        producto.existencia = producto.existencia - articulo.cantidad;
                        await producto.save();
                    }
                }
            }            

            //Guardar
            const resultado = await Pedido.findOneAndUpdate({ _id : id }, input, { new: true });
            return resultado;
        }, 

        eliminarPedido: async(_, { id }, ctx) => {
            //Verificamos si el pedido existe
            const pedido = await Pedido.findById(id);

            if(!pedido) {
                throw new Error('El pedido no existe');
            }

            //Verificar si el vendedor lo intenta borrar            
            if(pedido.vendedor.toString() !==  ctx.usuario.id ) {
                throw new Error('No tienes las credenciales'); 
            }

            //eliminamos
            await Pedido.findOneAndDelete({ _id : id });

            return "Pedido eliminado";
        }
    }
}

module.exports = resolvers;