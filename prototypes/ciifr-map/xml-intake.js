import {sha256RawBytes} from '../../tabs/cii-workspace/cii-workspace-method-c-original-geometry.js';
import {extractXmlProfile} from './xml-profiles.js';
import {buildXmlGraph} from './xml-graph.js';
import {fail} from './xml-utils.js';

export async function readXmlGraph(bytes, {member, expectedXmlSha256, cryptoRef = globalThis.crypto,
  parser = globalThis.DOMParser && new globalThis.DOMParser()} = {}) {
  if (!(bytes instanceof Uint8Array || bytes instanceof ArrayBuffer)) fail('XML_BYTES_REQUIRED');
  const snapshot = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes.slice(0));
  if (!snapshot.length || snapshot.length > 32 * 1024 * 1024) fail('XML_BYTE_SIZE_LIMIT');
  const sha256 = await sha256RawBytes(snapshot, cryptoRef);
  if (expectedXmlSha256 && sha256 !== expectedXmlSha256.toLowerCase()) fail('XML_SHA256_MISMATCH');
  const text = new TextDecoder('utf-8', {fatal: true}).decode(snapshot);
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) fail('XML_DTD_OR_ENTITY_FORBIDDEN');
  if (/<\?xml[^>]*encoding\s*=\s*["'](?!utf-8["'])/i.test(text)) fail('XML_ONLY_UTF8_SUPPORTED');
  if (!parser?.parseFromString) fail('NATIVE_XML_PARSER_UNAVAILABLE');
  const document = parser.parseFromString(text, 'application/xml');
  return buildXmlGraph(extractXmlProfile(document), {member, sha256, byteLength: snapshot.length});
}
