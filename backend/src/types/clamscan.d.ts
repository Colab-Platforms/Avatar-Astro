declare module "clamscan" {
  import type { Readable } from "node:stream";

  interface ClamdscanOptions {
    host?: string;
    port?: number;
    timeout?: number;
    localFallback?: boolean;
    socket?: string;
  }

  interface NodeClamOptions {
    removeInfected?: boolean;
    scanLog?: string | null;
    debugMode?: boolean;
    clamdscan?: ClamdscanOptions;
    preference?: "clamdscan" | "clamscan";
  }

  interface ScanStreamResult {
    isInfected: boolean;
    viruses: string[];
  }

  class NodeClam {
    init(options: NodeClamOptions): Promise<NodeClam>;
    /** The real clamscan API has no scanBuffer — a readable stream is the closest primitive to "scan this in-memory data". */
    scanStream(stream: Readable): Promise<ScanStreamResult>;
  }

  export default NodeClam;
}
