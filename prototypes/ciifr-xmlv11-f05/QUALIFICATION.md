# Qualification of this local prototype

The primary private CII reproduced exactly:803,776bytes, SHA-256 `5715c23f250d683a6c29ba84c2db9f01aae25788791317b99064c845bc2cdd57`. This is actual Windows Python execution, direct byte comparison and independently computed digests. The original source is not bundled.

| Check | Status | Evidence scope |
|---|---|---|
| Local HTTP smoke |20PASS,0FAIL| Actual CII/XML HTTP requests, byte/SHA equality, absent-baseline NOT_RUN, differing-baseline detection, invalid inputs, Host/Origin/route/body limits |
| Encoding and upload bounds |10PASS,0FAIL| Real primary UTF8/UTF16LE/UTF16BE XML reconstructs exact CII and parseable UTF8 inspection; small DTD/entity envelopes reject in5encodings; oversized UTF32 model uploads reject |
| XML edit causality |5PASS,0FAIL| Numeric/label output equals independent literal source-byte edits; unrepresentable values, missing pointer and duplicate section reject without output |
| F05 retained suite |15accepted/9rejected PASS| Independently authored source-byte variants retained from coder suite, separately executed against exact bundled modules |
| V11-01,03–09 |8PASS| Coder benchmark suite separately executed on Windows against bundled modules |
| V11-02 Linux chroot/seccomp |NOT_RUN| Linux-specific harness unavailable on Windows; no equivalent kernel isolation claim |
| V11-10 actual integration |NOT_RUN| Two-cycle and XML formatting stability pass; real destination integration before/after inventory unavailable |
| Browser rendering |PASS| Actual browser initial interface and controls observed |
| Automated file-driven browser flow |NOT_RUN| Prior file-upload permission was declined; no alternate browser/file-injection workaround used |
| Native CAESAR / Owner engineering acceptance |NOT_RUN| Owner decision remains separate |

All35HTTP/encoding/edit checks are parent-authored self-assessment of the new wrapper, not a new independent reviewer verdict. Prior independent F05 review applies to the unchanged engine modules. The full private package matches40/40members of the reviewed code-only archive; all8bundled Python engine files remain byte-identical. Frozen P2.1 archive hash was rechecked unchanged. No P2/P2.1 source was edited.

Test development record: the first encoding report retained6PASS/2FAIL because its expectation required a DTD diagnostic for UTF32 primary XML already above16MiB. The server correctly rejected the size first. That report and pre-change test snapshot remain private. The corrected suite isolates in-limit DTD cases and explicitly tests oversized models; no production code or validation limits changed to obtain green results.

The profile qualification remains bounded. Exact reconstruction of these inputs does not establish general populated-section support, engineering-property equivalence, branch/node transfer readiness or release acceptance. The interface provides conversion/inspection only.
