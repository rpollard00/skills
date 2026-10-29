### Eval

**You own the experiment design. Plan, blind, run, synthesize.**

**Non-negotiables for blinding:**

- Hide evaluation orchestration, variant assignments, judge instructions, and the private scoring rubric from candidates. Remove revealing labels from orchestration-created paths, files, and prompt framing. Genuine task, project, and skill content can contain words such as `eval`, `test`, `benchmark`, or `arena`. Do not rename project tests or alter supplied skills to satisfy a word ban.
- The candidate prompt looks like an organic user request. State the goal, not the meta.
- No chain-eliciting cues. Don't ask the candidate to list which skills, principles, or files they applied. Ask for design notes generally and grade chain-following from code shape, not self-report.
- Sanitize orchestration-created directory and slug names. Use project-shaped names a user might pick. Preserve names that belong to the actual project or skill variant.
- Don't tell the candidate other candidates exist.
- The judge can know it's judging but sees outputs by sanitized label only, never by model name.
- Comparing two variants: one judge scores both sets in a single pass on one scale, blind to which set each came from.

**Steps:**

1. **Frame.** State what variant is under test and what behavior counts as success. Write the rubric (3-6 concrete criteria) for the judge only. Hold it back from candidates.

   Before confirmatory trials, freeze the decision contract:

   - Name the evidence that changes the promotion decision, including required gains and unacceptable regressions.
   - Predeclare representative tasks and repetitions, uncertainty handling, and the rubric. Reuse [Hillclimb's measurement validity](hillclimb.md#measurement-validity) for completed work, fair conditions, sample counts, variability, and end-to-end relevance.
   - Set a resource budget for candidates, judging, and verification. Declare a stopping rule within that budget. Permit an inconclusive outcome when the evidence cannot support a promotion decision.

   A pilot with a declared resource limit can refine the design before this freeze. Label pilot evidence as exploratory and exclude it from confirmatory evidence. If the frozen contract changes later, label prior trials exploratory and restart confirmation within the remaining budget.

2. **Set up sanitized environments.** Per-candidate working dir with the variant in place. Plant any context an organic task would have: a project skeleton, the skills the candidate would naturally read.
3. **Author one organic prompt.** What a user would type. No leakage of what's being measured.
4. **Spawn N isolated candidates** through [execution](../references/execution.md) and arena's candidate contract. Apply [execution's routing contract](../references/execution.md#agent-and-model-routing) to candidates and the judge. Each works in its own sanitized directory with the same organic prompt.
5. **Spawn one fresh blinded judge** per arena's judge contract, preserving configured judge routing. Judge sees outputs by sanitized label and rubric, never model identity. Record unavailable independence or unmet explicit multi-model requirements.
6. **Verify the chain from transcripts, not self-report.** Read only the candidate's documented transcript or export from this run. Do not search unrelated sessions. If transcript evidence is unavailable, mark chain-following unverified. Look at which files each candidate actually opened. Grade chain-following from the files it really read plus the shape of the code, never from the candidate's own claims.
7. **Read every candidate output yourself** end to end. Compare to the judge's verdict. Disagreement means a model is biased or the rubric is ambiguous. Synthesize against the frozen criteria. Report attempted and completed repetitions, failures, uncertainty, and resource use. If the evidence remains inconclusive within the budget, report it as inconclusive. Do not treat it as proof of equivalence or promotion.

**Reply:** variant under test, frozen decision criteria and rubric, workload and repetitions, uncertainty, resource budget and use, per-candidate notes, judge's verdict, your synthesis, and a promotion, rejection, or inconclusive recommendation. Distinguish exploratory evidence from confirmatory results.
