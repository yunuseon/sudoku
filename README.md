# Sudoku

A mobile-first sudoku game built with Angular: generated puzzles by difficulty, notes, undo/redo with a timeline, and themes. It installs as an app (on iPhone: Share → Add to Home Screen) and works offline.

## Development

```bash
nvm use
npm install
npm start
```

Open `http://localhost:4200/`. To play on a phone in the same network, serve on all interfaces and allow the host:

```bash
NG_ALLOWED_HOSTS=localhost,<your-ip> npx ng serve --host 0.0.0.0
```

## Tests

```bash
npm test
```

## Build

```bash
npm run build
```

The output in `dist/sudoku/browser` is static and can be served by any web server.

## Deployment

Everything about serving the app lives in [deploy/](deploy), the app itself knows nothing about it:

- [Dockerfile](deploy/Dockerfile) builds the app and serves the static files with nginx as a non-root user on port 8080, configured by [nginx.conf](deploy/nginx.conf).
- Every push to `main` publishes the image as `ghcr.io/yunuseon/sudoku` (amd64 and arm64) through GitHub Actions.
- [compose.yml](deploy/compose.yml) runs that image on the NAS next to Nginx Proxy Manager, which reaches it at `http://sudoku:8080`.

To run the image locally:

```bash
docker build -f deploy/Dockerfile -t sudoku .
docker run --rm -p 8080:8080 sudoku
```

Then open `http://localhost:8080/`.
