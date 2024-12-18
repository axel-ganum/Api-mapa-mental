import Mindmap from '../models/mapModel.js'; 
import Node from '../models/node.js'; 
import Edge from '../models/edgesModel.js';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Notification from '../models/NotificationSchema.js'
const { ObjectId } = mongoose.Types


export const createMindmap = async ({title, description, nodes, edges,thumbnail,userId  }) => {
    console.log("Validando entrada para crear el mapa..");
    
    if(!title || !description || !nodes.length || !edges ||!thumbnail) {
        console.log("Datos insuficientes para crear el mapa");
        
    throw new Error('Datos insuficientes para crear el mapa ')
    }

     console.log("Creando nuevo mapa mental...")
    const newMindmap = new Mindmap({
        title,
        description,
        thumbnail,
        user: userId,
    });
    
    console.log("Guardando mapa mental:", {title, description,userId})
    const saveMindemap = await newMindmap.save();
    console.log("Mapa mental guardado:", saveMindemap);

    try {  
    console.log("Iniciando guardado de nodos...");

    const nodeMap = new Map()
    
    const nodePromise = nodes.map(async (nodeData) => {
       const newNode = new Node({
        content: nodeData.data.label.props.text,
        position: nodeData.position,
        mindmap: saveMindemap._id,
       });
     console.log("Guardar nodo:", newNode)
     const savedNode = await newNode.save();
     nodeMap.set(nodeData.id, savedNode._id)
     return savedNode._id
    });
  const savedNodes = await Promise.all(nodePromise);
  console.log("Nodos guardados:", savedNodes.map(node => node._id));
  

   console.log("Iniciando guardado de edges....");
   
    const edgePromises = edges.map(async (edgesData) => {
       const sourceId = nodeMap.get(edgesData.source)
       const targetId = nodeMap.get(edgesData.target)

        if(!sourceId || !targetId) {
            console.log("Error: no se encontraron nodeos para los edges",{edgesData});
            throw new Error("No se encontraron nodos para lso edges")
        }
    const newEdge = new Edge({
        source: new mongoose.Types.ObjectId(sourceId),
        target: new mongoose.Types.ObjectId(targetId),
        mindmap: saveMindemap._id,
    });
         console.log("Guardando edge:", newEdge);
         
         await newEdge.save();
         
        await Node.findByIdAndUpdate(sourceId, {
            $push: {edges: newEdge._id, children: targetId},
        })

         await Node.findByIdAndUpdate(targetId, {
            $push: {edges: newEdge._id}
         });
    });
    await Promise.all(edgePromises);

    console.log("Edges guardados");
    


    return saveMindemap;
 } catch (error) {
    console.log("Error guardando nods o edges:", error);
    throw new Error('Error al guardar' + error.message)
    
 }
}

export const getMapById = async (mapId, userId) => {
   try {
     const map = await Mindmap.findOne({_id: mapId, $or: [{user: userId}, {sharedWith: userId}]});

     if (!map) {
        console.log('Mapa no encontrado o no pertenece al usuario');
        return null
        
     }

     const nodes = await Node.find({mindmap: map._id});
     const edges = await Edge.find({mindmap: map._id});
    
     const result = {
        ...map.toObject(),
        nodes: nodes.map((node) => ({
            id: node._id,
            content: node.content,
            position: node.position,
            edges: node.edges,
            children: node.children,
        })),
        edges: edges.map((edge) => ({
            id: edge._id,
            source: edge.source,
            target: edge.target,
        })),
     };

       console.log('Mpa encontrado:', result);
       return result;
       
    
   } catch (error) {
     console.error('Error al busacar el mapa', error);
     throw error
   }
}
export const updateMindmap = async ({ id, title, description, nodes, edges, thumbnail, userId }) => {  
    console.log("Actualizando mapa mental con Id:", id);
    console.log("Payload recibido:", { id, title, description, nodes, edges, thumbnail });

    // Validación inicial
    if (!id || !Array.isArray(nodes) || !nodes.length || !Array.isArray(edges) || !thumbnail) {
        console.log("Datos insuficientes para actualizar el mapa");
        throw new Error("Datos insuficientes para actualizar el mapa");
    }

    try {
        // Buscar el mapa mental por ID
        console.log("Buscando mapa mental con ID:", id);
        const mindmap = await Mindmap.findById(id)
            .populate({
                path: 'nodes',
                populate: { path: 'edges', populate: ['source', 'target'] }
            })
            .populate('edges');

        if (!mindmap) {
            console.log("Mapa mental no encontrado para el ID:", id);
            return null;
        }

        // Verificación de permisos
        const isOwner = mindmap.user.toString() === userId;
        const isSharedWithUser = mindmap.sharedWith.some(sharedWithId => sharedWithId.toString() === userId);
        console.log("Verificando permisos del usuario:", userId);
        if (!isOwner && !isSharedWithUser) {
            console.log("El usuario no tiene permiso para actualizar este mapa mental");
            throw new Error("No tienes permiso para actualizar este mapa mental");
        }

        // Actualización de los datos del mapa mental
        const updateData = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (thumbnail) updateData.thumbnail = thumbnail;

        console.log("Datos actualizados del mapa mental:", updateData);
        const updatedMindmap = await Mindmap.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedMindmap) {
            console.log("Mapa mental no encontrado o no pertenece al usuario");
            return null;
        }
        console.log("Mapa mental actualizado correctamente");

        // Mapeo de nodos y creación/actualización
        const nodeMap = new Map();
        const nodePromises = nodes.map(async (nodeData) => {
            console.log("Procesando nodo:", nodeData);
            const nodeId = mongoose.Types.ObjectId.isValid(nodeData.id) ? nodeData.id : undefined;

            if (nodeId) {
                const updatedNode = await Node.findByIdAndUpdate(
                    { _id: nodeId, mindmap: updatedMindmap._id },
                    { content: nodeData.content, position: nodeData.position },
                    { new: true }
                );
                nodeMap.set(nodeData.id, updatedNode);
                return updatedNode;
            } else {
                const newNode = new Node({ content: nodeData.content, position: nodeData.position, mindmap: updatedMindmap });
                const savedNode = await newNode.save();
                nodeMap.set(nodeData.id, savedNode);
                return savedNode;
            }
        });

        const savedNodes = await Promise.all(nodePromises);
        console.log("Nodos procesados:", savedNodes);
        console.log("NodeMap (para verificar mapeo de nodos):", [...nodeMap.entries()]);

        // Procesamiento de edges (aristas)
        const edgePromises = edges.map(async (edgeData) => {
            console.log("Procesando edge:", edgeData);
            const sourceId = nodeMap.get(edgeData.source)._id;
            const targetId = nodeMap.get(edgeData.target)._id;
            
            if (!sourceId || !targetId) {
                console.log("Edge con nodos no encontrados:", edgeData, "Source ID:", sourceId, "Target ID:", targetId);
                throw new Error("No se encontraron nodos para los edges");
            }

            let edgeId = mongoose.Types.ObjectId.isValid(edgeData.id) ? edgeData.id : null;
            if (!edgeId || edgeData.id.startsWith("reactflow__edge")) {
                const newEdge = new Edge({
                    source: sourceId,
                    target: targetId,
                    mindmap: updatedMindmap._id,
                });
                const savedEdge = await newEdge.save();
                edgeId = savedEdge._id;
            } else {
                await Edge.findByIdAndUpdate(
                    { _id: edgeId, mindmap: updatedMindmap._id },
                    { source: sourceId, target: targetId }
                );
            }

            // Actualizar nodos con el edge creado/actualizado
            await Node.findByIdAndUpdate(sourceId, { $addToSet: { edges: edgeId, children: targetId } });
            await Node.findByIdAndUpdate(targetId, { $addToSet: { edges: edgeId } });
        });

        await Promise.all(edgePromises);
        console.log("Edges procesados (creados/actualizados)");

        // Dar un pequeño retraso antes de la última consulta poblada
       

        // Devolver el mindmap actualizado con los nodos y edges poblados
        const updatedMindmapWithPopulatedData = await Mindmap.findById(id)
        .populate({ path: 'nodes', populate: { path: 'edges' } })
        .populate('edges');
      
      console.log("Mapa mental actualizado con nodos y aristas poblados:", updatedMindmapWithPopulatedData);
      return updatedMindmapWithPopulatedData;
      
    } catch (error) {
        console.error("Error al actualizar el mapa mental:", error.message);
        throw new Error("Error al actualizar el mapa mental: " + error.message);
    }
};




