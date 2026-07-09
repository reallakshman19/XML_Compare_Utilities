import { DEFAULT_COORDINATE_CLUSTER_CONTRACT } from './table-categorized-xml-coordinate-cluster.js';

export const PS_MAPPING_TABLE_2_SAMPLE=`PS NO	Bore	pipe	DTXR	Support Gap	Mandatory	X	Y	Z
PS-XYZ.1	DN80	LINE-A	GUIDE	10	YES	1000	2000	3000
PS-XYZ.2	DN80	LINE-A	LINE STOP	0	YES	1001	2000	3000
PS-XYZ.7	DN80	LINE-A	REST	-	YES	999.5	2000	3000
PS-XYZ.10	DN80	LINE-A	GUIDE	10	YES	1000.2	2000	3000
PS-XYZ.3	DN80	LINE-A	GUIDE	10	YES	1500	2000	3000
PS-ABC.1	DN80	LINE-A	GUIDE	10	YES	1000	2000	3000`;

export const PS_MAPPING_TABLE_2_MODEL_SAMPLE=`PS NO	Bore	pipe	DTXR	Support Gap	Mandatory
PS-XYZ.1	DN80	LINE-A	GUIDE	10	YES
PS-XYZ.2	DN80	LINE-A	LINE STOP	0	YES
PS-XYZ.7	DN80	LINE-A	REST	-	YES
PS-XYZ.10	DN80	LINE-A	GUIDE	10	YES
PS-XYZ.3	DN80	LINE-A	GUIDE	10	YES
PS-ABC.1	DN80	LINE-A	GUIDE	10	YES`;

export const PS_MAPPING_COORDINATE_LOOKUP_SAMPLE=`PS NO	X	Y	Z
PS-XYZ.1	1000	2000	3000
PS-XYZ.2	1001	2000	3000
PS-XYZ.7	999.5	2000	3000
PS-XYZ.10	1000.2	2000	3000
PS-XYZ.3	1500	2000	3000
PS-ABC.1	1000	2000	3000`;

export const FIELD_COMPARISON_SAMPLE=`SupportISONOTE	Remarks
/SL-14143.1 :ISONOTE 'REST(2kN), GUIDE(2kN), [GUIDE GAP=25mm],LINE STOP(6kN)'	/SL-14143.3 :ISONOTE 'REST(2kN), GUIDE(2kN), [GUIDE GAP=15mm],LINE STOP(6kN)'
/SL-14144.1 :ISONOTE 'REST(3kN), GUIDE(2kN), [GUIDE GAP=20mm],LINE STOP(7kN)'	/SL-14144.2 :ISONOTE 'REST(3kN), GUIDE(2kN), [GUIDE GAP=20mm],LINE STOP(7kN)'`;

const psNo={op:'trim',column:'PS NO'};
const psBase={op:'fallback',resolvers:[{op:'regexExtract',input:psNo,pattern:'^(.+?)\\.\\d+$',group:1}],defaultResolver:psNo};
const cluster={op:'coordinateCluster',contract:DEFAULT_COORDINATE_CLUSTER_CONTRACT};
const feature={op:'classifier',column:'DTXR'};
const psNoS1={op:'trim',sourceId:'S1',column:'PS NO'};
const psBaseS1={op:'fallback',resolvers:[{op:'regexExtract',input:psNoS1,pattern:'^(.+?)\\.\\d+$',group:1}],defaultResolver:psNoS1};
const clusterS2={op:'coordinateCluster',sourceId:'S2',contract:{...DEFAULT_COORDINATE_CLUSTER_CONTRACT,axisMapping:{x:'X',y:'Y',z:'Z'}}};
const featureS1={op:'classifier',sourceId:'S1',column:'DTXR'};

