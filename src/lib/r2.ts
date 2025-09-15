import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class R2Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'dreamlity';

    const endpoint = process.env.R2_ENDPOINT || 'https://17a8c52b97edd4cb929947402df1021a.r2.cloudflarestorage.com';
    
    this.s3Client = new S3Client({
      region: 'auto', // Cloudflare R2 uses 'auto' region
      endpoint: endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '92a0f0b9bfbe71c2bf50b1803f84b3e9',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'd5816df2cf17e3177a94987bbf5fba0967174c497485fc5b67639d3f8130864c',
      },
      // Cloudflare R2 uses virtual-hosted style URLs, no forcePathStyle needed
    });
  }

  /**
   * Upload a file buffer to Cloudflare R2
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    folder: string = 'generated'
  ): Promise<string> {
    const key = `${folder}/${fileName}`;

    try {
      console.log(`Uploading to R2: ${key}, size: ${buffer.length} bytes`);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      // Generate a presigned URL for public access (valid for 1 year)
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: 7 * 24 * 60 * 60, // 7 days (R2 maximum)
      });

      console.log(`✓ File uploaded to R2: ${key}`);

      return signedUrl;
    } catch (error) {
      console.error('Error uploading file to R2:', error);
      console.error('R2 Config:', {
        endpoint: process.env.R2_ENDPOINT,
        bucket: this.bucketName,
        key: key
      });
      throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Delete a file from Cloudflare R2
   */
  async deleteFile(fileName: string, folder: string = 'generated'): Promise<void> {
    const key = `${folder}/${fileName}`;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`✓ File deleted from R2: ${key}`);
    } catch (error) {
      console.error('Error deleting file from R2:', error);
      throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        expiresIn: 7 * 24 * 60 * 60, // 7 days (R2 maximum)
      });

      return signedUrl;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Regenerate presigned URLs for existing files
   */
  async regenerateUrls(urls: string[], folder: string = 'generated'): Promise<string[]> {
    const regeneratedUrls: string[] = [];

    for (const url of urls) {
      try {
        // Extract filename from the URL
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        if (fileName) {
          const newUrl = await this.getPublicUrl(fileName, folder);
          regeneratedUrls.push(newUrl);
        } else {
          // If we can't extract filename, keep the original URL
          regeneratedUrls.push(url);
        }
      } catch (error) {
        console.error('Error regenerating URL:', error);
        // Keep the original URL if regeneration fails
        regeneratedUrls.push(url);
      }
    }

    return regeneratedUrls;
  }
}

// Export a singleton instance
export const r2Service = new R2Service();
