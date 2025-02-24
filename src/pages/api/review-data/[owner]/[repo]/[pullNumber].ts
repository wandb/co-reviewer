import { NextApiRequest, NextApiResponse } from "next";
import { GitHubService } from "@/services/github";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { owner, repo, pullNumber } = req.query;

  if (
    !owner ||
    !repo ||
    !pullNumber ||
    Array.isArray(owner) ||
    Array.isArray(repo) ||
    Array.isArray(pullNumber)
  ) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  try {
    const githubService = new GitHubService(
      owner,
      repo,
      parseInt(pullNumber, 10)
    );

    const [files, reviews, codeOwners] = await Promise.all([
      githubService.getChangedFiles(),
      githubService.getReviews(),
      githubService.getCodeOwners(),
    ]);

    const aggregatedData = files.map((file) => {
      // Find code owners for this file
      const fileOwners = codeOwners
        .filter((owner) => owner.files.includes(file.filename))
        .map((owner) => owner.username);

      // Find reviews that mention this file
      const fileReviews = reviews.filter((review) =>
        review.comments.some((comment) => comment.path === file.filename)
      );

      // Determine if file is reviewed
      const isReviewed = fileReviews.some(
        (review) => review.state === "APPROVED"
      );

      return {
        file,
        codeOwners: fileOwners,
        reviews: fileReviews,
        isReviewed,
      };
    });

    return res.status(200).json(aggregatedData);
  } catch (error) {
    console.error("Error processing review data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
