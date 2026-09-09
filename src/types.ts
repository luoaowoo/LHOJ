export type ThemeMode = 'light' | 'dark' | 'system';

export interface HydroUser {
  _id: number;
  uname: string;
  displayName?: string;
  mail?: string;
  role?: string;
  avatarUrl?: string;
  loginat?: string;
  regat?: string;
  rpInfo?: Record<string, unknown>;
}

export interface HydroFileInfo {
  _id: string;
  name: string;
  size?: number;
  lastModified?: string;
}

export interface HydroProblem {
  _id: string;
  domainId: string;
  docId: number;
  docType: number;
  pid?: string | null;
  title: string;
  content?: string;
  data?: HydroFileInfo[];
  additional_file?: HydroFileInfo[];
  nSubmit?: number;
  nAccept?: number;
  difficulty?: number;
  tag?: string[];
  hidden?: boolean;
}

export interface HydroContest {
  _id: string;
  domainId: string;
  docId: string;
  owner: number;
  beginAt: string;
  title: string;
  content: string;
  endAt: string;
  attend: number;
  pids: number[];
  rated: boolean;
  allowPrint?: boolean;
}

export interface ProblemRow {
  docId: number;
  pid: string;
  title: string;
  href: string;
  accepted: number;
  submitted: number;
  difficulty: string;
  tags: string[];
  status?: string;
}

export interface RecordRow {
  rid: string;
  status: string;
  statusCode?: number;
  score: string;
  problem: string;
  pid?: string;
  problemTitle?: string;
  problemHref?: string;
  submitter: string;
  time: string;
  memory: string;
  language: string;
  submittedAt: string;
}

export interface UnsolvedProblem {
  pid: string;
  title: string;
  href: string;
  status: string;
  attempts: number;
  lastAttemptAt: string;
}

export interface ContestRow {
  id: string;
  title: string;
  href: string;
  rule?: string;
  date?: string;
  duration?: string;
  attend?: string;
  rated?: boolean;
}

export interface ScoreboardRow {
  cells: string[];
}

export interface TrainingProblem {
  docId: number;
  pid: string;
  title: string;
  tried?: string;
  accepted?: string;
  difficulty?: string;
  status?: string;
}

export interface TrainingNode {
  id: number;
  title: string;
  requireNids: number[];
  pids: number[];
  status?: string;
  problems: TrainingProblem[];
}

export interface TrainingRow {
  id: string;
  title: string;
  description?: string;
  attend?: number;
  pin?: boolean;
  nodeCount: number;
  problemCount: number;
  done?: boolean;
  enrolled: boolean;
  doneNids: number[];
  donePids: number[];
}

export interface TrainingDetail extends TrainingRow {
  nodes: TrainingNode[];
}

export interface HomeworkProblem {
  docId: number;
  pid: string;
  title: string;
}

export interface HomeworkRow {
  id: string;
  title: string;
  description?: string;
  rule?: string;
  beginAt?: string;
  endAt?: string;
  attend?: number;
  problemCount: number;
  status: string;
  rated?: boolean;
}

export interface HomeworkDetail extends HomeworkRow {
  problems: HomeworkProblem[];
  attended: boolean;
}

export interface ProblemSolution {
  id: string;
  ownerId?: number;
  title?: string;
  content: string;
  author?: string;
  updatedAt?: string;
  vote: number;
  userVote: number;
  replies: Array<{ id: string; content: string; author?: string; ownerId?: number }>;
}

export interface ProblemSolutionsResult {
  items: ProblemSolution[];
  pageCount: number;
  total: number;
}

export interface ProblemStat {
  id: string;
  language: string;
  length?: string;
  time?: string;
  memory?: string;
  author?: string;
}

export interface ProblemFile {
  name: string;
  size?: string;
  href: string;
}

export interface DiscussionRow {
  id: string;
  title: string;
  parentId?: string;
  parentType?: number;
  replies: number;
  views: number;
  pinned: boolean;
  hidden: boolean;
  updatedAt?: string;
  author?: string;
  ownerId?: number;
}

export interface UserMessage {
  id: string;
  from: number;
  to: number[];
  content: string;
  flag: number;
  sentAt?: string;
  sender?: string;
}

export interface UserSession {
  id: string;
  isCurrent: boolean;
  updateAt?: string;
  createHost?: string;
  updateIp?: string;
  updateGeoip?: { display?: string };
  updateUaInfo?: { os?: { name?: string; version?: string }; browser?: { name?: string; version?: string } };
}

export interface HydroSetting {
  key: string;
  family: string;
  name: string;
  description?: string;
  type: string;
  value: unknown;
  currentValue: unknown;
  range?: Record<string, string> | Array<[string, string]>;
  hidden: boolean;
  disabled: boolean;
  secret: boolean;
}

export interface DiscussionReply {
  id: string;
  content: string;
  author?: string;
  ownerId?: number;
  replies?: DiscussionReply[];
}

export interface DiscussionDetail extends DiscussionRow {
  content: string;
  repliesDetail: DiscussionReply[];
  pageCount: number;
}

export interface RankingRow {
  rank: string;
  user: string;
  userHref?: string;
  rp: string;
  accept: string;
  bio: string;
}

export interface RecordDetail {
  rid: string;
  domainId?: string;
  status?: string;
  score?: string;
  progress?: string;
  problem?: string;
  problemHref?: string;
  submitter?: string;
  language?: string;
  code?: string;
  pid?: string;
  ownerId?: number;
  contestId?: string;
  hackable?: boolean;
  userAccepted?: boolean;
  revisions: Array<{ id: string; judgedAt: string }>;
  detail: Array<{ label: string; value: string }>;
  testCases?: Array<{ status: string; score?: string; time?: string; memory?: string; message?: string }>;
}
