# CategorizedInputXML Browser Worker Transport

Browser-worker transport for:

- `CategorizedInputXmlService.v1`
- `InputXmlChangeSetService.v1`

## Public entrypoint

```text
xml-compare/categorized-inputxml-worker/index.js
```

## Worker entrypoint

```text
xml-compare/categorized-inputxml-worker/categorized-inputxml.worker.js
```

## Client construction

```javascript
import {
  createCategorizedInputXmlWorkerClient,
} from '../../xml-compare/categorized-inputxml-worker/index.js';

const client = createCategorizedInputXmlWorkerClient();
```

The default constructor creates a module worker. Tests or alternate hosts may inject a Worker-compatible object explicitly.

No UI, HTTP, storage, CII conversion, or service mutation is included.
