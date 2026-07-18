# Workspace Customization Rules - RestaurantsOS

## 🌿 Git Branching & Promotion Strategy
This project strictly follows standard industrial deployment environments. Do **NOT** push or deploy directly to the `main` branch. 

Follow this sequence for committing and testing code changes:
1. **Development (`development`)**: Daily code edits, features, and fixes are implemented and committed here first.
2. **QA (`qa`)**: After passing local compilation and review, changes are promoted to the QA environment branch for verification.
3. **Beta (`beta`)**: Staging and pre-release checks.
4. **Production (`main`)**: The production release branch. Only updated after passing QA/Beta testing.

---

## 🚫 Push Restrictions
* **No Auto-Pushes**: Do not automatically push local Git commits to remote repositories (e.g. `git push`). Always leave the push step for the user to review and run manually.
