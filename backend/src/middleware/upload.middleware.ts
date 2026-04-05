import fs from "fs";
import path from "path";
import multer from "multer";

const uploadRoot = path.resolve(__dirname, "..", "..", "uploads", "characters");

if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
        cb(null, uploadRoot);
    },
    filename: (_req: any, file: any, cb: any) => {
        const ext = path.extname(file.originalname) || ".jpg";
        const base = path
            .basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_]/g, "")
            .slice(0, 40);
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${base || "photo"}-${unique}${ext}`);
    },
});

const imageFilter: multer.Options["fileFilter"] = (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
        return;
    }
    cb(new Error("Only image files are allowed."));
};

export const uploadCharacterPhoto = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
}).single("photo");
