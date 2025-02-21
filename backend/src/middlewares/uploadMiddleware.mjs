import multer from "multer";
import path from "path";
import fs from "fs";
import logger from "../utils/logger.mjs";

// Set up multer to store files in memory instead of disk
const storage = multer.memoryStorage(); // Stores files in memory buffer

// File validation - Only allow image and PDF files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
  const ext = file.originalname.toLowerCase().split(".").pop();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    logger.warn("Rejected file upload: %s", file.originalname);
    cb(new Error("Only .jpg, .jpeg, .png, and .pdf files are allowed"));
  }
};

// Set file size limit (max 5MB per file)
const upload = multer({
  storage: storage, // Store files in memory
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
}).fields([
  { name: "license", maxCount: 1 },
  { name: "registration", maxCount: 1 },
  { name: "criminal", maxCount: 1 },
  { name: "personal", maxCount: 1 },
]);

export default upload;
