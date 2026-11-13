// Entirely invented PSI116. Branch endpoints intentionally repeat.
export function makePsi116PairDoc({branches=3,nodes=4,renumber=0,move=false,boreChange=false,near=false,extraPoint=false,weight=1,reverseBranches=false,missingOD=false}={}) {
  const bs=Array.from({length:branches},(_,b)=>`<Branch><Branchname>B${b}</Branchname>`+Array.from({length:nodes},(_,n)=>{
    const i=b*(nodes-1)+n, selected=b===1&&n===1;
    const x=i*100+(selected&&move?5:selected&&near?0.5:0);
    return `<Node><NodeNumber>${10+i+renumber}</NodeNumber><ComponentRefNo>R${b}-${n}</ComponentRefNo><Position>${x} 0 0</Position>${selected&&missingOD?'':`<OutsideDiameter>${selected&&boreChange?88.9:60.3}</OutsideDiameter>`}<Weight>${weight}</Weight><NodeName>N${b}-${n}</NodeName></Node>`;
  }).join('')+'</Branch>');
  if(reverseBranches)bs.reverse();
  if(extraPoint)bs.push('<Branch><Branchname>extra</Branchname><Node><NodeNumber>9000</NodeNumber><ComponentRefNo>extra</ComponentRefNo><Position>0.5 0 0</Position><OutsideDiameter>60.3</OutsideDiameter></Node></Branch>');
  return new TextEncoder().encode('<PipeStressExport><Group>'+bs.join('')+'</Group></PipeStressExport>');
}
