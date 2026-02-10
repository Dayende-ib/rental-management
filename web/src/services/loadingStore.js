let count = 0;
const listeners = new Set();

const notify = () => {
  listeners.forEach((cb) => cb(count));
};

export const incrementLoading = () => {
  count += 1;
  notify();
};

export const decrementLoading = () => {
  count = Math.max(0, count - 1);
  notify();
};

export const subscribeLoading = (cb) => {
  listeners.add(cb);
  cb(count);
  return () => listeners.delete(cb);
};

export const getLoadingCount = () => count;
