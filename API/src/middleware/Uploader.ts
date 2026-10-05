import multer from "multer";
import fs from "fs";
import path from "path";

const uploader = (dir = '/') => {

    const myStorage = multer.diskStorage({

        destination: (req, file, cb) => {

            const filePath = path.join(
                process.cwd(),
                "public/uploads/images" + dir
            )

            if(!fs.existsSync(filePath)) {
                fs.mkdirSync(filePath, {recursive: true})
            }

            cb(null, filePath)
        },

        filename: (req, file, cb) => {

            const filename = Date.now() + "-" + file.originalname

            cb(null, filename)
        }

    })

    const multerobj = multer({
        storage: myStorage,

        fileFilter: (req, file, cb) => {

            const ext = file.originalname
                .split(".")
                .pop()
                ?.toLowerCase() as string

            const allowed = [
                'jpg',
                'jpeg',
                'png',
                'svg',
                'webp',
                'bmp',
                'gif'
            ]

            if(allowed.includes(ext)) {
                cb(null, true)
            } else {
                cb(new Error("File not supported"))
            }
        },

        limits: {
            fileSize: 3000000
        }
    });

    return multerobj;
}

export default uploader;