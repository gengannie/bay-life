---
trigger: always_on
description: Always commit completed changes and merge/push them to the prod branch
---

# Commit and Merge to `prod` Rule

After completing any task that modifies files in this repository, you **MUST** always commit your changes and merge them into `prod` before finishing your turn:

1. **Verify**: If source code was modified, verify that the project builds cleanly (`npm run build`).
2. **Commit**: Stage all relevant changes and commit them to `main` with a clear, descriptive commit message:
   ```bash
   git add -A
   git commit -m "<type>: <descriptive summary>"
   ```
3. **Merge to `prod` & Push**: Merge `main` into `prod` and push both branches to `origin` so production is always up to date:
   ```bash
   git checkout prod && git merge main --no-edit && git push origin prod && git checkout main && git push origin main
   ```
   *(Alternatively, if fast-forwarding directly from `main`: `git branch -f prod HEAD && git push origin main prod`)*
