import { NextApiRequest, NextApiResponse } from "next";
import { GitHubService } from "@/services/github";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const githubService = new GitHubService();
    const pullRequests = await githubService.getPullRequestsToReview();
    return res.status(200).json(pullRequests);
  } catch (error) {
    console.error("Error fetching pull requests:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
