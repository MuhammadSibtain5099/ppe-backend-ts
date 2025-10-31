import { Storage } from '@google-cloud/storage';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fs from 'fs';
import path from 'path';

// Your bucket name
const bucketName = 'toolbox_meeting';
const folderName = 'ppe-images';

// Secret name in Google Secret Manager
const secretName = 'gcp-service-account'; // the name you used when creating the secret

// Temp path for writing key
const keyPath = '/tmp/gc-key.json';

/**
 * Load service account key from Secret Manager
 */
async function loadServiceAccountKey() {
  const client = new SecretManagerServiceClient();

  // Access the latest version of the secret
  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`,
  });

  // Decode and write to file
  const payload = version.payload?.data?.toString();
  if (!payload) throw new Error('No secret payload found');

  fs.writeFileSync(keyPath, payload);
  return keyPath;
}

/**
 * Uploads a file buffer to GCS and returns its public URL
 */
export async function uploadToGCS(file: Express.Multer.File, folder = folderName) {
  if (!file) throw new Error('No file provided');

  // Load credentials dynamically from Secret Manager
  const keyFilename = await loadServiceAccountKey();

  const storage = new Storage({ keyFilename });
  const bucket = storage.bucket(bucketName);

  const fileName = `${folder}/${Date.now()}_${file.originalname}`;
  const blob = bucket.file(fileName);

  await blob.save(file.buffer, {
    resumable: false,
    contentType: file.mimetype,
    metadata: { cacheControl: 'public, max-age=31536000' },
  });

  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}
