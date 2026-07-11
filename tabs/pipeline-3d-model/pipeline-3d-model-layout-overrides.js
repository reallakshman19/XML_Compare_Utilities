const STYLE_ID = 'pipeline-3d-model-layout-overrides';

const CSS = `
.pipeline-3d-model-backdrop{
  place-items:stretch!important;
  padding:0!important;
}
.pipeline-3d-model-dialog{
  width:100vw!important;
  max-width:none!important;
  height:100vh!important;
  max-height:none!important;
  border-radius:0!important;
  border-left:0!important;
  border-right:0!important;
  box-shadow:none!important;
}
.pipeline-3d-model-dialog>.psmap-card-head{
  min-height:44px!important;
  padding:10px 56px 10px 16px!important;
  box-sizing:border-box!important;
}
.pipeline-3d-model-dialog>.psmap-card-body{
  padding:12px 14px 16px!important;
}
.p3d-close{
  top:9px!important;
  right:14px!important;
}
.p3d-input-grid{
  grid-template-columns:minmax(280px,1.2fr) minmax(220px,.85fr) minmax(220px,.85fr)!important;
  align-items:start!important;
}
.p3d-input-grid label,
.p3d-input-panel,
.p3d-tablex-shell,
.p3d-axis-grid label,
.p3d-branch-grid label{
  min-width:0!important;
  max-width:100%!important;
  box-sizing:border-box!important;
}
.p3d-input-grid textarea,
.p3d-tablex-shell textarea{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
  resize:vertical!important;
}
.p3d-input-grid textarea{
  min-height:118px!important;
  max-height:240px!important;
}
.p3d-tablex-shell textarea{
  min-height:92px!important;
  max-height:180px!important;
}
.p3d-axis-grid{
  grid-template-columns:minmax(120px,180px) minmax(120px,180px) auto!important;
  justify-content:start!important;
}
.p3d-axis-grid input,
.p3d-branch-grid input,
.p3d-ocr-review input{
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
}
.p3d-branch-grid{
  grid-template-columns:repeat(auto-fit,minmax(150px,190px))!important;
  align-items:start!important;
  justify-content:start!important;
}
.p3d-actions{
  flex-wrap:wrap!important;
  align-items:center!important;
}
.p3d-output pre{
  max-height:190px!important;
  white-space:pre!important;
}
@media (max-width:900px){
  .p3d-input-grid{
    grid-template-columns:1fr!important;
  }
  .p3d-axis-grid{
    grid-template-columns:1fr 1fr!important;
  }
  .p3d-axis-grid .p3d-ocr-toolbar{
    grid-column:1 / -1!important;
  }
}
`;

function installPipeline3dModelLayoutOverrides(doc = globalThis.document) {
  if (!doc || doc.getElementById(STYLE_ID)) return null;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head?.appendChild(style);
  return style;
}

installPipeline3dModelLayoutOverrides();

export { CSS as PIPELINE_3D_MODEL_LAYOUT_OVERRIDES, installPipeline3dModelLayoutOverrides };
