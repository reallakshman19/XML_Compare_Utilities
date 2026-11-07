import {createHash} from 'node:crypto';

export const bytes=text=>Buffer.from(text,'utf8');
export const sha=text=>createHash('sha256').update(bytes(text)).digest('hex');
export const element=(from,to,dx,dy='-1.010100',dz='-1.010100')=>
  '<PIPINGELEMENT FROM_NODE="'+from+'" TO_NODE="'+to+
  '" DELTA_X="'+dx+'" DELTA_Y="'+dy+'" DELTA_Z="'+dz+
  '" DIAMETER="100" WALL_THICK="6.02"/>';
export const mmUnits='<UNITS><LENGTH LABEL="mm." FACTOR="25.400000"/></UNITS>';
export const model=(rows,units=mmUnits)=>
  '<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">'+
  '<PIPINGMODEL xmlns="" NUMELT="'+rows.length+'">'+
  rows.join('\n')+(units??'')+'</PIPINGMODEL></CAESARII>';
export const coincident=()=>model([
  element(10,20,'100'),element(20,30,'50'),element(30,40,'-150'),
  element(40,50,'10'),element(50,10,'-10'),
]);
export const separated=()=>model([
  element(10,20,'100'),element(20,40,'-99.998'),
]);
export const crossRun=()=>model([
  element(10,20,'100'),element(40,50,'20'),
]);
export const inconsistentLoop=()=>model([
  element(10,20,'100'),element(20,40,'-100'),
  element(40,10,'0.002'),
]);
export const accumulatedResidual=()=>model([
  element(10,20,'100'),element(20,40,'-100'),
  element(10,20,'100.0006'),element(20,40,'-99.9994'),
]);