const leftNote={op:'trim',column:'SupportISONOTE'};
const rightNote={op:'trim',column:'Remarks'};
const noteIdPattern=`^/?([^\\s/:'"]+)\\.(\\d+)\\s*:ISONOTE`;
const restPattern='\\bREST\\s*\\(\\s*([-+]?\\d*\\.?\\d+)\\s*kN\\s*\\)';
const guidePattern='\\bGUIDE\\s*\\(\\s*([-+]?\\d*\\.?\\d+)\\s*kN\\s*\\)';
const guideGapPattern='\\bGUIDE\\s+GAP\\s*=\\s*([-+]?\\d*\\.?\\d+)\\s*mm';
const lineStopPattern='\\bLINE\\s*STOP\\s*\\(\\s*([-+]?\\d*\\.?\\d+)\\s*kN\\s*\\)';
const leftBase=regex(leftNote,noteIdPattern,1), rightBase=regex(rightNote,noteIdPattern,1);
const leftRevision=regex(leftNote,noteIdPattern,2), rightRevision=regex(rightNote,noteIdPattern,2);
const leftRestKn=num(regex(leftNote,restPattern,1)), rightRestKn=num(regex(rightNote,restPattern,1));
const leftGuideKn=num(regex(leftNote,guidePattern,1)), rightGuideKn=num(regex(rightNote,guidePattern,1));
const leftGuideGapMm=num(regex(leftNote,guideGapPattern,1)), rightGuideGapMm=num(regex(rightNote,guideGapPattern,1));
const leftLineStopKn=num(regex(leftNote,lineStopPattern,1)), rightLineStopKn=num(regex(rightNote,lineStopPattern,1));
const restLoadStatus=cmp(leftRestKn,rightRestKn), guideLoadStatus=cmp(leftGuideKn,rightGuideKn), guideGapStatus=cmp(leftGuideGapMm,rightGuideGapMm), lineStopLoadStatus=cmp(leftLineStopKn,rightLineStopKn);

export const PS_MAPPING_TABLE_2_SHADOW_PROFILE=Object.freeze({
  schema:'UniversalCategorizerProfile.v1',profileId:'ps-mapping-table-2-shadow-profile',displayName:'PS Mapping Table 2 Shadow Profile',
  requiredColumns:Object.freeze(['PS NO','Bore','pipe','DTXR','Support Gap','Mandatory']),optionalColumns:Object.freeze(['X','Y','Z']),duplicateKeyPolicy:'merge-sourceRefs',multiValuePolicy:'single-feature-per-row',coordinateCluster:Object.freeze(DEFAULT_COORDINATE_CLUSTER_CONTRACT),
  rootPartitionMode:'static',rootPartitions:Object.freeze([{key:'MODEL_SIDE',displayName:'Model Side',sourceScope:Object.freeze(['S1'])}]),
  levelDefinitions:Object.freeze([Object.freeze({levelId:'categorizedTableGraph',levelType:'container',creationMode:'static',key:'CategorizedTableGraph',displayName:'CategorizedTableGraph',documentRoot:true,children:Object.freeze([Object.freeze({levelId:'rootPartition',levelType:'partition',creationMode:'static',key:'MODEL_SIDE',displayName:'RootPartition: MODEL_SIDE',children:Object.freeze([supportFamily(psBase,cluster,psNo,feature,{gapSource:null})])})])})])
});

export const PS_MAPPING_TABLE_2_COORDINATE_LOOKUP_PROFILE=Object.freeze({
  schema:'UniversalCategorizerProfile.v1',profileId:'ps-mapping-table-2-coordinate-lookup-profile',displayName:'PS Mapping Table 2 + Coordinate Lookup Profile',
  requiredColumns:Object.freeze(['PS NO','Bore','pipe','DTXR','Support Gap','Mandatory']),optionalColumns:Object.freeze(['X','Y','Z']),duplicateKeyPolicy:'merge-sourceRefs',multiValuePolicy:'single-feature-per-row',coordinateCluster:Object.freeze(DEFAULT_COORDINATE_CLUSTER_CONTRACT),drivingSourceId:'S1',
  rootPartitionMode:'static',rootPartitions:Object.freeze([{key:'MODEL_SIDE',displayName:'Model Side',sourceScope:Object.freeze(['S1','S2'])}]),
  joins:Object.freeze([Object.freeze({joinId:'join_table2_coordinates',leftSourceId:'S1',rightSourceId:'S2',joinType:'left',leftKeyResolver:{sourceId:'S1',column:'PS NO',pipeline:Object.freeze([{op:'trim'}])},rightKeyResolver:{sourceId:'S2',column:'PS NO',pipeline:Object.freeze([{op:'trim'}])},outputAlias:'coordinateLookup',duplicatePolicy:'diagnostic',missingPolicy:'warning'})]),
  levelDefinitions:Object.freeze([Object.freeze({levelId:'categorizedTableGraph',levelType:'container',creationMode:'static',key:'CategorizedTableGraph',displayName:'CategorizedTableGraph',documentRoot:true,children:Object.freeze([Object.freeze({levelId:'rootPartition',levelType:'partition',creationMode:'static',key:'MODEL_SIDE',displayName:'RootPartition: MODEL_SIDE',children:Object.freeze([supportFamily(psBaseS1,clusterS2,psNoS1,featureS1,{gapSource:'S1'})])})])})])
});

