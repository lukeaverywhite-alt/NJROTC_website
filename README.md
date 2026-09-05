# Bethel High School NJROTC website

This repository contains the mobile-first, static information portal for the Bethel High School NJROTC unit in Bethel, Connecticut. It uses plain HTML, CSS, and browser JavaScript: there is no package installation, build step, backend, database, account system, or frontend API key.

## Architecture

- `index.html` contains the homepage structure and introductory copy.
- `pages/` contains the interior pages. Links and assets use paths that work when the site is hosted in a GitHub project Pages subdirectory.
- `data/site-config.js`, `data/announcements.js`, and `data/gallery.js` contain structured content and settings that the browser loads before `script.js`.
- `script.js` builds shared navigation and footers and renders announcements, quick links, the featured-event countdown, calendar, and gallery.
- `weather.js` fetches the configured location's forecast from Open-Meteo. The site never requests a visitor's location.
- `styles.css` provides the shared responsive design, light and dark themes, and weather effects. Reduced-motion preferences disable or minimize animation.
- `assets/` contains site artwork and is the destination for optimized, approved gallery photographs.
- `.github/workflows/deploy-pages.yml` publishes the repository root to GitHub Pages without a build step.

## Local preview

From the repository root, run:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use an HTTP server rather than opening the HTML files directly so that local behavior matches GitHub Pages. Live weather requires browser internet access; the rest of the site remains usable when Open-Meteo is unavailable.

## Webmaster update guide

Treat the following file as the **single authoritative editing location** for each kind of site content. Do not duplicate the same information in another page or script.

| Content | Authoritative file | What to edit |
| --- | --- | --- |
| Navigation | `script.js` | The `nav` and `more` arrays near the beginning of the file. |
| Announcements | `data/announcements.js` | Entries in `window.ANNOUNCEMENTS`. |
| Events | `data/site-config.js` | `featuredEvent` for the verified event shown in the homepage countdown. Confirmed schedule dates belong in the public calendar rather than duplicated HTML. |
| Teams | `pages/teams.html` | Approved team names and descriptions. |
| FAQs | `pages/faq.html` | The questions and answers inside the FAQ `<details>` elements. |
| Resources | `pages/information-center.html` | Approved resource descriptions and links. |
| Contact information | `data/site-config.js` | The `contact` object; the Contact page is the presentation layer, not a second contact record. |
| Weekly plans | `pages/plan-of-week.html` | Replace the empty state and daily cards with the current instructor-approved plan. |
| Gallery records | `data/gallery.js` | Entries in `window.GALLERY_ITEMS`; image files themselves belong under `assets/gallery/`. |
| Weather settings | `data/site-config.js` | The fixed `weather` name, latitude, longitude, and timezone. |
| Calendar configuration | `data/site-config.js` | `calendar.embedUrl`, using only the verified public Google Calendar embed URL. |

### Announcements

Each announcement in `data/announcements.js` has this form:

```js
{
  title: 'Short title',
  message: 'Instructor-approved announcement text.',
  level: 'normal', // normal, important, or urgent
  startDate: '2027-01-10', // optional YYYY-MM-DD
  endDate: '2027-01-20',   // optional YYYY-MM-DD
  link: 'pages/plan-of-week.html', // optional
  enabled: true
}
```

Future, expired, and disabled entries are hidden automatically. Use `urgent` only for a genuine alert and `important` for stronger emphasis.

### Events, weather, contact, and calendar

- Enable `featuredEvent` only after verifying its name, ISO date/time (including UTC offset), subtitle, and location. The countdown stops at zero and never shows a negative value.
- Keep `weather` fixed to instructor-approved community or school coordinates. Open-Meteo needs no client-side API key.
- Put only official school or unit email, phone, and address values in `contact`.
- Put a **public Google Calendar embed URL**, never a private sharing URL, in `calendar.embedUrl`. An empty value intentionally displays a configuration notice.

### Gallery

Edit `weather` in `data/site-config.js`. The current values represent Bethel, Connecticut at the community level and should be replaced with the unit’s verified preferred coordinates if needed. The weather page always uses this fixed location; it never geolocates visitors. Open-Meteo requires no frontend API key.

### Navigation

The shared primary and “More” navigation records are in `data/navigation.js`. When adding a page, use a root-relative-to-file path pattern consistent with the existing entries; the script adds the appropriate `../` prefix on interior pages.

### Unit logo and favicon

The unit artwork is stored as the text-based vector file `assets/unit-mark.svg` and referenced by `identity.logo` in `data/site-config.js`. SVG keeps the logo crisp at every size and allows pull-request tools to display its source as text rather than rejecting a binary image. To replace it later, add an approved square SVG and update that configuration value. The circular frame and restrained blue/gold illumination are applied by CSS. Replace `assets/favicon.svg` separately if an approved compact mark is available. Do not stretch or alter official artwork.
Replace `assets/unit-mark.svg` with an approved unit seal while retaining the filename and a square view box. The included graphic is an original placeholder, not an official unit emblem. Replace `assets/favicon.svg` separately if an approved compact mark is available. Do not stretch or alter the proportions of an official emblem.

