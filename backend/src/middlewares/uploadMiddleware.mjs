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
    cb(null, uploadDir); // Save files in the `uploads/` folder temporarily
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
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

// Set file size limit (max 5MB per file)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
}).fields([
  { name: "license", maxCount: 1 },
  { name: "registration", maxCount: 1 },
  { name: "criminal", maxCount: 1 },
  { name: "personal", maxCount: 1 },
]);

export default upload;