export const FIELD_COMPARISON_SAMPLE_PROFILE=Object.freeze({
  schema:'UniversalCategorizerProfile.v1',profileId:'field-comparison-sample-profile',displayName:'Field-level Comparison Sample Recipe',
  requiredColumns:Object.freeze(['SupportISONOTE','Remarks']),optionalColumns:Object.freeze([]),duplicateKeyPolicy:'merge-sourceRefs',multiValuePolicy:'single-feature-per-row',coordinateCluster:Object.freeze(DEFAULT_COORDINATE_CLUSTER_CONTRACT),
  rootPartitionMode:'static',rootPartitions:Object.freeze([{key:'FIELD_COMPARISON',displayName:'Field Comparison',sourceScope:Object.freeze(['S1'])}]),
  exportPolicy:Object.freeze({documentRootTag:'FieldComparisonReport',rootPartitionTag:'ComparisonPartition',includeDiagnosticsElement:true,childElementFields:Object.freeze(['leftSupportBase','rightSupportBase','leftRevision','rightRevision','restLoadStatus','guideLoadStatus','guideGapStatus','lineStopLoadStatus','comparisonSummary'])}),
  levelDefinitions:Object.freeze([Object.freeze({levelId:'fieldComparisonReport',xmlTag:'FieldComparisonReport',levelType:'container',creationMode:'static',key:'FieldComparisonReport',displayName:'FieldComparisonReport',documentRoot:true,children:Object.freeze([Object.freeze({levelId:'comparisonPartition',xmlTag:'ComparisonPartition',levelType:'partition',creationMode:'static',key:'FIELD_COMPARISON',displayName:'Field Comparison',children:Object.freeze([Object.freeze({levelId:'comparisonItem',xmlTag:'ComparisonItem',levelType:'group',creationMode:'one-per-key',keyResolver:{op:'fallback',resolvers:Object.freeze([leftBase,rightBase]),defaultResolver:{op:'concat',parts:Object.freeze(['row_',{op:'trim',column:'SupportISONOTE'}])}},displayNameResolver:leftBase,fieldResolvers:Object.freeze({leftSupportBase:leftBase,rightSupportBase:rightBase,leftRevision,rightRevision,leftRestKn,rightRestKn,restLoadStatus,leftGuideKn,rightGuideKn,guideLoadStatus,leftGuideGapMm,rightGuideGapMm,guideGapStatus,leftLineStopKn,rightLineStopKn,lineStopLoadStatus,comparisonSummary:{op:'template',template:'{{leftSupportBase}} rev {{leftRevision}} vs {{rightRevision}}: REST {{restLoadStatus}}, GUIDE load {{guideLoadStatus}}, GUIDE GAP {{guideGapStatus}}, LINE STOP {{lineStopLoadStatus}}.',values:Object.freeze({leftSupportBase:leftBase,leftRevision,rightRevision,restLoadStatus,guideLoadStatus,guideGapStatus,lineStopLoadStatus})}}),children:Object.freeze([])})])})])})])
});

function regex(input,pattern,group){return Object.freeze({op:'regexExtract',input,pattern,group,flags:'i'});}
function num(input){return Object.freeze({op:'numberParser',input});}
function cmp(left,right){return Object.freeze({op:'compare',mode:'number',left,right,tolerance:0,matchValue:'MATCH',mismatchValue:'MISMATCH'});}
function supportFamily(baseResolver,clusterResolver,psNoResolver,featureResolver,{gapSource=null}={}){return Object.freeze({levelId:'supportFamily',levelType:'group',creationMode:'one-per-key',keyResolver:{op:'fallback',resolvers:[{op:'concat',parts:[baseResolver,'__',clusterResolver]}],defaultResolver:baseResolver},displayNameResolver:baseResolver,children:Object.freeze([Object.freeze({levelId:'supportOccurrence',levelType:'occurrence',creationMode:'one-per-key',keyResolver:psNoResolver,displayNameResolver:psNoResolver,children:Object.freeze([Object.freeze({levelId:'supportFeature',levelType:'feature',creationMode:'one-per-key',keyResolver:{op:'concat',parts:[psNoResolver,'_',featureResolver]},displayNameResolver:featureResolver,fieldResolvers:Object.freeze({featureType:featureResolver}),children:Object.freeze([Object.freeze({levelId:'gap',levelType:'measure',creationMode:'zero-or-one',keyResolver:{op:'concat',parts:[psNoResolver,'_',featureResolver,'_Gap']},displayName:'Gap',fieldResolvers:Object.freeze({rawValue:{op:'trim',sourceId:gapSource||undefined,column:'Support Gap'},value:{op:'numberParser',sourceId:gapSource||undefined,column:'Support Gap',severity:'INFO'}})})])})])})])});}
