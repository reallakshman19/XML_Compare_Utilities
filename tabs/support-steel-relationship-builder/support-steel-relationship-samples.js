export const SUPPORT_STEEL_SAMPLE_SUPPORT = Object.freeze([
  {
    name: '/ASIM-1836-6"-P9001001/B1',
    type: 'BRANCH',
    attributes: { NAME: '/ASIM-1836-6"-P9001001/B1' },
    children: [
      {
        name: 'SUPPORT PS-14259',
        type: 'ATTA',
        attributes: {
          NAME: '/PS-14259/DATUM',
          OWNER: '/ASIM-1836-6"-P9001001/B1',
          POS: { x: 437500, y: -1159000, z: 2100 },
          SUPPORT_TAG: 'PS-14259',
          STRUCTURE_REF: '/SL-4201',
          CMPSUPTYPE: 'REST',
        },
      },
      {
        name: 'SUPPORT PS-14259',
        type: 'ATTA',
        attributes: {
          NAME: '/PS-14259.1',
          OWNER: '/ASIM-1836-6"-P9001001/B1',
          POS: { x: 437500, y: -1159000, z: 2100 },
          CMPSUPTYPE: 'SH-150',
          DTXR: 'PIPE SHOE SH-150',
        },
      },
      {
        name: 'SUPPORT PS-14259',
        type: 'ATTA',
        attributes: {
          NAME: '/PS-14259.2',
          OWNER: '/ASIM-1836-6"-P9001001/B1',
          POS: { x: 437500, y: -1159000, z: 2100 },
          CMPSUPTYPE: 'W.PAD THK 6mm',
          DTXR: 'WEAR PLATE TYPE-421 PAD L 550mm',
        },
      },
    ],
  },
  {
    name: '/ASIM-1836-4"-P9001002/B3',
    type: 'BRANCH',
    attributes: { NAME: '/ASIM-1836-4"-P9001002/B3' },
    children: [
      {
        name: 'SUPPORT PS-14259',
        type: 'ATTA',
        attributes: {
          NAME: '/PS-14259/SREF',
          OWNER: '/ASIM-1836-4"-P9001002/B3',
          POS: { x: 437500, y: -1159000, z: 2100 },
          STEEL_REF: '/SL-4201',
          DTXR: 'STRUCTURAL REFERENCE',
        },
      },
      {
        name: 'SUPPORT PS-14260',
        type: 'ATTA',
        attributes: {
          NAME: '/PS-14260/DATUM',
          OWNER: '/ASIM-1836-4"-P9001002/B3',
          POS: { x: 438050, y: -1159500, z: 2100 },
          CMPSUPTYPE: 'REST',
        },
      },
    ],
  },
]);

export const SUPPORT_STEEL_SAMPLE_STEEL = Object.freeze([
  {
    name: '/SL-4201',
    type: 'STEEL_GROUP',
    attributes: {
      NAME: '/SL-4201',
      POS: { x: 437500, y: -1159000, z: 2100 },
      DESCRIPTION: 'PIPE SUPPORT STEEL GROUP',
    },
    children: [
      {
        name: '/SL-4201/BEAM-01',
        type: 'SCTN',
        attributes: {
          NAME: '/SL-4201/BEAM-01',
          POS: { x: 437500, y: -1159000, z: 2100 },
          DTXR: 'STEEL SECTION',
        },
      },
    ],
  },
  {
    name: '/SL-4202',
    type: 'STEEL_GROUP',
    attributes: {
      NAME: '/SL-4202',
      POS: { x: 438000, y: -1159500, z: 2100 },
      DESCRIPTION: 'SECONDARY STEEL GROUP',
    },
  },
]);

export function supportSteelSampleText(kind) {
  const value = kind === 'steel' ? SUPPORT_STEEL_SAMPLE_STEEL : SUPPORT_STEEL_SAMPLE_SUPPORT;
  return JSON.stringify(value, null, 2);
}
