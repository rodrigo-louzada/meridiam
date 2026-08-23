# Meridiam Maritime — website

Single-page static site. No build step, no dependencies: the files in this
repository are exactly what gets served.

## Layout

    index.html              markup only
    assets/style.css        all styles, @font-face rules first
    assets/app.js           dateline stamp + mobile nav
    assets/*.png            logos (see note below)
    assets/fonts/*.woff2    self-hosted Barlow + IBM Plex Mono, latin & latin-ext
    _headers                Cloudflare Pages cache + security headers
    robots.txt, sitemap.xml

## Local preview

    python3 -m http.server 8000    # then open http://localhost:8000

Open the file directly with `file://` and the fonts will fail CORS — use a server.

## Deploying

Cloudflare Pages, connected to this repository:

- Build command:      *(leave empty)*
- Build output dir:   `/`

Pushing to the default branch deploys production; any other branch gets a
preview URL.

## Notes

- `assets/meridiam.png` is white-on-transparent by design — it only ever sits on
  the navy header and footer. It used to be a dark mark inverted with a CSS
  `filter`; baking the colour in dropped it from 37 KB to 9 KB.
- `assets/perez-y-cia.png` keeps full colour: the mark carries a red accent
  (`#B61E2A`).
- `assets/*` is served `immutable` for a year. If you change an asset, rename it
  (e.g. `style.v2.css`) or the cached copy will stick.
