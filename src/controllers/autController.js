import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {useModel} from './userModel.js'

export const registrer = async (req, res) => {
    const {username, email, password} = req.body;

    try {
        
        const existingUser = await User.findOne({email});
        if (existingUser){
            return res.status(400).json({message: 'El usuario ya existe'})
        }

           const hashedpassword = await bcrypt.hash(password, 10);

           const newUser= new User({
            username,
            email,
            password: hashedpassword
           });

           await newUser.save();

           res.status(201).json({message: 'Usuario registro extosamnete'});
        }catch (error) {
            res.status(500).json({message: 'Error en el registro de usuario', error});
        }

    }

    export const login = async (req, res) => {
        const {email, password} = req.body;

        try {
            const existingUser = await User.findOne({email});
            if (!existingUser) {
                return res.status(404).json({massage: 'Usuario no encontrado'});
            }
        

        const isPasswordCorrect = await bcrypt.compare(password, existingUser.password)
        if (!isPasswordCorrect) {
            return res.status(400).json({message: 'contraseña incorrecta'});
        }

        const token = jwt.sign({id: existingUser._id}, process.env.JWT_SECRET, {expiresIn:'1h'});
         
        res.status(200).json({token});

    }catch (error){
        res.status(500).json({message: 'Error en el inicio de sesion', error})
    }
    }
