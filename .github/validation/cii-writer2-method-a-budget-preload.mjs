import { setCiiMultiSourceMethodAPhysicalCandidateLimit } from '../../tabs/cii-workspace/cii-workspace-source-set.js';

const requested = Number(process.env.CII_METHOD_A_PHYSICAL_LIMIT);
if (!Number.isInteger(requested) || requested < 3 || requested > 24) {
  throw new Error(`CII_METHOD_A_PHYSICAL_LIMIT_REQUIRED_3_TO_24:${process.env.CII_METHOD_A_PHYSICAL_LIMIT ?? ''}`);
}
const applied = setCiiMultiSourceMethodAPhysicalCandidateLimit(requested);
if (applied !== requested) throw new Error(`CII_METHOD_A_PHYSICAL_LIMIT_NOT_APPLIED:${requested}:${applied}`);
console.log(`VALIDATION_METHOD_A_PHYSICAL_LIMIT=${applied}`);
