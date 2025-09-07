import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class MinIOService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'dreamlity';

    this.s3Client = new S3Client({
      region: 'us-east-1', // MinIO doesn't require a specific region
      endpoint: process.env.MINIO_ENDPOINT || 'https://apis3.aurelonlabs.com',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY_ID || 'panhama',
        secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY || 'Iloveyoujesus1!GOD',
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  /**
   * Upload a file buffer to MinIO
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    folder: string = 'generated'
  ): Promise<string> {
    const key = `${folder}/${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      // Generate a presigned URL for public access (valid for 7 days - MinIO limit)
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: 7 * 24 * 60 * 60, // 7 days (Max for MinIO)
      });

      console.log(`✓ File uploaded to MinIO: ${key}`);

      return signedUrl;
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new Error(`Failed to upload file to MinIO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Delete a file from MinIO
   */
  async deleteFile(fileName: string, folder: string = 'generated'): Promise<void> {
    const key = `${folder}/${fileName}`;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`✓ File deleted from MinIO: ${key}`);
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw new Error(`Failed to delete file from MinIO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get public URL for a file (using presigned URL)
   */
  async getPublicUrl(fileName: string, folder: string = 'generated'): Promise<string> {
    const key = `${folder}/${fileName}`;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 7 * 24 * 60 * 60, // 7 days (Max for MinIO)
      });

      return signedUrl;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const minIOService = new MinIOService();
