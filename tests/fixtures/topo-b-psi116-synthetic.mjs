/** Synthetic only. NEVER add an Owner PSI116 file to this fixture family. */
export const VERIFIED_PSI116_NAMESPACE = 'http://aveva.com/pipeStress116.xsd';

export function syntheticPsi116({branches = 2, nodesPerBranch = 3, namespace = VERIFIED_PSI116_NAMESPACE,
  branchPrefix = 'UPLOADED'} = {}) {
  const data = Array.from({length: branches}, (_, branch) => {
    const nodes = Array.from({length: nodesPerBranch}, (_, index) => {
      const id = 210 + branch * 100 + index * 10;
      const xyz = [branch * 1000 + index * 100, branch * 100, index * 50].join(' ');
      return `<Node><NodeNumber>${id}</NodeNumber><NodeName>/PSI-${id}</NodeName>
        <Position>${xyz}</Position><ComponentType>PIPE</ComponentType>
        <ComponentRefNo>P-${branch + 1}-${index + 1}</ComponentRefNo><OutsideDiameter>100</OutsideDiameter></Node>`;
    }).join('\n');
    return `<Branch><Branchname>${branchPrefix}-${branch + 1}</Branchname>${nodes}</Branch>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<PipeStressExport xmlns="${namespace}" id="SYNTHETIC_ONLY">
  ${data}
</PipeStressExport>`;
}
