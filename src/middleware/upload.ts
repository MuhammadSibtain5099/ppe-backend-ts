import multer from 'multer';

export const upload = multer({
  storage: multer.memoryStorage(), // keep file in memory
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});
