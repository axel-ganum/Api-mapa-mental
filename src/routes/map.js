import Mindmap from '../models/mapModel.js'; // Corregido: Se añadió el punto y coma al final de la importación
import Node from '../models/node.js'; // Corregido: Se añadió el punto y coma al final de la importación
import Edge from '../models/edgesModel.js';
import mongoose from 'mongoose';



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
     const map = await Mindmap.findOne({_id: mapId, user: userId});

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
     throw err
   }
}

export const updateMindmap = async ({id, title, description, nodes, edges, thumbnail, userId}) => {
    console.log("Actualizando mapa mental con Id:", id);
   

    if (!id || !title || !description || !Array.isArray(nodes) || !nodes.length || !Array.isArray(edges) || !thumbnail) {
        console.log("Datos insuficientes para actualizar el mapa");
        

        throw new Error("Datos insuficinetes para actualizar el mapa")
    
    }

    try {
    
    const updatedMindmap  = await Mindmap.findByIdAndUpdate(
        {_id:id, userId:userId},
        {title, description, thumbnail},
        {new: true}
    )

    if(!updatedMindmap) {
        console.log("Mapa mental no encontrado o no pertenece al usuario");
        return null;
        
    }

    console.log("Mapa mental actualizado correctamente ");

    const nodeMap = new Map ();
    const nodePromise = nodes.map(async (nodeData) => {

        if(!nodeData.content) {
            console.log("Error: El nodo no tiene contenido");
            throw new Error("Cada nodo debe tener un contenido")
            
        }

        const nodeId = mongoose.Types.ObjectId.isValid(nodeData.id) ? nodeData.id : undefined;

     if(nodeId) {

        const updateNode =  await Node.findByIdAndUpdate(
            {_id:nodeId, mindmap: updatedMindmap._id},
            {content: nodeData.content, position: nodeData.position},
            {new: true}
        )

        if(!updateNode) {
          throw new Error(`No se pudo actualiza el nodo con IDn${nodeData.id}`)
        }
        nodeMap.set(nodeData.id, updateNode._id);
        return updateNode._id;
        } else {
            const newNode = new Node({
                content: nodeData.content,
                position: nodeData.position,
                mindmap: updatedMindmap
            });
            const savedNode = await newNode.save();
            nodeMap.set(nodeData.id, savedNode._id);
            return savedNode._id;
         
            

            
     }
    });
    const saveNodeIds = await Promise.all(nodePromise);
    console.log("Nodos procesados (creandos/ actualizados):", saveNodeIds);
      
    const edgePromise = edges.map(async (edgesData) => {
        const sourceId = nodeMap.get(edgesData.source);
        const targetId = nodeMap.get(edgesData.target);

        if (!sourceId || !targetId) {
            console.log(('Error: nodos no encontrados para los edges', edgesData));
            throw new Error("No se encontraron nodos para los edges");  
        }
        let edgeId = mongoose.Types.ObjectId.isValid(edgesData.id) ? edgesData.id : null;
        if (!edgeId || edgesData.id.startsWith("reactflow__edge")) {

            const newEdge = new Edge({
               source: new mongoose.Types.ObjectId(sourceId),
               target: new mongoose.Types.ObjectId(targetId),
               mindmap: updatedMindmap._id, 
            });
           
            const savedEdge = await newEdge.save();
            edgeId = savedEdge._id; 
            
        } else {

            await Edge.findByIdAndUpdate(
                {_id: edgeId, mindmap: updatedMindmap._id},
                {source: sourceId, target: targetId}
            );
        
        }
         await Node.findByIdAndUpdate(sourceId, {
            $addToSet: { edges: edgeId || newEdge._id, children: targetId },
         })
         await Node.findByIdAndUpdate(targetId, {
            $addToSet: { edges: edgeId|| newEdge._id },
          });
    });

    await Promise.all(edgePromise);
    console.log("Edges procesados (creados/actualizados");
    return updatedMindmap
    
    } catch (error) {
        console.error("Error al actualizar el mapa mental:", error.message);
    throw new Error("Error al actualizar el mapa mental: " + error.message);
        
    }
}

export const deleteNodeFromDatabase = async (nodeId) => {

    try {
        await Edge.deleteMany({$or: [{source: nodeId}, {target: nodeId}]});
        
        const result = await Node.findByIdAndDelete(nodeId);

        if(!result) {
            throw new Error('Nodo no encontrado')
        }
        console.log('Nodo eliminado');
        
    } catch (error){
        throw new Error('Eroor al eliminar nodo' + error.message)
    }
}
