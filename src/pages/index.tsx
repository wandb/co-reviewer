import { useQuery } from "react-query";
import Link from "next/link";
import { PullRequest } from "@/types";
import axios from "axios";
import classNames from "classnames";

export default function Home() {
  const {
    data: pullRequests,
    isLoading,
    error,
  } = useQuery<PullRequest[]>("pullRequests", async () => {
    const response = await axios.get("/api/pull-requests");
    return response.data;
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error)
    return <div className="p-4 text-red-500">Error loading pull requests</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Pull Requests to Review
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {pullRequests?.map((pr) => (
              <li key={`${pr.owner}/${pr.repo}#${pr.number}`}>
                <Link
                  href={`/${pr.owner}/${pr.repo}/pull/${pr.number}`}
                  className="block hover:bg-gray-50"
                >
                  <div className="px-4 py-4 flex items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-500">
                          {pr.owner}/{pr.repo}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{pr.number}
                        </span>
                      </div>
                      <p className="mt-1 text-lg font-semibold text-gray-900 truncate">
                        {pr.title}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            Created by
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {pr.author}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={classNames(
                              "px-2 py-1 text-xs rounded-full",
                              pr.isDraft
                                ? "bg-gray-100 text-gray-800"
                                : "bg-green-100 text-green-800"
                            )}
                          >
                            {pr.isDraft ? "Draft" : "Ready for Review"}
                          </span>
                        </div>
                        {pr.reviewStatus && (
                          <span
                            className={classNames(
                              "px-2 py-1 text-xs rounded-full",
                              {
                                "bg-green-100 text-green-800":
                                  pr.reviewStatus === "APPROVED",
                                "bg-red-100 text-red-800":
                                  pr.reviewStatus === "CHANGES_REQUESTED",
                                "bg-yellow-100 text-yellow-800":
                                  pr.reviewStatus === "PENDING",
                              }
                            )}
                          >
                            {pr.reviewStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-6">
                      <span className="text-sm text-gray-500">
                        {pr.updatedAt
                          ? new Date(pr.updatedAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
