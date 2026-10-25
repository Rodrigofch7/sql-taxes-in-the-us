---
description: Ask the economist, investor, data scientist and designer the same question, then merge their answers into one memo
argument-hint: <question or proposed change>
---

Run the specialist panel on this question:

$ARGUMENTS

1. Launch the `economist`, `investor`, `data-scientist` and `designer` agents in
   parallel, in one message, each with the question above and any context from this
   conversation they need to answer it. Leave out a specialist only when the question is
   plainly outside their lane, and say which you left out. Do not show any specialist
   another's report: the value is in independent views.
2. When all have reported, check the claims that would most change the decision
   against `data/processed/acs.duckdb` or the code before repeating them. Drop or mark
   anything that does not hold up.
3. Reply with a single memo for the project owner:
   - **Where they agree**
   - **Where they disagree**, and what each side's reasoning is. Do not average the
     positions away.
   - **Unverified**: claims nobody could check
   - **Recommendation**: an ordered list of actions, with your own view where the
     specialists split

Make no changes to the project. The owner decides what to act on.
