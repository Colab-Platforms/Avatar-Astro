export interface GuruReply {
  type?: string;
  message?: string;
  guidance?: string;
  progress?: number;
  readyForDiagnosis?: boolean;
}

export interface GuruMessage {
  role: "user" | "guru";
  content: string | GuruReply;
  /** Set on a failed request so the UI can offer a retry instead of a normal reply. */
  error?: boolean;
  retryText?: string;
}
