// unlike Date.now() this cannot jump when the system clock changes
export const now = () => performance.timeOrigin + performance.now();
