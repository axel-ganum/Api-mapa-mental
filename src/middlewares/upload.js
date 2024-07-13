import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDirectory = path.join(__dirname, '..', 'uploads')

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {recursive:true});
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory)
    },
    filenama: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalme));
    }
});

const upload = multer({storage});

export default upload 