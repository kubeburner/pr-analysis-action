# pr-analysis-action

A GitHub Action that analyzes pull request (PR) diffs using ChatGPT to identify performance risks and Kubernetes-specific issues in a Node.js app. It provides actionable feedback on runtime performance impacts, potential Kubernetes deployment issues, and suggestions for improvement, directly as a comment on the PR.

## Features
- Analyzes JavaScript diffs for Node.js apps to identify performance risks or improvements.
- Evaluates Kubernetes-specific issues (e.g., CPU/memory usage, scaling, resource limits) when the code is containerized and deployed as a pod.
- Provides specific suggestions for optimizing the code or validating changes.
- Supports multi-file diffs, analyzing each file individually.
- Comments the analysis directly on the PR for easy review.

## Inputs
| Name       | Description                                      | Required | Default |
|------------|--------------------------------------------------|----------|---------|
| `diff`     | Path to the diff file (e.g., `diff.txt`) containing changes from the PR. | Yes      | N/A     |
| `api-key`  | OpenAI API key for ChatGPT.                      | Yes      | N/A     |

## Outputs
| Name       | Description                                      |
|------------|--------------------------------------------------|
| `analysis` | The ChatGPT analysis of the diffs, including performance risks, Kubernetes issues, and suggestions. |

## Requirements
- **OpenAI API Key**: You need an OpenAI API key to use ChatGPT. Sign up at [platform.openai.com](https://platform.openai.com) and generate a key.
- **Node.js**: The action uses Node.js 16 (handled automatically via `actions/setup-node`).
- **GitHub Token**: The workflow needs `issues: write` and `pull_requests: write` permissions to comment on PRs (set via `permissions` in the workflow).

## Usage
1. Add the action to your workflow by referencing the repository and version (e.g., `kubeburner/pr-analysis-action@v1.0.0`).
2. Provide the required inputs: `diff` (path to the diff file) and `api-key` (your OpenAI API key, stored as a secret).
3. The action will analyze the diff and output the results, which you can use to comment on the PR.

### Example Workflow
Below is an example workflow that generates a diff for all `.js` files in a PR, analyzes it with ChatGPT, and comments the results on the PR.

```yaml
name: Analyze PR Diff with ChatGPT

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  issues: write
  pull_requests: write

jobs:
  analyze-pr:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate diff for all changed files
        id: diff
        run: |
          BASE_SHA=${{ github.event.pull_request.base.sha }}
          HEAD_SHA=${{ github.event.pull_request.head.sha }}
          git diff $BASE_SHA $HEAD_SHA -- '*.js' > diff.txt

      - name: Analyze diff with ChatGPT
        id: chatgpt
        uses: kubeburner/pr-analysis-action@v1.0.0
        with:
          diff: diff.txt
          api-key: ${{ secrets.OPENAI_API_KEY }}

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            let analysis = `${{ steps.chatgpt.outputs.analysis }}`;
            analysis = analysis.replace(/\\n/g, '\n');
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `**ChatGPT PR Analysis**\n\n${analysis}`
            });