declare module "clamscan" {
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

  interface ScanBufferResult {
    isInfected: boolean;
    viruses: string[];
  }

  class NodeClam {
    init(options: NodeClamOptions): Promise<NodeClam>;
    scanBuffer(buffer: Buffer): Promise<ScanBufferResult>;
  }

  export default NodeClam;
}
