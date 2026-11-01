// Pure helpers for the My PRs panel: the GraphQL query and response parsing.
// No Herdr imports, so `node --test` can load this file.

export const QUERY = `query($mine: String!, $review: String!) {
  mine: search(query: $mine, type: ISSUE, first: 50) { nodes { ...pr } }
  review: search(query: $review, type: ISSUE, first: 50) { nodes { ...pr } }
}
fragment pr on PullRequest {
  id number title url isDraft updatedAt reviewDecision
  author { login }
  repository { nameWithOwner }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}`;

export const MINE = "is:pr is:open author:@me archived:false sort:updated-desc";
export const REVIEW = "is:pr is:open review-requested:@me archived:false sort:updated-desc";

// CI rollup state -> { label, color (theme name) }.
const CI = {
  SUCCESS: { label: "CI passing", color: "ansi2" },
  FAILURE: { label: "CI failing", color: "ansi1" },
  ERROR: { label: "CI error", color: "ansi1" },
  PENDING: { label: "CI running", color: "ansi3" },
  EXPECTED: { label: "CI waiting", color: "ansi3" },
};

const REVIEW_LABELS = {
  APPROVED: { label: "Approved", color: "ansi2" },
  CHANGES_REQUESTED: { label: "Changes requested", color: "ansi1" },
  REVIEW_REQUIRED: { label: "Needs review", color: "muted" },
};

function parsePr(n) {
  const ci = n.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state ?? null;
  return {
    id: n.id, number: n.number, title: n.title ?? "", url: n.url, draft: Boolean(n.isDraft),
    updatedAt: n.updatedAt, repo: n.repository?.nameWithOwner ?? "", author: n.author?.login ?? "",
    ci: ci ? CI[ci] ?? { label: ci.toLowerCase(), color: "dim" } : null,
    review: REVIEW_LABELS[n.reviewDecision] ?? null,
  };
}

export function parseResponse(text) {
  const json = JSON.parse(text);
  const message = json?.errors?.[0]?.message;
  if (message) throw new Error(message);
  const list = (key) => (json?.data?.[key]?.nodes ?? []).filter((n) => n?.url).map(parsePr);
  return { mine: list("mine"), review: list("review") };
}

// Only https links reach the system's opener.
export function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function ago(iso, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}
