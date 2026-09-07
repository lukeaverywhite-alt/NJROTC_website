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
| Identity, unit credentials, public calendar embed, contact, weather, event settings | `data/site-config.js` |

Desktop dropdowns and the mobile menu are generated from the same categorized navigation records. Calendar is a Cadet Resources destination at `pages/calendar.html`; configure only its verified, public embed URL at `SITE_CONFIG.calendar.embedUrl` in `data/site-config.js`. Empty configuration intentionally produces a clear empty state.

## Content maintenance

Publish only instructor-approved unit facts. Do not publish cadet personal contact information. Verify dates, schedules, names, ranks, links, gallery permissions, and public-calendar access before enabling records. `weather.js` uses the fixed location in `data/site-config.js` and never requests visitor geolocation.

Announcements support `normal`, `important`, and `urgent` levels plus optional `startDate`, `endDate`, `link`, and `enabled` fields. Gallery images belong under `assets/gallery/`, while their alt text and captions belong in `data/gallery.js`.

## Logo and binary policy

`assets/official-unit-mark.png` is the shared unit-mark source. It appears prominently in the home-page hero and as a compact home link on interior pages, never twice in one view. Replace that file in place without creating duplicate logo assets; preserve a near-square aspect ratio and transparent background when possible. `assets/favicon.svg` is its small-size companion.

The official unit mark is the sole approved raster-logo exception. Other supplied reference images should be archived outside this patch-based repository unless they are approved site content. `.gitattributes` classifies raster assets as binary to prevent misleading text diffs. Do not introduce Git LFS unless every contributor and GitHub Pages deployment explicitly supports it.

## Themes and accessibility

`styles.css` defines one complete semantic token set for dark and light themes. The persistent header control follows the saved `bhsnjrotc-theme` preference, otherwise the operating-system preference. Storage failures do not prevent rendering. Navigation is keyboard accessible, touch targets are at least 44 pixels, and reduced-motion preferences are respected.

## GitHub Pages deployment

`.github/workflows/deploy-pages.yml` copies the static site into the Pages artifact and deploys on pushes to `main` or manual dispatch. In repository **Settings → Pages**, select **GitHub Actions** as the source. `.github/workflows/quality.yml` runs the dependency-free regression checks for every pull request and push to `main`; it installs no project packages.

## Cadet Reference Manual and provenance

The supplied `CFM 12th Edition Master Draft (0509-LP-002-6028) 17 APR 2024.pdf` has its own reading room at `pages/cadet-field-manual.html`. Keep its **Master Draft** label visible: the site must not represent it as final guidance. The page connects field-manual study to the relevant unit pages without copying potentially conflicting rules into multiple locations. Current instructor direction, the Plan of the Week, and current governing guidance always control.

The checked-in `crm-3rd_edition.pdf` is the complete archived third-edition Cadet Reference Manual. `pages/cadet-reference-manual.html` is an accessible, mobile-friendly topic guide—not a replacement copy of the PDF—and links to both open and download the complete source. The archived national manual does not override current instructor direction, the Plan of the Week, or current governing guidance.

Every manual-derived subject published in HTML must have a narrowly scoped note or extract under `references/`. Name the source (`crm-3rd_edition.pdf`), record the relevant **printed** page numbers (not PDF viewer indices), state exactly what was transcribed or summarized, and document any unit-specific boundary. Avoid unsupported inference and keep Bethel-specific, time-sensitive facts in their existing authoritative location.

When a newer edition becomes available:

1. Preserve the old edition until the replacement source and its authority are verified by an instructor.
2. Compare every `references/crm-3rd_edition-*.txt` subject with the new edition, recording changed printed pages and substantive differences.
3. Reconcile the HTML guide and contextual links without replacing verified unit-specific content; update the precedence notice if governing direction requires it.
4. Rename/update provenance and the PDF links together, update the edition label everywhere, refresh `verifiedOn`, and run the complete regression suite.
5. Obtain instructor approval before publishing the revised manual-derived guidance.
