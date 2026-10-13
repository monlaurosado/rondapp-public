import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const braces = require('braces');
const guarded = { name: 'RangeError', message: 'braces nesting exceeds security limit (128)' };

test('ordinary brace expansion and compilation remain compatible', () => {
  assert.deepEqual(braces.expand('src/{app,lib}/{a,b}.ts'), ['src/app/a.ts', 'src/app/b.ts', 'src/lib/a.ts', 'src/lib/b.ts']);
  assert.equal(braces.compile('a/{b,c}/d'), 'a/(b|c)/d');
  assert.equal(braces.stringify(braces.parse('a/{b,c}/d')), 'a/{b,c}/d');
  assert.deepEqual(braces.expand('{1..3}'), ['1', '2', '3']);
});

test('deep braces and parentheses reject before overflowing the call stack', () => {
  for (const [open, close] of [['{', '}'], ['(', ')']]) {
    const input = open.repeat(4000) + 'a,b' + close.repeat(4000);
    for (const operation of ['parse', 'compile', 'expand', 'stringify']) {
      assert.throws(() => braces[operation](input), guarded);
    }
  }
});

test('recursive AST consumers enforce their own depth limit', () => {
  for (const operation of ['compile', 'expand', 'stringify']) {
    let ast = { type: 'root', nodes: [] };
    for (let i = 0; i < 10000; i++) ast = { type: 'root', nodes: [ast] };
    assert.throws(() => braces[operation](ast), guarded);
    const cyclic = { type: 'root', nodes: [] };
    cyclic.nodes.push(cyclic);
    assert.throws(() => braces[operation](cyclic), guarded);
  }
});

test('RSA signatures reject extra DigestAlgorithm elements and malformed NULL parameters', () => {
  const forge = require('node-forge');
  const { asn1 } = forge;
  const pair = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 });
  const md = forge.md.sha256.create().update('local security regression');
  const digest = md.digest().getBytes();
  assert.equal(pair.publicKey.verify(digest, pair.privateKey.sign(md)), true);
  const item = (type, constructed, value) => asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
  const oid = () => item(asn1.Type.OID, false, asn1.oidToDer(forge.oids.sha256).getBytes());
  const empty = () => item(asn1.Type.NULL, false, '');
  const trailing = () => item(asn1.Type.OCTETSTRING, false, 'unexpected');
  for (const values of [[oid(), empty(), trailing()], [oid(), trailing()], [oid(), item(asn1.Type.NULL, false, 'invalid')]]) {
    const malformed = asn1.toDer(item(asn1.Type.SEQUENCE, true, [
      item(asn1.Type.SEQUENCE, true, values),
      item(asn1.Type.OCTETSTRING, false, digest),
    ])).getBytes();
    const signature = pair.privateKey.sign(malformed, 'NONE');
    assert.throws(() => pair.publicKey.verify(digest, signature), /valid RSASSA-PKCS1-v1_5/);
  }
});
