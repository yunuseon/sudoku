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
