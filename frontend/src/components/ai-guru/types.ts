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
}
