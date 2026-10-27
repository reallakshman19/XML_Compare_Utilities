const directions={
  Z:{top:[0,.001,1],bottom:[0,-.001,-1],front:[0,1,.001],back:[0,-1,.001],right:[1,.001,0],left:[-1,.001,0],iso:[1,1,.8]},
  Y:{top:[0,1,.001],bottom:[0,-1,.001],front:[0,.001,1],back:[0,.001,-1],right:[1,.001,0],left:[-1,.001,0],iso:[1,.8,1]},
  X:{top:[1,.001,0],bottom:[-1,-.001,0],front:[.001,1,0],back:[.001,-1,0],right:[.001,0,1],left:[.001,0,-1],iso:[.8,1,1]},
};
const unit=v=>v.map(x=>x/Math.hypot(...v));
/** A preset label is a measured camera direction, never inferred from evidence projection. */
export function cameraPresentation(state) {
  let preset='custom';
  if (state?.cameraPositionWorld?.length===3 && state.cameraTargetWorld?.length===3) {
    const actual=unit(state.cameraPositionWorld.map((x,i)=>x-state.cameraTargetWorld[i]));
    preset=Object.entries(directions[state.verticalAxis]||{}).find(([,v])=>
      unit(v).every((x,i)=>Math.abs(x-actual[i])<1e-4))?.[0] || 'custom';
  }
  const name=preset==='iso'?'Isometric':preset==='custom'?'Custom / orbit':preset[0].toUpperCase()+preset.slice(1);
  return {preset,label:'3D camera · '+name+' · '+(state?.cameraType||'initializing')+
    ' · vertical '+(state?.verticalAxis||'Z')};
}
