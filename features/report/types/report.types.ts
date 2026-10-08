export type UserItem = {
  id: string;
  name: string;
};

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
  isConfirmMasterComment?: boolean;
  userId?: string | null;
  reportId?: string | null;
  userComment?: string | null;
  isUserComment?: boolean;
  error?: string;
};

export type ReportSubmitResponse = {
  ok?: boolean;
  id?: string;
  updated?: boolean;
  error?: string;
};

export type UnreadMasterCommentItem = {
  id: string;
  username: string;
  date: string;
  masterComment: string;
  isConfirmMasterComment: boolean;
  userComment?: string | null;
  isUserComment?: boolean;
};

export type UnreadUserCommentItem = {
  id: string;
  username: string;
  date: string;
  reportContent: string;
  userComment: string;
  masterComment: string | null;
  isConfirmMasterComment: boolean;
  isUserComment: boolean;
};
