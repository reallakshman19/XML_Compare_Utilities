# InputXML Workspace Phase 2 capability

The workspace now treats CleanXML and InputXML as different contracts:

```text
CleanXML (Branch/Node)
→ Tab 3 XML-to-InputXML
→ validated positive-element InputXML
→ Tab 2 sideload enrichment
```

The workspace records routing, schema rejection, successful 5C handoff, stale-output invalidation, zero-row results and action failures in `inputxml-workspace-diagnostics/v1`.
