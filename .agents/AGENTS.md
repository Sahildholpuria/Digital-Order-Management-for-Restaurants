# Workspace Customization Rules - RestaurantsOS

## 🌿 Git Branching & Promotion Strategy
This project strictly follows standard industrial deployment environments. Do **NOT** push or deploy directly to the `main` branch. 

Follow this sequence for committing and testing code changes:
1. **Development (`development`)**: Daily code edits, features, and fixes are implemented, tested, and committed here first. Connected to Vercel Preview deployments.
2. **Production (`main`)**: The production release branch connected to live real-time users. Only updated after testing on development/preview.

---

## 🚫 Push Restrictions
* **No Auto-Pushes**: Do not automatically push local Git commits to remote repositories (e.g. `git push`). Always leave the push step for the user to review and run manually.
