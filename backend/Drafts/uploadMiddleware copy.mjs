import multer from "multer";
import path from "path";
import fs from "fs";
import logger from "../utils/logger.mjs";

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Define the storage location (temporary storage before uploading to Google Drive)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Save files in the uploads/ folder temporarily
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`); // ✅ Fixed template literal syntax
    },
});

// File validation - Only allow image and PDF files
const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        logger.warn("Rejected file upload: %s", file.originalname);
        cb(new Error("Only .jpg, .jpeg, .png, and .pdf files are allowed"));
    }
};

// Middleware to handle file uploads from the API
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 }, // 1MB max per file to match frontend constraints
}).fields([
    { name: "license", maxCount: 1 },
    { name: "registration", maxCount: 1 },
    { name: "criminal", maxCount: 1 },
    { name: "personal", maxCount: 1 },
]);

// Middleware to process file uploads from API requests
export const processFileUpload = async (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            logger.error("File upload error: %s", err.message);
            return res.status(400).json({ message: err.message });
        }
         // ✅ Parse non-file fields manually
    Object.keys(req.body).forEach((key) => {
        req.body[key] = req.body[key]?.trim();
      });
  
      logger.info("Files uploaded and form data processed successfully.");
        next();
    });
};

export default upload;
