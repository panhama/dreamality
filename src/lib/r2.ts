import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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
        // Extract filename from the URL, handling double-encoded URLs and query parameters
        let cleanUrl = url;
        try {
          // Try to decode if double-encoded
          cleanUrl = decodeURIComponent(url);
        } catch (e) {
          // If decoding fails, use original URL
          cleanUrl = url;
        }

        // Parse the URL to extract the pathname
        let pathname = '';
        try {
          const urlObj = new URL(cleanUrl);
          pathname = urlObj.pathname;
        } catch (e) {
          // If URL parsing fails, try the old method
          const urlParts = cleanUrl.split('/');
          pathname = '/' + urlParts[urlParts.length - 1].split('?')[0];
        }

        // Extract filename from pathname
        const pathParts = pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];

        if (fileName && fileName !== 'placeholder-image.svg' && !fileName.includes('aws4_request') && !fileName.includes('X-Amz-')) {
          // Check if file exists before generating URL
          const exists = await this.fileExists(fileName, folder);
          if (exists) {
            const newUrl = await this.getPublicUrl(fileName, folder);
            regeneratedUrls.push(newUrl);
          } else {
            console.warn(`File not found in R2: ${folder}/${fileName}, using placeholder`);
            regeneratedUrls.push('/placeholder-image.svg');
          }
        } else {
          // If we can't extract filename or it's already a placeholder, keep the original URL
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

  /**
   * Check if a file exists in R2
   */
  async fileExists(fileName: string, folder: string = 'generated'): Promise<boolean> {
    const key = `${folder}/${fileName}`;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      // Try to get object metadata (without downloading the file)
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      // If the error is 404, file doesn't exist
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      // For other errors (permissions, network, etc.), assume file exists to avoid false negatives
      console.warn('Error checking file existence:', error);
      return true;
    }
  }

  /**
   * List files in a folder (for debugging)
   */
  async listFiles(folder: string = 'generated', maxKeys: number = 100): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: folder === '' ? undefined : `${folder}/`,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);
      return (response.Contents || []).map(obj => obj.Key || '').filter(key => key);
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const r2Service = new R2Service();
