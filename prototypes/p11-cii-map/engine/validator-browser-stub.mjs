// The vendored validator's filesystem/path helpers are only used by its Node CLI.
const unavailable = () => { throw new Error('Node CLI helper unavailable in browser'); };
export const readFileSync = unavailable, readdirSync = unavailable, fileURLToPath = unavailable,
  dirname = unavailable, join = unavailable;
