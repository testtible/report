export type PreviousReport = {
  content: string;
  date: string;
};

export type ReportFetchResponse = {
  content?: string;
  exists?: boolean;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  previousReport?: PreviousReport | null;
  masterComment?: string | null;
  error?: string;
};

export type ReportSubmitResponse = {
  ok?: boolean;
  id?: string;
  updated?: boolean;
  error?: string;
};