export const deleteNodeFromDatabase = async (nodeId) => {
    try {
        // Verificar si el `nodeId` es un ObjectId válido (24 caracteres hexadecimales)
        const query = ObjectId.isValid(nodeId) ? new ObjectId(nodeId) : nodeId;

        // Eliminar edges con el `nodeId` en source o target
        await Edge.deleteMany({ $or: [{ source: query }, { target: query }] });

        // Eliminar el nodo con el `nodeId`
        const result = await Node.findByIdAndDelete(query);

        if (!result) {
            throw new Error('Nodo no encontrado');
        }
        console.log('Nodo eliminado exitosamente');

    } catch (error) {
        console.error('Error al eliminar nodo:', error.message);
        throw new Error('Error al eliminar nodo: ' + error.message);
    }
};


export const shareMapWithUser = async (mapId, emailToShare, connectectedUsers) => {
    try {
        console.log("Buscando usuario con email:", emailToShare);
        const emailTimerimmed = emailToShare.trim()
        const userToShare = await User.findOne({email: emailTimerimmed});
        if(!userToShare) {
            console.log("Usuario no encontrado")
            return {success:false, message:'No se encontró un usuario con ese correo elctrónico'}

        }

         console.log("Usuario encontrado", userToShare);

         console.log("Buscando mapa con ID:", mapId);
         
         
        const mindmap = await Mindmap.findById(mapId);
        if (!mindmap) {
            return {success: false, message: 'Mapa no encontrado'}
        }

        console.log("Mapa encontrado:", mindmap);
        
           
        if(!mindmap.sharedWith.includes(userToShare._id)) {
            console.log("Compartiendo mapa con el usuario...")
            mindmap.sharedWith.push(userToShare._id);
            await mindmap.save();

         
        const notification = new Notification({
           user: userToShare._id,
           message:`Te han compartido un mapa llamado ${mindmap.title}. Haz clic en el botón "Ver Mapas Existentes" para acceder a él.`, 
           seen: false
        })
      
        await notification.save();

        const unreasCount = await Notification.countDocuments({user: userToShare._id, seen: false});

            const userSocket = connectectedUsers[userToShare._id];
            if(userSocket) {
                console.log("Usuario conectado, se enviará la notificacion por websocket...");
                
                userSocket.send(JSON.stringify({
                    action:'notification',
                    _id: notification._id,  
                    message: `Te han compartido un mapa llamado ${mindmap.title}. Haz clic en el botón "Ver Mapas Existentes" para acceder a él.`,
                    unreasCount: unreasCount
                }))
            }  else {
                console.log("Usuario no conectado, se enviará la notificacio  cuando se conecte.");
                
               
            }
            return {success: true, message: 'Mapa compartido exitosamente'};
        } else {
            return {success: false, message: 'El usuario ya tiene acceso o no se proporciono el ID'};

        }
    } catch (error) {
        throw new Error('Error al compartir el mapa' + error.message)
    }
}