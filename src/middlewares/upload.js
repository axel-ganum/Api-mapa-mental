import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Obtener el __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define el directorio de carga
const uploadDirectory = path.join(__dirname, '..', 'uploads');

// Crea el directorio si no existe
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Configuración de almacenamiento de multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Configuración de multer
const upload = multer({ storage });

export default upload;


