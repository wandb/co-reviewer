import { Octokit } from "@octokit/rest";
import { FileChange, Review, CodeOwner, PullRequest } from "@/types";
import { parse, matchPattern, CodeOwnersEntry } from "codeowners-utils";
import ignore from "ignore";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export class GitHubService {
  constructor(
    private owner?: string,
    private repo?: string,
    private prNumber?: number
  ) {}

  async getPullRequestsToReview(): Promise<PullRequest[]> {
    try {
      // Get the authenticated user
      const { data: user } = await octokit.users.getAuthenticated();

      // Get all pull requests where the user is a reviewer
      const { data: pullRequests } = await octokit.search.issuesAndPullRequests(
        {
          q: `is:open is:pr review-requested:${user.login}`,
          sort: "updated",
          order: "desc",
        }
      );

      return Promise.all(
        pullRequests.items.map(async (item) => {
          // Extract owner and repo from the repository_url
          const [owner, repo] = item.repository_url.split("/").slice(-2);

          // Get the full PR data to get draft status
          const { data: prData } = await octokit.pulls.get({
            owner,
            repo,
            pull_number: item.number,
          });

          // Get the user's review status for this PR
          const { data: reviews } = await octokit.pulls.listReviews({
            owner,
            repo,
            pull_number: item.number,
          });

          const userReview = reviews
            .filter((review) => review.user?.login === user.login)
            .sort(
              (a, b) =>
                new Date(b.submitted_at || "").getTime() -
                new Date(a.submitted_at || "").getTime()
            )[0];

          return {
            owner,
            repo,
            number: item.number,
            title: item.title,
            author: item.user?.login || "",
            isDraft: Boolean(prData.draft),
            reviewStatus: userReview?.state as PullRequest["reviewStatus"],
            updatedAt: item.updated_at,
          };
        })
      );
    } catch (error) {
      console.error("Error fetching pull requests:", error);
      return [];
    }
  }

  async getChangedFiles(): Promise<FileChange[]> {
    if (!this.owner || !this.repo || !this.prNumber) {
      throw new Error("Owner, repo, and PR number are required");
    }

    const { data } = await octokit.pulls.listFiles({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
    });

    return data.map((file) => ({
      filename: file.filename,
      status: file.status as "added" | "modified" | "removed",
      patch: file.patch,
      previous_filename: file.previous_filename,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    }));
  }

  async getReviews(): Promise<Review[]> {
    if (!this.owner || !this.repo || !this.prNumber) {
      throw new Error("Owner, repo, and PR number are required");
    }

    const { data } = await octokit.pulls.listReviews({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
    });

    return data.map((review) => ({
      id: review.id,
      user: {
        login: review.user?.login || "",
      },
      state: review.state as Review["state"],
      submittedAt: review.submitted_at || "",
      comments: [],
    }));
  }

  async getCodeOwners(): Promise<CodeOwner[]> {
    if (!this.owner || !this.repo || !this.prNumber) {
      throw new Error("Owner, repo, and PR number are required");
    }

    try {
      // Get the CODEOWNERS file content
      const { data } = await octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: ".github/CODEOWNERS",
      });

      if (!("content" in data)) {
        throw new Error("CODEOWNERS file not found");
      }

      const content = Buffer.from(data.content, "base64").toString();
      const ownerMap = new Map<string, Set<string>>();
      const fileOwnersMap = new Map<string, Set<string>>();

      // Get all changed files
      const { data: files } = await octokit.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
      });

      // Parse CODEOWNERS file
      const entries = parse(content);

      // For each file, find its owners by checking each entry
      files.forEach((file) => {
        // Initialize the set of owners for this file
        fileOwnersMap.set(file.filename, new Set());

        // Entries are in reverse order, so the last matching pattern takes precedence
        for (const entry of entries) {
          const pattern = entry.pattern.startsWith("/")
            ? entry.pattern.slice(1)
            : entry.pattern;
          if (matchPattern(file.filename, pattern)) {
            entry.owners.forEach((owner: string) => {
              // Remove @ from owner name if present
              const username = owner.replace(/^@/, "");

              // Add to owner -> files mapping
              if (!ownerMap.has(username)) {
                ownerMap.set(username, new Set());
              }
              ownerMap.get(username)?.add(file.filename);

              // Add to file -> owners mapping
              fileOwnersMap.get(file.filename)?.add(username);
            });
            break; // Stop after first match since we're going in reverse order
          }
        }
      });

      // Convert the maps to the return format, including exclusive ownership information
      return Array.from(ownerMap.entries()).map(([username, files]) => {
        const exclusiveFiles = Array.from(files).filter((file) => {
          const fileOwners = fileOwnersMap.get(file);
          return fileOwners?.size === 1 && fileOwners.has(username);
        });

        return {
          username,
          files: Array.from(files),
          exclusiveFiles,
        };
      });
    } catch (error) {
      console.error("Error fetching code owners:", error);
      return [];
    }
  }
}
