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

GitHub Pages, from the `main` branch:

- Repo: <https://github.com/rodrigo-louzada/meridiam>
- Settings -> Pages -> Source: **Deploy from a branch**, branch `main`, folder `/ (root)`
- Live at <https://rodrigo-louzada.github.io/meridiam/>

No build step. Pushing to `main` publishes.

`.nojekyll` is required: without it Pages runs the site through Jekyll, which
skips paths beginning with an underscore and reprocesses the rest.

Every internal path is relative, so the site works from the `/meridiam/`
subpath. The only absolute URLs are `og:image`, `og:url`, `sitemap.xml` and the
`Sitemap:` line in `robots.txt`. **Adding a custom domain later means updating
those four and committing a `CNAME` file.**

### What GitHub Pages cannot do

Pages serves fixed headers and offers no way to change them, so `_headers` is
inert there. It is kept for a return to Cloudflare. Consequences:

- The CSP moved into a `<meta http-equiv>` tag in `index.html`. It needs
  `style-src 'unsafe-inline'` because the markup carries 11 inline `style`
  attributes plus the `noscript` block.
- `frame-ancestors` is ignored in a meta tag and `X-Frame-Options` cannot be
  sent, so there is no clickjacking protection. HSTS and `Permissions-Policy`
  are likewise unavailable.
- The one-year `immutable` caching on `assets/*` no longer applies; Pages sets
  its own, roughly ten minutes for HTML.

## Brand assets

All taken from `_source/meridiam-logo-pack.zip` (kept out of the deploy root so
it is not published). Which file went where, and why:

| In the site | From the pack | Why that one |
|---|---|---|
| `meridiam.png` | `02-reversed-white-transparent/…-600w` | Header and footer both sit on navy; the README calls for 400w or 600w at header size |
| `favicon-32`, `icon-192`, `icon-512` | `06-icon-mark-on-navy` | The navy tile reads on light *and* dark tab bars; `05-`'s navy-on-transparent mark disappears on dark |
| `apple-touch-icon.png` | `06-icon-mark-on-navy/…-180` | iOS composites non-opaque icons onto white, so the tile is required |
| `og-image.png` | `07-social/og-image-1200x630-dark` | Matches the site's navy treatment |

Pérez y Cía keeps full colour: that mark carries a red accent (`#B61E2A`).

The pack gives brand navy as `#0B284B`. The stylesheet uses `#09284D`, sampled
from the wordmark before the pack existed — visually identical, but worth
reconciling if the palette is ever revisited.

The pack notes it was rebuilt from a raster image and tops out at 2400w. For
print or large format, commission a vector redraw.

## Notes
- `assets/*` is served `immutable` for a year. If you change an asset, rename it
  (e.g. `style.v2.css`) or the cached copy will stick.
