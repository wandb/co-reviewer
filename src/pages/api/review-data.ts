import { NextApiRequest, NextApiResponse } from "next";
import { GitHubService } from "@/services/github";
import { AggregatedFileData } from "@/types";
import minimatch from "minimatch";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const githubService = new GitHubService();

    const [files, reviews, codeOwners] = await Promise.all([
      githubService.getChangedFiles(),
      githubService.getReviews(),
      githubService.getCodeOwners(),
    ]);

    console.log("codeOwners", codeOwners);

    const aggregatedData: AggregatedFileData[] = files.map((file) => {
      // Find code owners for this file
      const fileOwners = codeOwners
        .filter((owner) =>
          owner.files.some((pattern) => minimatch(file.filename, pattern))
        )
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
