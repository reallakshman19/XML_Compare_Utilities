import { makeCii } from './fixture-tools.mjs';

// Branch endpoints repeat intentionally. XML node numbers are evidence only.
export function makePsi116Case({branches=3,nodes=4,renumber=0,move=false,ambiguous=false,nearest=false}={}) {
  const count=branches*(nodes-1)+1, id=i=>10+i+renumber;
  const elements=Array.from({length:count-1},(_,i)=>({from:id(i),to:id(i+1),d:[100,0,0]}));
  const coords=[{node:id(0),xyz:[0,0,0]}];
  if (ambiguous) elements.push({from:id(0),to:900000,d:[0.5,0,0]});
  const xml='<PipeStressExport><Group>'+Array.from({length:branches},(_,b)=>'<Branch><Branchname>B'+b+'</Branchname>'+Array.from({length:nodes},(_,n)=>{
    const i=b*(nodes-1)+n, x=i*100+(move&&b===1&&n===1?5:nearest&&b===1&&n===1?0.5:0);
    return `<Node><NodeNumber>${10+i}</NodeNumber><ComponentRefNo>R${b}-${n}</ComponentRefNo><Position>${x} 0 0</Position></Node>`;
  }).join('')+'</Branch>').join('')+'</Group></PipeStressExport>';
  return {xml:new TextEncoder().encode(xml),cii:makeCii({elements,coords})};
}
