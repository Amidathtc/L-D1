declare module "streamifier" {
  import { Readable } from "stream";

  function createReadStream(
    buffer: Buffer,
    options?: {
      highWaterMark?: number;
      encoding?: string;
    }
  ): Readable;

  export = createReadStream;
}
