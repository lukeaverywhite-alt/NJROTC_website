# Bethel High School NJROTC website

A mobile-first, static information portal for the Bethel, Connecticut NJROTC unit. The site uses plain HTML, CSS, and browser JavaScript, with no package installation, build step, backend, database, accounts, or exposed API keys.

## Architecture

- `index.html` — ceremonial homepage, announcements, quick access, countdown, and calendar.
- `pages/` — static interior pages. Every page uses relative URLs for GitHub project Pages compatibility.
- `styles.css` — shared dark/light command-interface design system and responsive layouts.
- `script.js` — shared navigation, theme, announcements, countdown, calendar, and gallery behavior.
- `weather.js` — browser-side Open-Meteo weather client and condition-aware presentation.
- Weather scene markup and CSS provide moving sunlight, clouds, rain, and restrained lightning, with all motion disabled or minimized when the visitor requests reduced motion.
- `data/site-config.js` — frequently edited site identity, event, weather, calendar, contact, and quick-link settings.
- `data/announcements.js` — date-aware static announcements.
- `data/gallery.js` — approved gallery image metadata.
- `assets/` — replaceable unit mark, favicon, and future optimized photographs.
- `.github/workflows/deploy-pages.yml` — existing no-build GitHub Pages deployment.

## Preview locally

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>. Weather requires internet access from the browser. The rest of the site remains usable if the weather service is unavailable.

## Routine webmaster updates

### Homepage text

Edit the visible introduction and card copy in `index.html`. Preserve the heading order and existing semantic elements when possible.

### Announcements

Edit `data/announcements.js`. Each announcement supports:

```js
{
  title: 'Short title',
  message: 'Approved announcement text.',
  level: 'normal', // normal, important, or urgent
  startDate: '2027-01-10', // optional YYYY-MM-DD
  endDate: '2027-01-20',   // optional YYYY-MM-DD
  link: 'pages/plan-of-week.html', // optional
  enabled: true
}
```

Expired, future, and disabled announcements are hidden automatically. `urgent` notices receive an alert treatment and `important` notices receive stronger emphasis; the written severity label ensures meaning is not conveyed by color alone.

### Featured countdown

Edit `featuredEvent` in `data/site-config.js`. Set a verified ISO date/time in `target`, update the approved event text, and change `enabled` to `true`. Never publish a speculative date. The timer stops at zero and never displays negative values.

### Fixed weather location

Edit `weather` in `data/site-config.js`. The current values represent Bethel, Connecticut at the community level and should be replaced with the unit’s verified preferred coordinates if needed. The weather page always uses this fixed location; it never geolocates visitors. Open-Meteo requires no frontend API key.

### Navigation

The shared primary and “More” navigation arrays are near the top of `script.js`. When adding a page, use a root-relative-to-file path pattern consistent with the existing entries; the script adds the appropriate `../` prefix on interior pages.

### Unit logo and favicon

The unit artwork is stored as the text-based vector file `assets/unit-mark.svg` and referenced by `identity.logo` in `data/site-config.js`. SVG keeps the logo crisp at every size and allows pull-request tools to display its source as text rather than rejecting a binary image. To replace it later, add an approved square SVG and update that configuration value. The circular frame and restrained blue/gold illumination are applied by CSS. Replace `assets/favicon.svg` separately if an approved compact mark is available. Do not stretch or alter official artwork.

### Gallery photos

1. Create `assets/gallery/` if it does not exist.
2. Add approved, web-optimized images (WebP or JPEG recommended).
3. Add an entry to `data/gallery.js`:

```js
{ src: 'assets/gallery/example.webp', alt: 'Objective description of the photo', caption: 'Approved caption' }
```

The gallery creates responsive thumbnails and an accessible native dialog with close, previous, next, Escape, and arrow-key controls. Images below the fold load lazily.

### Official contact information

Add only verified official unit or school contact details under `contact` in `data/site-config.js`, then render those approved fields on `pages/contact.html`. Avoid publishing personal cadet contact information.

### Google Calendar

Copy the verified **public Google Calendar embed URL** into `calendar.embedUrl` in `data/site-config.js`. Do not use a private sharing URL. Until a verified URL is supplied, the homepage displays an intentional configuration notice rather than an invented calendar.

### Colors and themes

Shared tokens are at the top of `styles.css`. Dark mode is the default. Light-mode tokens are under `:root[data-theme="light"]`. The visitor’s selection is stored in `localStorage` as `bhsnjrotc-theme` and applied in each page head to prevent a flash of the wrong theme.

## Content requiring human verification

The original repository contained no approved unit seal, current staff names/ranks, chain-of-command roster, Plan of the Week, contact details, gallery photographs, awards, historical details, Google Calendar ID, Military Ball information, Basic Leadership Training details, or unit-specific wellness contacts. The redesign retains these destinations but deliberately uses clear empty states rather than fabricating facts. A unit instructor or authorized webmaster should provide and approve this material.

The configured weather coordinates represent Bethel, Connecticut generally. Verify whether the unit prefers exact school coordinates before publication.

## GitHub Pages deployment

The existing workflow publishes the repository root without a build step:

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. Push to `main`, or manually run **Deploy to GitHub Pages**.

All internal assets and page links use relative paths, so the site works under a GitHub project Pages subdirectory. If the default deployment branch changes, update `on.push.branches` in `.github/workflows/deploy-pages.yml`.
