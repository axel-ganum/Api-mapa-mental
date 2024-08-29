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


