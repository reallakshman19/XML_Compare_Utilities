/**
 * Issue #106 / W4: separate aggregate SOURCE/TARGET path-length policy.
 * Do not substitute this for Method A residuals, Method B run tolerances, or
 * M1 spatial endpoint matching. This computes dimensional evidence ONLY.
 */
export const CII_PATH_TOTAL_LENGTH_DEFAULTS=Object.freeze({toleranceMm:100,maxToleranceMm:1000});
export function validateCiiPathTotalLengthToleranceMm(value) {
  if (value===null || value===undefined || String(value).trim()==='') throw new RangeError('CII_PATH_TOTAL_LENGTH_TOLERANCE_INVALID');
  const mm=Number(value);
  if(!Number.isFinite(mm)||mm<0||mm>CII_PATH_TOTAL_LENGTH_DEFAULTS.maxToleranceMm)
    throw new RangeError('CII_PATH_TOTAL_LENGTH_TOLERANCE_INVALID');
  return mm;
}
export function evaluateCiiPathTotalLength(sourcePath,targetPath,options={}) {
  const toleranceMm=validateCiiPathTotalLengthToleranceMm(options.pathTotalLengthToleranceMm??CII_PATH_TOTAL_LENGTH_DEFAULTS.toleranceMm);
  const sourceLengthMm=Number(sourcePath?.totalLengthMm);
  const targetLengthMm=Number(targetPath?.totalLengthMm);
  if(!Number.isFinite(sourceLengthMm)||!Number.isFinite(targetLengthMm)||sourceLengthMm<0||targetLengthMm<0)
    return Object.freeze({schema:'CiiPathTotalLengthEvidence.v1',status:'UNAVAILABLE',
      sourceLengthMm:null,targetLengthMm:null,deltaMm:null,toleranceMm,lengthPass:false,identityCertified:false,writerAuthorized:false,
      blocker:'NONFINITE_OR_NEGATIVE_PATH_LENGTH'});
  const deltaMm=Math.abs(sourceLengthMm-targetLengthMm);
  return Object.freeze({
    schema:'CiiPathTotalLengthEvidence.v1',
    status:deltaMm<=toleranceMm?'LENGTH_COMPATIBLE':'LENGTH_INCOMPATIBLE',
    sourceLengthMm,targetLengthMm,deltaMm,toleranceMm,lengthPass:deltaMm<=toleranceMm,
    identityCertified:false,writerAuthorized:false,
    policyScope:'NORMALIZED_ENGINEERING_PATH_LENGTH_ONLY',
  });
}
