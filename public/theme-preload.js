try {
  const background = JSON.parse(localStorage.getItem('sudoku.v1.theme') ?? '{}').backgroundColor;
  if (typeof background === 'string') {
    document.documentElement.style.backgroundColor = background;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', background);
  }
} catch {}
