// Entirely invented PSI116 documents, no project data.
const tag=(k,v)=>`<${k}>${v}</${k}>`;
export const node=(name,od=60.3,weight=1,extra={})=>({NodeName:name,OutsideDiameter:od,Weight:weight,WallThickness:4,CorrosionAllowance:1,InsulationThickness:0,Position:'0 0 0',...extra});
export const branch=(nodes,extra={})=>({nodes,Temperature:100,Pressure:2,FluidDensity:800,MaterialNumber:1,InsulationDensity:50,...extra});
export function xml(branches){return new TextEncoder().encode('<PipeStressExport><Pipe>'+branches.map(({nodes,...b},i)=>'<Branch>'+tag('Branchname',`B${i}`)+Object.entries(b).map(([k,v])=>tag(k,v)).join('')+nodes.map((n,j)=>'<Node>'+tag('NodeNumber',String(j+1))+tag('ComponentRefNo',`C${i}-${j}`)+Object.entries(n).map(([k,v])=>tag(k,v)).join('')+'</Node>').join('')+'</Branch>').join('')+'</Pipe></PipeStressExport>');}
export const ref=(i,j)=>({branchOrdinal:i,branchName:`B${i}`,nodeOrdinal:j,nodeNumber:String(j+1),componentRefNo:`C${i}-${j}`});
export const pair=(i,j,k=i,l=j)=>({source:ref(i,j),target:ref(k,l)});
export function large(){const make=src=>xml(Array.from({length:41},(_,i)=>branch(Array.from({length:40},(_,j)=>node(`${src?'S':'T'}${i}-${j}`,60.3,src?2:1,{WallThickness:src?5:4})),{Temperature:src?110:100})));return {source:make(true),target:make(false),pairs:Array.from({length:41},(_,i)=>Array.from({length:40},(_,j)=>pair(i,j))).flat()};}
