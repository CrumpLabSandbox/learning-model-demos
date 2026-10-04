// Slide navigation with no DOM, so it can be tested in Node.
// Slides are numbered from 1 in the URL (#3) and from 0 in code.

export function slideFromHash(hash, count) {
  const m = /^#?(\d+)/.exec(String(hash ?? ''));
  if (!m) return 0;
  return clamp(Number(m[1]) - 1, count);
}

export function clamp(i, count) {
  return Math.max(0, Math.min(count - 1, i));
}

// Which slide a key press moves to, or null if the key is not navigation.
export function keyTarget(key, current, count) {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
    case 'Enter':
      return clamp(current + 1, count);
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
    case 'Backspace':
      return clamp(current - 1, count);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
