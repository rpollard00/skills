---
name: principle-test-behavior-not-implementation
description: Apply when writing or reviewing tests. Exercise the caller-visible contract and verify that assertions detect relevant behavioral defects, not merely implementation changes.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Test behavior, not implementation

Call the code through a meaningful interface and assert the result or effect its consumer observes. Test the contract, not the current arrangement of helper calls.

## Check sensitivity

Name a plausible defect in the behavior under test. Determine whether that defect makes the test fail. When useful, introduce the defect temporarily or use a controlled contrasting input to demonstrate sensitivity.

Matcher names do not establish test quality. `toBeDefined`, `toBeTruthy`, `not.toThrow`, empty collections, and absence assertions can detect real defects. Conversely, a precise equality can prove nothing when its expected value comes from the same faulty computation.

Look for these failure modes:

- The subject never runs; the fixture only asserts facts about itself.
- The expected result repeats the subject's computation or imports the same mistaken constant.
- A mock proves a call occurred but does not establish the relevant payload or external effect.
- A prompt or configuration assertion pins incidental wording rather than a required contract.
- A negative case passes because the setup never reaches the intended path.

Prefer concrete inputs and independently established expected results. For absence behavior, use a positive control when it helps distinguish the intended branch from a broken no-op. Assert payloads or effects at real boundaries when mocks are necessary.

Keep tests of genuine public constants, cross-table relations, schemas, and compile-time contracts. Delete or improve tests that protect implementation details without catching relevant behavioral defects.
