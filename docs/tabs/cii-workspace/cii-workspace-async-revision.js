/** Monotone per-mounted Writer2 post-Inspect operation revision.
 * This is race/cancellation state only; it does not grant review or writer authority.
 */
export function createCiiWriter2AsyncRevision() {
  let revision = 0;
  let closed = false;
  const invalidate = () => ++revision;
  const begin = () => {
    if (closed) throw new Error('CII_WRITER2_ASYNC_DISPOSED');
    return invalidate();
  };
  const current = stamp => !closed && Number.isSafeInteger(stamp) && stamp === revision;
  const dispose = () => { invalidate(); closed = true; };
  return Object.freeze({ begin, invalidate, current, dispose });
}
