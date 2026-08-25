import { v2 as cloudinary } from "cloudinary";

import { loadEnv } from "@/lib/env";
import {
  CLOUDINARY_UPLOAD_PRESET,
  getBrandingFolder,
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

export type UploadedBrandingImage = {
  publicId: string;
  secureUrl: string;
  folder: string;
  bytes: number;
  format: string | null;
  width: number | null;
  height: number | null;
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

export async function uploadBrandingImage(
  fileBuffer: Buffer,
  fileName: string,
  orgSlug: string,
  kind: "logo" | "cover",
): Promise<UploadedBrandingImage> {
  const client = getCloudinary();
  const folder = getBrandingFolder(orgSlug);
  const stamp = Date.now();

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
        public_id: `${kind}-${stamp}`,
        resource_type: "image",
        overwrite: true,
        unique_filename: false,
        use_filename: false,
        display_name: fileName,
        transformation:
          kind === "logo"
            ? [{ width: 512, height: 512, crop: "limit", quality: "auto" }]
            : [{ width: 1920, height: 1080, crop: "limit", quality: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary branding upload failed"));
          return;
        }
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          folder,
          bytes: result.bytes,
          format: result.format ?? null,
          width: result.width ?? null,
          height: result.height ?? null,
        });
      },
    );
    stream.end(fileBuffer);
  });
}

/** Best-effort delete; never throws to callers — logs and returns false. */
export async function deleteCloudinaryImage(
  publicId: string | null | undefined,
): Promise<boolean> {
  if (!publicId?.trim() || !isCloudinaryConfigured()) return false;
  try {
    const client = getCloudinary();
    const result = await client.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
    return result?.result === "ok" || result?.result === "not found";
  } catch (error) {
    console.error("[cloudinary] failed to delete branding asset", {
      publicId,
      error,
    });
    return false;
  }
}

export {
  CLOUDINARY_FOLDERS,
  getBrandingFolder,
  getSourceDocumentFolder,
} from "@/lib/cloudinary/config";
