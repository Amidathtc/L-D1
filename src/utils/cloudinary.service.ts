import { v2 as cloudinary } from "cloudinary";
import { config } from "../config/env";
import streamifier from "streamifier";

// Configure Cloudinary
if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  console.log("✅ Cloudinary configured and enabled");
} else {
  console.warn("⚠️ Cloudinary not configured - uploads will use local storage");
}

export class CloudinaryService {
  /**
   * Upload a file/image to Cloudinary
   * @param fileBuffer - Buffer of the file to upload
   * @param fileName - Name of the file
   * @param folder - Cloudinary folder path (e.g., 'documents/customer')
   * @param resourceType - Type of resource: 'auto', 'image', 'video', 'raw'
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folder: string = "uploads",
    resourceType: "auto" | "image" | "video" | "raw" = "auto"
  ): Promise<{ url: string; publicId: string; secureUrl: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          resource_type: resourceType,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve({
              url: result?.url || "",
              publicId: result?.public_id || "",
              secureUrl: result?.secure_url || "",
            });
          }
        }
      );

      // Stream the file to Cloudinary
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * Upload an image and generate transformations
   */
  static async uploadImage(
    fileBuffer: Buffer,
    fileName: string,
    folder: string = "uploads/images"
  ): Promise<{
    url: string;
    publicId: string;
    secureUrl: string;
    thumbnailUrl: string;
  }> {
    const result = await this.uploadFile(fileBuffer, fileName, folder, "image");

    // Generate thumbnail URL
    const thumbnailUrl = cloudinary.url(result.publicId, {
      width: 150,
      height: 150,
      crop: "fill",
      quality: "auto",
    });

    return {
      ...result,
      thumbnailUrl,
    };
  }

  /**
   * Upload a document (PDF, Word, etc.)
   */
  static async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    folder: string = "uploads/documents"
  ): Promise<{ url: string; publicId: string; secureUrl: string }> {
    return this.uploadFile(fileBuffer, fileName, folder, "raw");
  }

  /**
   * Delete a file from Cloudinary
   */
  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      return false;
    }
  }

  /**
   * Generate a secure URL with transformations
   */
  static getTransformedUrl(
    publicId: string,
    options: Record<string, any> = {}
  ): string {
    return cloudinary.url(publicId, options);
  }

  /**
   * Check if Cloudinary is enabled
   */
  static isEnabled(): boolean {
    return config.cloudinary.enabled;
  }
}
