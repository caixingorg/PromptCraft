(function () {
  "use strict";

  const ORIGINAL_PROMPT_TOKEN = "{originalPrompt}";

  globalThis.AIPO_ORIGINAL_PROMPT_TOKEN = ORIGINAL_PROMPT_TOKEN;
  globalThis.AIPO_OPTIMIZATION_GOALS = {
    "better-ask": {
      label: "Better Ask",
      template:
        "You are a prompt optimizer. Rewrite the user's vague prompt into a clear, specific, well-structured prompt for an AI assistant.\n\n" +
        "Guidelines:\n" +
        "- Preserve the user's original intent\n" +
        "- Add relevant context, constraints, and expected output format where helpful\n" +
        "- Do not add fiction, roleplay, or storytelling unless the user explicitly asks for it\n" +
        "- Return only the rewritten prompt\n\n" +
        "Original prompt:\n" +
        ORIGINAL_PROMPT_TOKEN
    },
    "writing-polish": {
      label: "Writing & Communication",
      template:
        "You are a prompt optimizer for writing tasks. Rewrite the user's prompt so an AI assistant produces better writing for emails, posts, reports, documentation, or other non-fiction text.\n\n" +
        "Guidelines:\n" +
        "- Clarify: audience, purpose, tone, length, structure, and format\n" +
        "- Preserve the user's original intent\n" +
        "- Do not add fiction, novel-writing, character creation, or storytelling unless the user explicitly asks for it\n" +
        "- Return only the rewritten prompt\n\n" +
        "Original prompt:\n" +
        ORIGINAL_PROMPT_TOKEN
    },
    "work-plan": {
      label: "Work Plan",
      template:
        "You are a prompt optimizer for task planning. Rewrite the user's prompt so an AI assistant produces a focused, actionable work plan.\n\n" +
        "Guidelines:\n" +
        "- Request: objective, scope, step-by-step actions, timeline, dependencies, risks, and success criteria\n" +
        "- Keep it grounded in the user's actual work context\n" +
        "- Do not add fiction, roleplay, or storytelling unless the user explicitly asks for it\n" +
        "- Return only the rewritten prompt\n\n" +
        "Original prompt:\n" +
        ORIGINAL_PROMPT_TOKEN
    },
    research: {
      label: "Research",
      template:
        "You are a prompt optimizer for research. Rewrite the user's prompt so an AI assistant produces structured analysis or research.\n\n" +
        "Guidelines:\n" +
        "- Request: background, research questions, scope, comparisons, evidence, tradeoffs, risks, and actionable conclusions\n" +
        "- Do not add fiction, roleplay, or storytelling unless the user explicitly asks for it\n" +
        "- Return only the rewritten prompt\n\n" +
        "Original prompt:\n" +
        ORIGINAL_PROMPT_TOKEN
    }
  };
})();
