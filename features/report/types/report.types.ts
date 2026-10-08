export type UserItem = {
  id: string;
  name: string;
  teamId?: number | null;
};

export type DivisionItem = {
  id: string;
  name: string;
  createdAt: string;
};

export type DepartmentItem = {
  id: string;
  name: string;
  divisionId: number | null;
  createdAt: string;
};

export type TeamItem = {
  id: string;
  name: string;
  departmentId: number | null;
  createdAt: string;
};

export type UserOrgItem = {
  id: string;
  name: string;
  teamId: number | null;
  teamName?: string;
  departmentId?: number | null;
  departmentName?: string;
  divisionId?: number | null;
  divisionName?: string;
};

export type OrgTeamNode = {
  id: string;
  name: string;
  departmentId: number | null;
  users: { id: string; name: string; teamId: number | null }[];
};

export type OrgDepartmentNode = {
  id: string;
  name: string;
  divisionId: number | null;
  teams: OrgTeamNode[];
};

export type OrgDivisionNode = {
  id: string;
  name: string;
  departments: OrgDepartmentNode[];
};

export type OrganizationResponse = {
  divisions: DivisionItem[];
  departments: DepartmentItem[];
  teams: TeamItem[];
  users: UserOrgItem[];
  hierarchy: OrgDivisionNode[];
  unassignedUsers: UserOrgItem[];
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
  teamId?: number | null;
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
