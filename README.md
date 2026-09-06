# Bethel High School NJROTC website

A dependency-free static website for the Bethel High School NJROTC unit. Plain HTML, CSS, and browser JavaScript keep the site portable to a GitHub Pages project subdirectory; `<body data-base>` tells the shared renderer how to resolve repository-root paths on each page.

## Test and preview

Node.js is a contributor requirement because the regression suite runs `node --check script.js`. Run the complete automated suite with one command:

```bash
python3 -m unittest discover -s tests -v
```

Preview from the repository root with:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. No package installation or build is required.

## Sources of truth

Do not duplicate managed records in HTML. Stable IDs must be unique, `order` values determine display deterministically, and `enabled: false` hides a record.

| Information | Authoritative file |
| --- | --- |
| Navigation hierarchy and approved external destinations | `data/navigation.js` |
| Collections (teams, FAQs, resources, schedules, events) | `data/content.js` |
| Announcements | `data/announcements.js` |
| Gallery records | `data/gallery.js` |
| Identity, public calendar embed, contact, weather, event settings | `data/site-config.js` |

Desktop dropdowns and the mobile menu are generated from the same categorized navigation records. Calendar is a Cadet Resources destination at `pages/calendar.html`; configure only its verified, public embed URL at `SITE_CONFIG.calendar.embedUrl` in `data/site-config.js`. Empty configuration intentionally produces a clear empty state.

## Content maintenance

Publish only instructor-approved unit facts. Do not publish cadet personal contact information. Verify dates, schedules, names, ranks, links, gallery permissions, and public-calendar access before enabling records. `weather.js` uses the fixed location in `data/site-config.js` and never requests visitor geolocation.

Announcements support `normal`, `important`, and `urgent` levels plus optional `startDate`, `endDate`, `link`, and `enabled` fields. Gallery images belong under `assets/gallery/`, while their alt text and captions belong in `data/gallery.js`.

## Logo and binary policy

`assets/unit-mark.svg` is the approved site derivative rebuilt from the supplied 2026 unit-logo reference: it preserves the Bethel/NJROTC circular identity, anchor, and maroon-and-white wildcat in a text-reviewable vector. `assets/favicon.svg` is its small-size companion. Obtain unit approval before replacing either. A replacement must be a square, accessible, self-contained SVG with unique internal IDs; update `identity.logo` only if its path changes.

The supplied JPEG reference was removed from normal Git tracking after the derivative was prepared. If retention is required, archive the original outside this patch-based repository. Normal contributions must not add raster binaries (JPEG, PNG, WebP, GIF, AVIF, or ICO); `.gitattributes` classifies them as binary to prevent misleading text diffs. Do not introduce Git LFS unless every contributor and GitHub Pages deployment explicitly supports it.

## Themes and accessibility

`styles.css` defines one complete semantic token set for dark and light themes. The persistent header control follows the saved `bhsnjrotc-theme` preference, otherwise the operating-system preference. Storage failures do not prevent rendering. Navigation is keyboard accessible, touch targets are at least 44 pixels, and reduced-motion preferences are respected.

## GitHub Pages deployment

`.github/workflows/deploy-pages.yml` copies the static site into the Pages artifact and deploys on pushes to `main` or manual dispatch. In repository **Settings → Pages**, select **GitHub Actions** as the source. `.github/workflows/quality.yml` runs the dependency-free regression checks for every pull request and push to `main`; it installs no project packages.
