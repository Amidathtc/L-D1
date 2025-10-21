import multer from "multer";
import { CloudinaryService } from "./cloudinary.service";
import { config } from "../config/env";
import * as fs from "fs";
import * as path from "path";

// Memory storage for Cloudinary
const memoryStorage = multer.memoryStorage();

// Disk storage for local fallback (when Cloudinary is not available)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseDir =
      process.env.NODE_ENV === "production" ? "/var/data" : "uploads";
    const uploadDir = req.path.includes("customer")
      ? `${baseDir}/customer-documents`
      : `${baseDir}/loan-documents`;

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Determine which storage to use
const storage = config.cloudinary.enabled ? memoryStorage : diskStorage;

// File filter for documents
const documentFileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images, PDFs, and Word documents are allowed!"));
  }
};

// File filter for images only
const imageFileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF) are allowed!"));
  }
};

// Multer instances
export const uploadDocument = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: documentFileFilter,
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: imageFileFilter,
});

export const uploadMultiple = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: documentFileFilter,
});

/**
 * Helper function to handle file uploads to Cloudinary or local storage
 */
export async function handleFileUpload(
  file: Express.Multer.File,
  folder: string,
  resourceType: "auto" | "image" | "video" | "raw" = "auto"
): Promise<{
  url: string;
  publicId?: string;
  localPath?: string;
  provider: "cloudinary" | "local";
}> {
  try {
    if (config.cloudinary.enabled && file.buffer) {
      // Upload to Cloudinary
      const result = await CloudinaryService.uploadFile(
        file.buffer,
        file.originalname,
        folder,
        resourceType
      );
      return {
        url: result.secureUrl,
        publicId: result.publicId,
        provider: "cloudinary",
      };
    } else {
      // Local storage fallback
      return {
        url: file.path || "",
        localPath: file.path,
        provider: "local",
      };
    }
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
}

/**
 * Helper function to handle image uploads with optimization
 */
export async function handleImageUpload(
  file: Express.Multer.File,
  folder: string = "uploads/images"
): Promise<{
  url: string;
  thumbnailUrl?: string;
  publicId?: string;
  localPath?: string;
  provider: "cloudinary" | "local";
}> {
  try {
    if (config.cloudinary.enabled && file.buffer) {
      // Upload to Cloudinary with image optimization
      const result = await CloudinaryService.uploadImage(
        file.buffer,
        file.originalname,
        folder
      );
      return {
        url: result.secureUrl,
        thumbnailUrl: result.thumbnailUrl,
        publicId: result.publicId,
        provider: "cloudinary",
      };
    } else {
      // Local storage fallback
      return {
        url: file.path || "",
        localPath: file.path,
        provider: "local",
      };
    }
  } catch (error) {
    console.error("Image upload error:", error);
    throw error;
  }
}

/**
 * Helper function to handle document uploads
 */
export async function handleDocumentUpload(
  file: Express.Multer.File,
  folder: string = "uploads/documents"
): Promise<{
  url: string;
  publicId?: string;
  localPath?: string;
  provider: "cloudinary" | "local";
}> {
  try {
    if (config.cloudinary.enabled && file.buffer) {
      // Upload to Cloudinary
      const result = await CloudinaryService.uploadDocument(
        file.buffer,
        file.originalname,
        folder
      );
      return {
        url: result.secureUrl,
        publicId: result.publicId,
        provider: "cloudinary",
      };
    } else {
      // Local storage fallback
      return {
        url: file.path || "",
        localPath: file.path,
        provider: "local",
      };
    }
  } catch (error) {
    console.error("Document upload error:", error);
    throw error;
  }
}
