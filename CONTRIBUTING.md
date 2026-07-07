# Contributing to Paddix

Thanks for your interest in improving this project! It's a small, dependency-free
game, so contributing is easy.

## Getting started

1. **Fork** the repository and **clone** your fork.
2. Open `index.html` directly in a browser, or serve the folder:
   ```bash
   python3 -m http.server 8000   # then visit http://localhost:8000
   ```
3. Create a branch for your change:
   ```bash
   git checkout -b feature/my-improvement
   ```

## Guidelines

- **No build step, no dependencies.** Keep it plain HTML, Canvas and vanilla JS.
- **Add stages as data.** New stages go in `js/stages.js` — no engine changes
  needed. Follow the brick-layout legend documented at the top of that file.
- **Match the existing style.** Tabs for indentation; keep the code readable and
  commented where intent isn't obvious.
- **Don't break the leaderboard contract.** `js/leaderboard.js` is shared with
  other games; keep its public API (`top`, `submit`, `qualifies`, `mode`) stable
  and keep the localStorage fallback working when Supabase isn't configured.
- **Test a full run** (title → play → game over → initials → leaderboard) and
  check **mobile width** before opening a pull request.

## Submitting changes

1. Commit with a clear, descriptive message.
2. Push to your fork and open a **pull request** against `main`.
3. Fill out the pull request template and describe *what* changed and *why*.
4. Link any related issue (e.g. `Closes #12`).

## Reporting bugs & ideas

Use the [issue templates](.github/ISSUE_TEMPLATE) to file a bug report or
suggest a feature (a new stage, a power-up…). Please include steps to reproduce
and your browser/OS for bugs.

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
