import { defineTopic } from "@/lib/content/types";

import ClosuresExplained from "./lessons/closures-explained.mdx";
import HowJavascriptRuns from "./lessons/how-javascript-runs.mdx";
import ValuesAndReferences from "./lessons/values-and-references.mdx";

export default defineTopic({
  slug: "javascript-foundations",
  title: "JavaScript Foundations",
  tagline: "The three ideas that explain most JavaScript bugs.",
  description:
    "A short, opinionated tour of the JavaScript mental models that actually matter day to day: how the single thread and event loop schedule your code, what closures really capture, and why objects behave differently from primitives.",
  level: "beginner",
  accent: "amber",
  icon: "⚡",
  order: 1,
  tags: ["javascript", "fundamentals", "event loop", "closures"],
  lessons: [
    {
      slug: "how-javascript-runs",
      title: "How JavaScript Actually Runs",
      description:
        "The call stack, the task queue and the microtask queue — a working model of the single thread that explains setTimeout ordering, promise ordering and frozen UIs.",
      minutes: 7,
      updated: "2026-07-31",
      tags: ["event loop", "async", "promises"],
      Content: HowJavascriptRuns,
    },
    {
      slug: "closures-explained",
      title: "Closures, Explained Without Metaphors",
      description:
        "A closure is a function plus the scope it was defined in. See what that means for loops, private state, and the stale-closure bugs that show up in React hooks.",
      minutes: 8,
      updated: "2026-07-31",
      tags: ["closures", "scope", "react"],
      Content: ClosuresExplained,
    },
    {
      slug: "values-and-references",
      title: "Values, References and the Copy Trap",
      description:
        "Why changing one object changed another, why const objects are still mutable, and which array methods mutate in place. The reference model, with the copying rules that follow from it.",
      minutes: 6,
      updated: "2026-07-31",
      tags: ["objects", "immutability", "arrays"],
      Content: ValuesAndReferences,
    },
  ],
});
