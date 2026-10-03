# Sudoku

A mobile-first sudoku game built with Angular: generated puzzles by difficulty, notes, undo/redo with a timeline, and themes.

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

## Docker

```bash
docker build -t sudoku .
docker run --rm -p 8080:8080 sudoku
```

Open `http://localhost:8080/`. The image serves the static build with nginx as a non-root user on port 8080.

Every push to `main` publishes `ghcr.io/yunuseon/sudoku` (amd64 and arm64) through GitHub Actions. [compose.yml](compose.yml) runs that image on port 18081, e.g. as a project in a NAS's Docker app.
