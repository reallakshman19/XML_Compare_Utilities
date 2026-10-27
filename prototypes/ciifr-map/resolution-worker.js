import {searchResolution} from './resolution-search.js';

self.onmessage = async event => {
  const input = event.data;
  try {
    const result = await searchResolution(input, {onProgress:progress =>
      self.postMessage({snapshotId:input.snapshotId,progress})});
    self.postMessage({snapshotId:input.snapshotId,result});
  } catch (error) { self.postMessage({snapshotId:input.snapshotId,error:error.message}); }
};
