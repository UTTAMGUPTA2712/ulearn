import { defineTopic } from "@/lib/content/types";

import BranchingWithoutFear from "./lessons/branching-without-fear.mdx";
import CommitsThatExplainThemselves from "./lessons/commits-that-explain-themselves.mdx";
import UndoingAlmostAnything from "./lessons/undoing-almost-anything.mdx";

export default defineTopic({
  slug: "git-essentials",
  title: "Git Essentials",
  tagline: "Stop fearing the parts of Git that look destructive.",
  description:
    "The practical half of Git: writing commits that still make sense a year later, branching and rebasing without breaking your team's history, and the recovery commands that make almost every mistake reversible.",
  level: "beginner",
  accent: "emerald",
  icon: "⎇",
  order: 3,
  tags: ["git", "version control", "workflow", "collaboration"],
  lessons: [
    {
      slug: "commits-that-explain-themselves",
      title: "Commits That Explain Themselves",
      description:
        "Why the commit body matters more than the subject, the mechanical rules that make history readable, and how to split a messy working tree into one-idea commits with git add -p.",
      minutes: 6,
      updated: "2026-07-31",
      tags: ["commits", "conventions", "code review"],
      Content: CommitsThatExplainThemselves,
    },
    {
      slug: "branching-without-fear",
      title: "Branching Without Fear",
      description:
        "A branch is a 41-byte pointer. What that means for merge vs rebase, when each one is safe, why --force-with-lease replaced --force, and how worktrees beat stashing.",
      minutes: 7,
      updated: "2026-07-31",
      tags: ["branches", "rebase", "merge"],
      Content: BranchingWithoutFear,
    },
    {
      slug: "undoing-almost-anything",
      title: "Undoing Almost Anything",
      description:
        "reflog, reset, revert and restore — which to reach for in each situation, how to recover a deleted branch or commit, and the short list of things Git genuinely cannot get back.",
      minutes: 8,
      updated: "2026-07-31",
      tags: ["reflog", "reset", "recovery", "bisect"],
      Content: UndoingAlmostAnything,
    },
  ],
});
