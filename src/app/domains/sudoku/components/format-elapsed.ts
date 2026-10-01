export const formatElapsed = (elapsed: number) => {
  const seconds = Math.floor(elapsed / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
