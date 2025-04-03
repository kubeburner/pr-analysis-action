const core = require('@actions/core');
const fs = require('fs').promises;
const OpenAI = require('openai');

// Get inputs from environment variables (set by action.yml)
const diffFile = process.env.INPUT_DIFF;
const apiKey = process.env.INPUT_API_KEY;

// Initialize OpenAI client
const client = new OpenAI({ apiKey });

async function analyzeDiff() {
  try {
    // Read diff from file
    const diffText = await fs.readFile(diffFile, 'utf8');

    // Check if diff is empty
    if (!diffText.trim()) {
      const analysis = "No differences found in this PR.";
      console.log(analysis);
      core.setOutput('analysis', analysis);
      return;
    }

    // Prompt for multi-file diff analysis
    const prompt = `
You are a Kubernetes app performance expert. Analyze the following JavaScript diff for a Node.js app, which may include changes across multiple files. The diff shows changes already applied in the PR (lines with "-" are removed, lines with "+" are added). Evaluate the impact of the new code state after the changes on the app's runtime performance (not the analysis process or prompt changes). For each file in the diff, provide:
- [Severity] Performance [risk/improvement] ([file]): [description of the runtime risk or improvement caused by the change]. Severity must be specified as High, Medium, or Low (e.g., [High] Performance improvement). High: significant impact (e.g., removing/adding large loops with 1e6+ iterations, heavy DB queries); Medium: moderate impact (e.g., small loops with 1e3-1e6 iterations, I/O operations); Low: minimal impact (e.g., logging, non-runtime changes like comments, prompt strings, or analysis logic). If a change removes a slow operation (e.g., a large loop), it is an improvement; if it adds one, it is a risk.
- K8s issue ([file]): [description of the Kubernetes issue, or "No concerns" if none apply, with a brief reason, e.g., "No concerns—reduced CPU usage improves pod scaling"]. Consider CPU/memory usage, scaling, and resource limits. For CPU-intensive changes (e.g., adding large loops), highlight risks like exceeding pod CPU limits, delaying pod scaling, or causing pod evictions if resource limits are set.
- Suggestion ([file]): [specific improvement or validation for the new code state, e.g., "Replace the $where loop with an indexed query on userId to eliminate the performance bottleneck", "Add an index on userId in the MongoDB collection to optimize query performance", "Test with diverse inputs to ensure stability", "Add error handling for DB queries to handle failures"].

Use concise single-line bullet points starting with "-". Analyze every file in the diff, even if the impact is minimal; say "No concerns" for a file only if there are no runtime impacts. Always specify the file in parentheses (e.g., route.js).
Diff:\n${diffText}
    `;

    // Call ChatGPT API
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.5,
      top_p: 0.85,
    });

    // Combine diff and analysis
    let analysis = `Generated Diff:\n${diffText}\n\nAnalysis:\n${response.choices[0].message.content}`;

    // Sanitize the analysis string for JavaScript
    analysis = analysis
      .replace(/`/g, '\\`')  // Escape backticks
      .replace(/\n/g, '\\n')  // Escape newlines
      .replace(/"/g, '\\"')   // Escape double quotes
      .replace(/\$/g, '\\$'); // Escape dollar signs to prevent template literal interpolation

    console.log(analysis);
    core.setOutput('analysis', analysis);
  } catch (error) {
    core.setFailed(`Error: ${error.message}`);
  }
}

// Run it
analyzeDiff();