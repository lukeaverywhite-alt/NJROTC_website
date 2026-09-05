# Bethel NJROTC website

A lightweight, responsive website starter for the Bethel, Connecticut NJROTC unit. It is built with plain HTML, CSS, and JavaScript, so there is no build step or package maintenance.

## Preview locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Customize the site

- Update announcements, events, staff names, and contact details in `index.html`.
- Adjust colors and layout in `styles.css`.
- Update the copyright year or mobile-navigation behavior in `script.js`.

Text marked **“Details coming soon”** is intentionally ready for the unit to replace with confirmed dates, names, or contact information.

## Publish with GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` publishes the repository as a static GitHub Pages site.

1. Push the repository to GitHub.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main`, or manually run **Deploy to GitHub Pages** from the Actions tab.

If your default branch has a different name, update the branch listed under `on.push.branches` in the workflow.