### Gallery photos

1. Create `assets/gallery/` if it does not exist.
2. Add approved, web-optimized images (WebP or JPEG recommended).
3. Add an entry to `data/gallery.js`:
Add an approved, web-optimized WebP or JPEG under `assets/gallery/`, then add its record to `data/gallery.js`:

```js
{
  src: 'assets/gallery/example.webp',
  alt: 'Objective description of the photo',
  caption: 'Instructor-approved caption'
}
```

### Logo and placeholder assets

- `Screenshot_20260905_153726_Gmail.jpg` is the repository's supplied **approved unit-logo reference**. Preserve it unchanged as the source artwork unless an instructor supplies a replacement.
- `assets/unit-mark.svg` and `assets/favicon.svg` are site-ready **placeholder/derived assets**, not proof of official approval. `identity.logo` in `data/site-config.js` currently points to `assets/unit-mark.svg`.
- Before publication, have an instructor approve the displayed derivative or replace it with a web-optimized export of the approved logo and update `identity.logo`. Replace the favicon separately. Never stretch, recolor, redraw, crop, or otherwise alter approved artwork without authorization.

Theme colors are defined as custom properties in `styles.css`. Dark mode is the default, light-mode overrides use `:root[data-theme="light"]`, and the visitor's choice is stored in `localStorage` as `bhsnjrotc-theme`.

## Content verification checklist

Before publishing any update:

- Update shared collections in `data/content.js`, announcements in `data/announcements.js`, and site settings in `data/site-config.js`.
- Adjust colors and layout in `styles.css`.
- Update the copyright year or mobile-navigation behavior in `script.js`.
- [ ] Obtain instructor approval for **all official information**, including dates, schedules, names, ranks, rosters, biographies, team details, awards, history, training requirements, contact details, links, captions, and emergency or wellness resources.
- [ ] Confirm dates, times, time zones, locations, uniform guidance, prices, deadlines, and event status against the unit's current authoritative source.
- [ ] Do **not** publish cadet personal contact information, including personal email addresses, phone numbers, home addresses, social-media accounts, or other direct identifiers. Use verified school or unit contact channels only.
- [ ] Confirm that every person shown in a gallery image is cleared for publication and that its alt text and caption are accurate and appropriate.
- [ ] Confirm that the Plan of the Week is current and remove or replace expired weekly information promptly.
- [ ] Confirm that external resources are official, current, public, and safe to share; ensure the calendar URL does not expose a private calendar.
- [ ] Verify the configured weather location and timezone without adding visitor geolocation.
- [ ] Leave the existing explicit empty states in place when approved information is unavailable. Never invent or infer unit facts to fill a page.

The repository does not currently establish approved staff names or ranks, a chain-of-command roster, a current Plan of the Week, official contact details, gallery photographs, awards or unit history, a public Google Calendar URL, Military Ball details, Basic Leadership Training details, or unit-specific wellness contacts. These must remain unpublished until an instructor supplies and approves them.

## Deployment

The workflow at `.github/workflows/deploy-pages.yml` deploys the repository root as a static GitHub Pages site:

1. Push the repository to GitHub.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main`, or manually run **Deploy to GitHub Pages** from the Actions tab.

If your default branch has a different name, update the branch listed under `on.push.branches` in the workflow.

## Content sources of truth

Repeated content is rendered into `data-*` mount points by `script.js`; do not copy records into HTML. All record IDs must remain stable, `order` controls display order, and `enabled: false` hides a record. Update `verifiedOn` whenever an authorized reviewer confirms a record. Dates use `YYYY-MM-DD`, and repository-local URLs are always relative to the repository root (the renderer applies each page's `data-base` value for GitHub Pages project deployments).

| Content type | Single source of truth | Mount |
| --- | --- | --- |
| Primary and More navigation | `data/navigation.js` | `data-site-header` |
| Teams and groups | `data/content.js` → `teams` | `data-content="teams"` |
| Frequently asked questions | `data/content.js` → `faqs` | `data-content="faqs"` |
| Resource directory | `data/content.js` → `resources` | `data-content="resources"` |
| Joining guidance | `data/content.js` → `joining` | `data-content="joining"` |
| Leadership roles | `data/content.js` → `leadership` | `data-content="leadership"` |
| Weekly schedules | `data/content.js` → `schedules` | `data-content="schedules"` |
| Events | `data/content.js` → `events` | `data-content="events"` |

The renderer rejects malformed collection records before display and constructs elements with DOM APIs so webmaster text is treated as text, not executable HTML. Local URLs with unsafe schemes or paths are rejected; external collection links must use HTTPS.
If the deployment branch changes, update `on.push.branches` in `.github/workflows/deploy-pages.yml`. Because internal links and assets use compatible relative paths, the site can be served from a GitHub project Pages subdirectory.
