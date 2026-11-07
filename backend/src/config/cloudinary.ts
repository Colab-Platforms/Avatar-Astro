import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const isCloudinaryConfigured = (): boolean =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

export interface UploadedAsset {
  url: string;
  publicId: string;
}

const assertConfigured = () => {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      "Image uploads are unavailable — Cloudinary is not configured on the server",
      STATUS_CODES.SERVER_ERROR,
    );
  }
};

/**
 * Turns a Cloudinary SDK error into something an admin can act on.
 *
 * On a 403 the SDK reports only "Server returned unexpected status code - 403"
 * and drops the `x-cld-error` header that says *why* — most often an API key
 * that was issued without the `create` permission. Naming that here saves
 * digging through Cloudinary's raw HTTP response to find it.
 */
const describeUploadError = (error: any): string => {
  const httpCode = error?.http_code ?? error?.error?.http_code;
  const detail = error?.message ?? error?.error?.message;

  if (httpCode === 403) {
    return (
      "Cloudinary rejected the upload (403). The configured API key is most " +
      "likely missing the 'create' permission — check Settings → API Keys in " +
      "the Cloudinary console."
    );
  }
  if (httpCode === 401) {
    return "Cloudinary rejected the credentials (401). Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.";
  }

  return detail ?? "Image upload to Cloudinary failed";
};

/**
 * Uploads a buffer to Cloudinary and returns the pieces we persist.
 * The stream API is used because multer keeps files in memory (no temp path).
 */
export const uploadImageBuffer = (
  buffer: Buffer,
  folder: string,
): Promise<UploadedAsset> => {
  assertConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          // The full object carries the request id Cloudinary support asks for.
          console.error("Cloudinary upload failed:", error);
          reject(
            new ApiError(
              describeUploadError(error),
              STATUS_CODES.BAD_REQUEST,
            ),
          );
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Same as uploadImageBuffer, but retries transient failures (network blips,
 * Cloudinary 5xx) up to `attempts` times with a short backoff before giving
 * up. Bad-credential (401/403) failures are not worth retrying, so those
 * fail fast on the first attempt.
 */
export const uploadImageBufferWithRetry = async (
  buffer: Buffer,
  folder: string,
  attempts = 3,
): Promise<UploadedAsset> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await uploadImageBuffer(buffer, folder);
    } catch (error) {
      lastError = error;
      const httpCode = (error as any)?.httpCode ?? (error as ApiError)?.statusCode;
      if (httpCode === STATUS_CODES.UNAUTHORIZED || httpCode === 403) break;
      if (attempt < attempts) {
        console.warn(`[cloudinary] upload attempt ${attempt} failed, retrying…`, error instanceof Error ? error.message : error);
        await sleep(300 * attempt);
      }
    }
  }
  throw lastError;
};

export interface UploadedAudio extends UploadedAsset {
  durationSeconds: number | null;
  bytes: number;
}

/**
 * Uploads an MP3 to Cloudinary. Audio is stored under resource_type "video". `publicId` is the full
 * versioned id (folder included) and `overwrite` is false, so an existing asset can never be replaced.
 */
export const uploadAudioBuffer = (buffer: Buffer, publicId: string): Promise<UploadedAudio> => {
  assertConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: "video", overwrite: false, unique_filename: false },
      (error, result) => {
        if (error || !result) {
          console.error("Cloudinary audio upload failed:", error?.message ?? error);
          reject(new ApiError(describeUploadError(error), STATUS_CODES.BAD_REQUEST));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          durationSeconds: typeof result.duration === "number" ? result.duration : null,
          bytes: typeof result.bytes === "number" ? result.bytes : buffer.length,
        });
      },
    );
    stream.end(buffer);
  });
};

/** Deletes an audio asset (resource_type "video", matching uploadAudioBuffer). */
export const deleteAudioByPublicId = async (publicId: string): Promise<boolean> => {
  assertConfigured();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "video",
    invalidate: true,
  });
  return result?.result === "ok" || result?.result === "not found";
};

/**
 * Deletes an asset. Resolves `false` (rather than throwing) when Cloudinary
 * reports anything other than success so callers can decide whether an
 * orphaned remote asset should block the database write.
 */
export const deleteImageByPublicId = async (
  publicId: string,
): Promise<boolean> => {
  assertConfigured();

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  // "not found" means the asset is already gone — the desired end state.
  return result?.result === "ok" || result?.result === "not found";
};

