# Co-Reviewer

Co-reviewer is a tool that helps code owners review changes in pull requests efficiently. It provides a clear view of which changes need review and which have already been approved.

## Features

- View changed files in a pull request with side-by-side diff view
- Filter files by code owner
- Filter files by review status (reviewed/unreviewed)
- See code ownership information for each file
- Track review status across files

## Prerequisites

- Node.js 16.x or later
- pnpm
- A GitHub personal access token with repo scope

## Setup

1. Clone the repository and navigate to the co-reviewer directory:

```bash
cd core/tools/co-reviewer
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Edit the `.env` file with your GitHub configuration:

```
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=your_org_or_username
GITHUB_REPO=your_repository_name
GITHUB_PR_NUMBER=your_pr_number
```

## Development

To start the development server:

```bash
pnpm run dev
```

The application will be available at http://localhost:3000.

## How It Works

1. The tool uses the GitHub API to fetch:

   - Changed files in the PR
   - Code owners for each file
   - Review status for each file

2. It aggregates this information to show:

   - Which files need review from which code owners
   - Current review status of each file
   - Diff view of the changes

3. Code owners can filter the view to:
   - See only files they need to review
   - Focus on unreviewed changes
   - Track their review progress

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
