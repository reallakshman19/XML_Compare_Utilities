// The unchanged shared validator imports Node modules for its CLI only.
// The browser uses validate(doc); no filesystem or CLI operation is allowed.
const unavailable = () => { throw new Error('Node CLI operation is not available in the browser'); };
export const readFileSync = unavailable;
export const readdirSync = unavailable;
export const fileURLToPath = unavailable;
export const dirname = unavailable;
export const join = unavailable;
