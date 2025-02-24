import { useEffect } from "react";
import { useQuery } from "react-query";
import { Editor } from "@monaco-editor/react";
import { AggregatedFileData } from "@/types";
import { useRouter } from "next/router";
import axios from "axios";
import classNames from "classnames";

type ReviewStatus = "all" | "reviewed" | "unreviewed";
type OwnershipFilter = "all" | "exclusive";
type FilterUpdates = {
  selectedOwner?: string;
  reviewStatus?: ReviewStatus;
  ownershipFilter?: OwnershipFilter;
};

export default function PullRequestDetails() {
  const router = useRouter();
  const {
    owner,
    repo,
    pullNumber,
    selectedOwner,
    reviewStatus,
    ownershipFilter,
  } = router.query;

  const {
    data: reviewData,
    isLoading,
    error,
  } = useQuery<AggregatedFileData[]>(
    ["reviewData", owner, repo, pullNumber],
    async () => {
      const response = await axios.get(
        `/api/review-data/${owner}/${repo}/${pullNumber}`
      );
      return response.data;
    },
    {
      enabled: !!owner && !!repo && !!pullNumber,
    }
  );

  const uniqueOwners = Array.from(
    new Set(reviewData?.flatMap((data) => data.codeOwners) || [])
  );

  // Update URL when filters change
  const updateFilters = (updates: FilterUpdates) => {
    const newQuery = {
      ...router.query,
      ...updates,
    };

    // Remove empty filters from URL
    Object.keys(updates).forEach((key) => {
      const k = key as keyof FilterUpdates;
      if (!updates[k]) {
        delete newQuery[k];
      }
    });

    router.push(
      {
        pathname: router.pathname,
        query: newQuery,
      },
      undefined,
      { shallow: true }
    );
  };

  // Set initial filter values from URL or defaults
  useEffect(() => {
    const updates: FilterUpdates = {};
    let hasUpdates = false;

    if (!reviewStatus && router.isReady) {
      updates.reviewStatus = "all";
      hasUpdates = true;
    }
    if (!ownershipFilter && router.isReady) {
      updates.ownershipFilter = "all";
      hasUpdates = true;
    }

    if (hasUpdates) {
      updateFilters(updates);
    }
  }, [router.isReady, reviewStatus, ownershipFilter]);

  const filteredFiles = reviewData?.filter((data) => {
    const matchesOwner =
      !selectedOwner ||
      (ownershipFilter === "exclusive"
        ? data.codeOwners.length === 1 && data.codeOwners[0] === selectedOwner
        : data.codeOwners.includes(selectedOwner as string));

    const matchesStatus =
      reviewStatus === "all" ||
      (reviewStatus === "reviewed" && data.isReviewed) ||
      (reviewStatus === "unreviewed" && !data.isReviewed);

    return matchesOwner && matchesStatus;
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error)
    return <div className="p-4 text-red-500">Error loading review data</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {owner}/{repo}#{pullNumber}
            </h1>
            <a
              href={`https://github.com/${owner}/${repo}/pull/${pullNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex space-x-4 mb-6">
          <select
            value={selectedOwner || ""}
            onChange={(e) => updateFilters({ selectedOwner: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Code Owners</option>
            {uniqueOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>

          <select
            value={(ownershipFilter as OwnershipFilter) || "all"}
            onChange={(e) =>
              updateFilters({
                ownershipFilter: e.target.value as OwnershipFilter,
              })
            }
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            disabled={!selectedOwner}
          >
            <option value="all">All Files</option>
            <option value="exclusive">Exclusively Owned Files</option>
          </select>

          <select
            value={(reviewStatus as ReviewStatus) || "all"}
            onChange={(e) =>
              updateFilters({ reviewStatus: e.target.value as ReviewStatus })
            }
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Review Status</option>
            <option value="reviewed">Reviewed</option>
            <option value="unreviewed">Unreviewed</option>
          </select>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredFiles?.map((data) => (
              <li key={data.file.filename} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {data.file.filename}
                    </h3>
                    <div className="mt-1 flex items-center space-x-2">
                      <span
                        className={classNames(
                          "px-2 py-1 text-sm rounded-full",
                          data.isReviewed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        )}
                      >
                        {data.isReviewed ? "Reviewed" : "Needs Review"}
                      </span>
                      <span className="text-sm text-gray-500">
                        Code Owners: {data.codeOwners.join(", ")}
                      </span>
                      {data.codeOwners.length === 1 && (
                        <span className="px-2 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                          Exclusive Owner
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {data.file.patch && (
                  <div className="mt-4 border rounded-md overflow-hidden">
                    <Editor
                      height="200px"
                      defaultValue={data.file.patch}
                      language="diff"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
