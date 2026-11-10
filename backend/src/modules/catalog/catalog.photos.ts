import { randomUUID } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { HttpError } from '../../utils/http-error.js';

declare global {
  namespace Express {
    interface Request {
      file?: { buffer: Buffer };
    }
  }
}

const photoDirectory = path.resolve(process.cwd(), 'uploads', 'catalog');
const maxPhotoBytes = 2 * 1024 * 1024;
const fileNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxPhotoBytes, files: 1 },
});

export const catalogPhotoUpload: RequestHandler = (request, response, next) => {
  upload.single('photo')(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (isOversizedPhoto(error)) {
      next(new HttpError(400, 'PHOTO_TOO_LARGE', 'La foto no puede pesar más de 2 MB.'));
      return;
    }
    next(new HttpError(400, 'PHOTO_INVALID', 'No se pudo recibir la foto.'));
  });
};

export async function saveCatalogPhoto(buffer: Buffer): Promise<string> {
  const extension = imageExtension(buffer);
  if (!extension) {
    throw new HttpError(400, 'PHOTO_INVALID', 'La foto debe ser JPG, PNG, WEBP o GIF.');
  }

  const fileName = `${randomUUID()}${extension}`;
  await mkdir(photoDirectory, { recursive: true });
  await writeFile(path.join(photoDirectory, fileName), buffer);
  return `/api/v1/catalog/media/${fileName}`;
}

export async function readCatalogPhoto(fileName: string): Promise<string | null> {
  if (!fileNamePattern.test(fileName)) return null;
  const filePath = path.join(photoDirectory, fileName);
  try {
    await access(filePath);
  } catch {
    return null;
  }
  return filePath;
}

function isOversizedPhoto(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'LIMIT_FILE_SIZE';
}

function imageExtension(buffer: Buffer): '.jpg' | '.png' | '.webp' | '.gif' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
  ) return '.png';
  const gif = buffer.length >= 6 ? buffer.subarray(0, 6).toString('ascii') : '';
  if (gif === 'GIF87a' || gif === 'GIF89a') return '.gif';
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return '.webp';
  return null;
}
