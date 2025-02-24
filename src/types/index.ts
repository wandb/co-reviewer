export interface FileChange {
  filename: string;
  status: "added" | "modified" | "removed";
  patch?: string;
  previous_filename?: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface CodeOwner {
  username: string;
  files: string[];
  exclusiveFiles: string[];
}

export interface Review {
  id: number;
  user: {
    login: string;
  };
  state:
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "COMMENTED"
    | "DISMISSED"
    | "PENDING";
  submittedAt: string;
  comments: ReviewComment[];
}

export interface ReviewComment {
  path: string;
  position: number;
  body: string;
}

export interface AggregatedFileData {
  file: FileChange;
  codeOwners: string[];
  reviews: Review[];
  isReviewed: boolean;
}

export interface PullRequest {
  owner: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  isDraft: boolean;
  reviewStatus?: "APPROVED" | "CHANGES_REQUESTED" | "PENDING";
  updatedAt: string;
}
