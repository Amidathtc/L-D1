declare module "streamifier" {
  import { Readable } from "stream";

  const streamifier: {
    createReadStream(
      buffer: Buffer,
      options?: {
        highWaterMark?: number;
        encoding?: string;
      }
    ): Readable;
  };

  export default streamifier;
}
