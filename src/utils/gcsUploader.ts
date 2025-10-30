import { Storage } from '@google-cloud/storage';
import path from 'path';

const bucketName = 'toolbox_meeting';
const storage = new Storage({
 // keyFilename: path.join(__dirname, './test-file.json'),
});
const bucket = storage.bucket(bucketName);

/**
 * Uploads a file buffer to GCS and returns its public URL
 */
export async function uploadToGCS(file: Express.Multer.File, folder = 'ppe-images') {
  if (!file) throw new Error('No file provided');

  const fileName = `${folder}/${Date.now()}_${file.originalname}`;
  const blob = bucket.file(fileName);

  await blob.save(file.buffer, {
    resumable: false,
    contentType: file.mimetype,
    metadata: { cacheControl: 'public, max-age=31536000' }
  });

  

  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}


