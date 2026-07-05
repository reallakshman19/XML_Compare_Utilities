export const PS_FAMILY_SAMPLE_CLASH_XML = `<exchange>
  <batchtest>
    <clashtests>
      <clashtest>
        <clashresults>
          <clashresult name="Sample Clash 1" guid="sample-clash-1" status="new" distance="-0.010">
            <clashpoint><pos3f x="1" y="2" z="3"/></clashpoint>
            <clashobjects>
              <clashobject>
                <pathlink><node>File</node><node>SAMPLE.rvm</node><node>/SAMPLE-CU-SU</node><node>/PS-90001</node><node>/PS-90001/MAIN</node><node>/PS-90001-BAR-1</node></pathlink>
                <smarttags><smarttag><name>Item Name</name><value>/PS-90001-BAR-1</value></smarttag></smarttags>
              </clashobject>
              <clashobject>
                <pathlink><node>File</node><node>SAMPLE.rvm</node><node>/SAMPLE-CU-PI</node><node>/SAMPLE-100-D90001-31441C4-PP-01</node><node>/SAMPLE-100-D90001-31441C4-PP-01/B1</node><node>/PS-90001.1</node></pathlink>
                <smarttags><smarttag><name>Item Name</name><value>/PS-90001.1</value></smarttag></smarttags>
              </clashobject>
            </clashobjects>
          </clashresult>
          <clashresult name="Sample Clash 2" guid="sample-clash-2" status="new" distance="-0.005">
            <clashpoint><pos3f x="4" y="5" z="6"/></clashpoint>
            <clashobjects>
              <clashobject>
                <pathlink><node>File</node><node>SAMPLE.rvm</node><node>/SAMPLE-CU-SU</node><node>/PS-90001</node><node>/PS-90001/MAIN</node><node>/PS-90001-BAR-1</node></pathlink>
                <smarttags><smarttag><name>Item Name</name><value>/PS-90001-BAR-1</value></smarttag></smarttags>
              </clashobject>
              <clashobject>
                <pathlink><node>File</node><node>SAMPLE.rvm</node><node>/SAMPLE-CU-PI</node><node>/SAMPLE-50-P90002-31441C4-PP-01</node><node>/SAMPLE-50-P90002-31441C4-PP-01/B1</node><node>/PS-90002.1</node></pathlink>
                <smarttags><smarttag><name>Item Name</name><value>/PS-90002.1</value></smarttag></smarttags>
              </clashobject>
            </clashobjects>
          </clashresult>
        </clashresults>
      </clashtest>
    </clashtests>
  </batchtest>
</exchange>`;

export const PS_FAMILY_SAMPLE_EXPECTED_CSV = `Item Name,PDMS DESC
/PS-90001.1,Sample found member
/PS-90001.2,Sample missing member
/Copy-(2)-of-PS-90001.3,Sample copy identity member`;

export const PS_FAMILY_SAMPLE_DETAIL_CSV = `Name of the element,p1bore,pipe,RTEXT of detailing text,SUPPORT GAP,Reference of the element,Position,ISOMETRIC NOTES
PS-90001.1,100.00,SAMPLE-100-D90001-31441C4-PP-01,Sample guide,,=SAMPLE/1,E 1000mm S 2000mm U 3000mm,
PS-90001.2,100.00,SAMPLE-100-D90001-31441C4-PP-01,Sample missing support,,=SAMPLE/2,E 1020mm S 2000mm U 3000mm,
Copy-(2)-of-PS-90001.3,100.00,SAMPLE-100-D90001-31441C4-PP-01,Sample copy support,,=SAMPLE/3,E 2000mm S 2000mm U 3000mm,`;

export const PS_FAMILY_SAMPLE_INPUTS = Object.freeze({
  xml: Object.freeze({
    key: 'xml',
    textareaKey: 'xml',
    label: 'Load sample clash XML',
    statusText: 'Official sample clash XML loaded',
    text: PS_FAMILY_SAMPLE_CLASH_XML,
  }),
  expected: Object.freeze({
    key: 'expected',
    textareaKey: 'expected',
    label: 'Load sample expected CSV',
    statusText: 'Official sample expected CSV loaded',
    text: PS_FAMILY_SAMPLE_EXPECTED_CSV,
  }),
  details: Object.freeze({
    key: 'details',
    textareaKey: 'details',
    label: 'Load sample detail CSV',
    statusText: 'Official sample detail CSV loaded',
    text: PS_FAMILY_SAMPLE_DETAIL_CSV,
  }),
});

export function listPsFamilySampleInputs() {
  return Object.values(PS_FAMILY_SAMPLE_INPUTS);
}
