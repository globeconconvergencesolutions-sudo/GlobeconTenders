import { v2 as cloudinary } from "cloudinary";

import { loadEnv } from "@/lib/env";
import {
  CLOUDINARY_UPLOAD_PRESET,
  getSourceDocumentFolder,
} from "@/lib/cloudinary/config";

let configured = false;

export function getCloudinary() {
  loadEnv();
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export function isCloudinaryConfigured(): boolean {
  loadEnv();
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export type UploadedDocument = {
  publicId: string;
  secureUrl: string;
  folder: string;
  displayName: string;
  bytes: number;
  format: string | null;
};

export async function uploadSourceDocument(
  fileBuffer: Buffer,
  fileName: string,
  sourceSlug: string,
): Promise<UploadedDocument> {
  const client = getCloudinary();
  const folder = getSourceDocumentFolder(sourceSlug);
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
        public_id: baseName,
        resource_type: "auto",
        overwrite: false,
        unique_filename: true,
        use_filename: true,
        display_name: fileName,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          folder,
          displayName: result.display_name ?? fileName,
          bytes: result.bytes,
          format: result.format ?? null,
        });
      },
    );
    stream.end(fileBuffer);
  });
}

export { CLOUDINARY_FOLDERS, getSourceDocumentFolder } from "@/lib/cloudinary/config";
