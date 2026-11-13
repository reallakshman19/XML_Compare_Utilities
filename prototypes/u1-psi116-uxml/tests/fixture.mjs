import {sha256Hex} from '../../_kit/core.mjs';
export function fixture(branches=2,nodes=3,{crlf=false,bom=false}={}) {
  const lines=['<?xml version="1.0" encoding="UTF-8"?>','<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd">','<Pipe>','<!-- invented fixture -->'];
  for(let b=0;b<branches;b++) {
    lines.push(`<Branch><Branchname>BR-${b}</Branchname><Temperature>  100 </Temperature><Pressure>2</Pressure><MaterialNumber>1</MaterialNumber><InsulationDensity>40</InsulationDensity><FluidDensity>800</FluidDensity>`);
    for(let n=0;n<nodes;n++) lines.push(`<Node><NodeNumber>${100+b*nodes+n}</NodeNumber><NodeName>N-${b}-${n}</NodeName><Endpoint>1</Endpoint><Rigid>2</Rigid><ComponentType>VALV</ComponentType><Weight>  10.0  </Weight><ComponentRefNo>REF-${b}-${n}</ComponentRefNo><ConnectionType>OPEN</ConnectionType><OutsideDiameter>60</OutsideDiameter><WallThickness>5</WallThickness><CorrosionAllowance>1</CorrosionAllowance><InsulationThickness>20</InsulationThickness><Position>${n*100} ${b*100} 0</Position><BendRadius>0</BendRadius><SIF>1</SIF><Restraint/><BendType>0</BendType><AlphaAngle>0</AlphaAngle></Node>`);
    lines.push('</Branch>');
  }
  lines.push('</Pipe>','</PipeStressExport>','');
  return new TextEncoder().encode((bom?'\uFEFF':'')+lines.join(crlf?'\r\n':'\n'));
}
export const ref=(b=0,n=0,nodes=3)=>({branchOrdinal:b,branchName:`BR-${b}`,nodeOrdinal:n,nodeNumber:String(100+b*nodes+n),componentRefNo:`REF-${b}-${n}`});
export const edit=(field,before,after,b=0,n=0,nodes=3)=>({ref:ref(b,n,nodes),field,before,after});
export const options=async bytes=>({fileSha256:await sha256Hex(bytes)});
