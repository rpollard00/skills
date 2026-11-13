# Code-quality boundary

This adversarial review tests behavior. Source inspection helps select probes and explain failures. It does not create findings by itself.

Leave style, naming, file size, abstraction preferences, and speculative maintainability risks out of the findings. Do not request structural changes merely because another implementation looks cleaner.

When structure causes an observable intent violation, demonstrate that violation with a run. A separate structural audit is a different task, not an additional approval gate for this review.
