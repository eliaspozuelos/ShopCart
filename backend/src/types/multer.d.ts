declare module 'multer' {
  import type { RequestHandler } from 'express';

  interface MulterInstance {
    single(fieldName: string): RequestHandler;
  }

  interface Multer {
    (options?: {
      storage?: unknown;
      limits?: { fileSize?: number; files?: number };
    }): MulterInstance;
    memoryStorage(): unknown;
  }

  const multer: Multer;
  export default multer;
}
