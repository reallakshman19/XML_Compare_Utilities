// Isolated review-only tile helper. Call from the native tab only after G2 exact-file grant.
import { mountMethodC } from './cii-workspace-method-c-ui.js';
// Native intake is lazy-loaded only when existing Workspace documents are supplied.

const TILE_ID = 'data-ciiw-open-method-c';
const CSS_ID = 'cii-workspace-method-c-style';
export function installMethodCReviewTile(container,options={}){
  if(!container?.ownerDocument||!container.querySelector)
    throw new Error('METHOD_C_NATIVE_TAB_CONTAINER_REQUIRED');
  if(container.querySelector('['+TILE_ID+']'))
    throw new Error('METHOD_C_DUPLICATE_TILE_MOUNT');
  const doc=container.ownerDocument;
  const tile=doc.createElement('button');
  tile.type='button';tile.className='psmap-card psmap-tile';
  tile.setAttribute(TILE_ID,'1');
  const label=doc.createElement('b');label.textContent='Method C — Geometry Overlay';
  const descriptor=doc.createElement('span');
  descriptor.textContent='Original CII geometry · independent anchors · read-only NODE/segment review';
  tile.append(label,descriptor);
  container.appendChild(tile);
  let disposed=false,active=null,backdrop=null,epoch=0;
  const ensureStyle=()=>{
    if(doc.getElementById(CSS_ID))return;
    const link=doc.createElement('link');link.id=CSS_ID;link.rel='stylesheet';
    link.href=new URL('./cii-workspace-method-c-ui.css',import.meta.url).href;
    doc.head.appendChild(link);
  };
  const close=()=>{
    ++epoch;active?.dispose?.();active=null;
    backdrop?.remove();backdrop=null;
  };
  const onKeyDown=event=>{if(event.key==='Escape'&&backdrop)close();};
  const open=async()=>{
    if(disposed||backdrop)return;
    ensureStyle();const run=++epoch;
    const outer=doc.createElement('div');outer.className='ciiw-backdrop';
    outer.setAttribute('data-ciiw-method-c-backdrop','1');
    outer.setAttribute('role','dialog');outer.setAttribute('aria-modal','true');
    outer.setAttribute('aria-label','Method C read-only geometry overlay');
    const closeButton=doc.createElement('button');closeButton.type='button';
    closeButton.setAttribute('data-ciiw-method-c-close','1');
    closeButton.textContent='Close Method C (read only)';
    const root=doc.createElement('div');root.setAttribute('data-ciiw-method-c-root','1');
    outer.append(closeButton,root);doc.body.appendChild(outer);
    backdrop=outer;closeButton.addEventListener('click',close);
    try{
      if(options.sourceDocument||options.targetDocument){
        if(!options.sourceDocument||!options.targetDocument)
          throw new Error('METHOD_C_NATIVE_DOCUMENT_PAIR_REQUIRED');
        const { mountMethodCFromNativeWorkspace } = await import('./cii-workspace-method-c-native-adapter.js');
        active=await mountMethodCFromNativeWorkspace(root,options,{
          cryptoRef:options.cryptoRef});
      }else active=mountMethodC(root);
      if(disposed||run!==epoch){active?.dispose?.();active=null;}
    }catch(error){
      if(run!==epoch||disposed)return;
      root.textContent='Method C original-file custody was rejected: '+error.message;
      active=null;
    }
  };
  const onOpen=()=>{void open();};
  tile.addEventListener('click',onOpen);
  doc.addEventListener('keydown',onKeyDown);
  return {
    get open(){return Boolean(backdrop);},
    get readOnly(){return true;},
    close,
    destroy(){
      if(disposed)return;
      disposed=true;close();tile.removeEventListener('click',onOpen);
      doc.removeEventListener('keydown',onKeyDown);tile.remove();
    },
  };
}
