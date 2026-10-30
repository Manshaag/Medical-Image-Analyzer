const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./analysis.js');

test('histogram and region statistics match known pixels', () => {
  const data = Uint8Array.from([0,0,255,255]);
  const stats = A.statistics(data,2,2,null,128);
  assert.equal(stats.mean,127.5);
  assert.equal(stats.standardDeviation,127.5);
  assert.equal(stats.entropy,1);
  assert.equal(stats.aboveThresholdPercent,50);
  assert.equal(stats.histogram[0],2);
  assert.equal(stats.histogram[255],2);
  const subset = A.statistics(data,2,2,{x:0,y:1,width:2,height:1},255);
  assert.equal(subset.mean,255);
  assert.equal(subset.aboveThresholdPercent,100);
  assert.equal(subset.standardDeviation,0);
});

test('threshold includes the boundary without changing original pixels', () => {
  const pixels=Uint8Array.from([0,127,128,255]);
  assert.deepEqual([...A.thresholdPixels(pixels,128)],[0,0,255,255]);
  assert.deepEqual([...pixels],[0,127,128,255]);
});

test('constant images have no edges, including borders', () => {
  assert.deepEqual([...A.sobel(new Uint8Array(9).fill(110),3,3)],Array(9).fill(0));
  const edges=A.sobel(Uint8Array.from([0,0,255,0,0,255,0,0,255]),3,3);
  assert.equal(edges[0],0);
  assert.equal(edges[4],255);
});

test('contrast clipping and inversion are monotonic and bounded', () => {
  assert.deepEqual([...A.windowPixels([0,64,128,192,255],128,128)],[0,0,128,255,255]);
  assert.deepEqual([...A.windowPixels([0,255],128,256,true)],[255,1]);
  assert.equal(A.windowPixels([128],128,0)[0],128);
});

test('regions clamp to valid image boundaries', () => {
  assert.deepEqual(A.region(10,8,{x:9,y:7,width:20,height:20}),{x:9,y:7,width:1,height:1});
  assert.deepEqual(A.region(10,8,{x:-5,y:-1,width:4,height:2}),{x:0,y:0,width:4,height:2});
  assert.throws(()=>A.statistics([1],2,2));
});

test('grayscale composites alpha onto black and preserves luminance order', () => {
  const gray=A.grayscale([255,255,255,255,255,255,255,0,255,255,255,128]);
  assert.deepEqual([...gray],[255,0,128]);
  assert.throws(()=>A.grayscale([1,2,3]));
});

test('synthetic phantom is deterministic and has an intensity range', () => {
  const pixels=A.phantom(64,64);
  assert.deepEqual(pixels,A.phantom(64,64));
  assert.equal(pixels.length,4096);
  const stats=A.statistics(pixels,64,64);
  assert.ok(stats.max > stats.min);
  assert.ok(stats.entropy>2);
});