/**
 * Uploads a publicly downloadable document (e.g. a spiritual book PDF) to Cloudinary.
 * Unlike uploadPrivateDocumentBuffer, this is plain "upload" delivery (no "authenticated"
 * type, no signed URL needed) since these files are meant to be freely downloaded from
 * the public site. PDFs go through as resource_type "raw".
 *
 * `publicId` MUST include the real file extension (e.g. "...-172839.pdf"). Unlike
 * image/video resources, Cloudinary's "raw" delivery has no separate format field — the
 * extension has to be literally part of the public_id, or the asset is served with
 * Content-Type: application/octet-stream and no filename extension, which is why files
 * downloaded that way don't open (see getAttachmentUrl for the matching download path).
 */
export const uploadPublicDocumentBuffer = (
  buffer: Buffer,
  publicId: string,
): Promise<UploadedAsset> => {
  assertConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: "raw", overwrite: false, unique_filename: false },
      (error, result) => {
        if (error || !result) {
          console.error("Cloudinary public document upload failed:", error);
          reject(new ApiError(describeUploadError(error), STATUS_CODES.BAD_REQUEST));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};

/**
 * Builds a forced-download URL for a public asset, with a friendly filename instead of
 * Cloudinary's random public_id. `filename` must not contain a dot — Cloudinary appends
 * the asset's real extension itself (works for both "raw" and "video"/audio resources).
 * Without this, clicking a direct secure_url either streams inline (video/audio, no
 * Content-Disposition at all) or downloads with no extension (raw PDFs with a dotless
 * public_id), and in both cases the saved file doesn't open as what it actually is.
 */
export const getAttachmentUrl = (
  publicId: string,
  resourceType: "raw" | "video" | "image",
  filename: string,
): string => {
  assertConfigured();
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: "upload",
    flags: `attachment:${filename}`,
    secure: true,
  });
};

/**
 * Deletes a public raw document asset (e.g. a spiritual book PDF). Mirrors
 * deleteImageByPublicId but for resource_type "raw".
 */
export const deletePublicDocument = async (publicId: string): Promise<boolean> => {
  assertConfigured();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
    invalidate: true,
  });
  return result?.result === "ok" || result?.result === "not found";
};

export interface UploadedPrivateAsset {
  publicId: string;
  resourceType: "image" | "raw";
}

/**
 * Uploads a verification document (ID proof, certificate, ...) as a Cloudinary
 * "authenticated" asset — never delivered via a plain public secure_url. The caller
 * never receives a URL back; only an admin "view document" action generates one, and
 * only as a short-lived signed URL (see getSignedDocumentUrl). public_id is Cloudinary's
 * own random id (unique_filename, no user-supplied filename), so nothing guessable is
 * ever stored. PDFs go through as resource_type "raw"; images as "image".
 */
export const uploadPrivateDocumentBuffer = (
  buffer: Buffer,
  folder: string,
  mimeType: string,
): Promise<UploadedPrivateAsset> => {
  assertConfigured();
  const resourceType: "image" | "raw" = mimeType === "application/pdf" ? "raw" : "image";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, type: "authenticated", unique_filename: true, overwrite: false },
      (error, result) => {
        if (error || !result) {
          console.error("Cloudinary private document upload failed:", error);
          reject(new ApiError(describeUploadError(error), STATUS_CODES.BAD_REQUEST));
          return;
        }
        resolve({ publicId: result.public_id, resourceType });
      },
    );
    stream.end(buffer);
  });
};

/**
 * Short-lived signed URL for an admin to view a private document. Always goes through
 * sign_url so no derived/thumbnail access can bypass the "authenticated" delivery type —
 * never construct a bare cloudinary.url() for a document outside this helper.
 */
export const getSignedDocumentUrl = (
  publicId: string,
  resourceType: "image" | "raw",
  expirySeconds = 300,
): string => {
  assertConfigured();
  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;
  return cloudinary.url(publicId, {
    type: "authenticated",
    resource_type: resourceType,
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
  });
};

/** Deletes a private document asset. Mirrors deleteImageByPublicId but for authenticated/raw assets. */
export const deletePrivateDocument = async (
  publicId: string,
  resourceType: "image" | "raw",
): Promise<boolean> => {
  assertConfigured();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    invalidate: true,
  });
  return result?.result === "ok" || result?.result === "not found";
};

export default cloudinary;
