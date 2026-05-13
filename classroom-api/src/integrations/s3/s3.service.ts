import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env.js";
import { AppError } from "../../common/errors/AppError.js";

/** Generates time-limited read URLs for private recording objects. */
export class S3Service {
  private client: S3Client | null = null;

  private getClient(): S3Client {
    if (!env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      throw new AppError(
        503,
        "Object storage is not configured",
        "S3_NOT_CONFIGURED"
      );
    }
    if (!this.client) {
      this.client = new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }
    return this.client;
  }

  async getSignedReadUrl(key: string): Promise<string> {
    if (!env.AWS_S3_BUCKET) {
      throw new AppError(503, "S3 bucket not configured", "S3_BUCKET_MISSING");
    }
    const cmd = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key });
    return getSignedUrl(this.getClient(), cmd, { expiresIn: env.SIGNED_URL_TTL_SECONDS });
  }
}
