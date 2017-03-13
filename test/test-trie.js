import test from 'ava';
import S, { equals, Just, Nothing, inc, dec, add } from 'sanctuary';

import Trie from '../src/trie';

test('constructor', t => {
  const n = new Trie(42);
  t.true(equals(n.value, Just(42)));
  t.deepEqual(n.children, {});
  t.deepEqual(n.keys, ['']);
});

test('of', t => {
  const n1 = Trie.of(42), n2 = new Trie(42);
  t.deepEqual(n1, n2);
});

test('empty', t => {
  const n = Trie.empty();
  t.is(n.value, Nothing);
  t.deepEqual(n.children, {});
  t.deepEqual(n.keys, []);
});

test('insert', t => {
  const n1 = Trie.empty();
  const n2 = n1.insert('foo', 1);
  t.not(n1, n2);
  t.is(n2.value, S.Nothing);
  t.true(equals(n2.children.f.children.o.children.o.value, Just(1)));

  const n3 = n2.insert('bar', 2);
  t.not(n2, n3);
  t.true(equals(n3.children.f.children.o.children.o.value, Just(1)));
  t.true(equals(n3.children.b.children.a.children.r.value, Just(2)));

  const n4 = n2.insert('foo', 3);
  t.true(equals(n4.children.f.children.o.children.o.value, Just(3)));

  const n5 = n4.insert('fo', 4);
  t.true(equals(n5.children.f.children.o.value, Just(4)));

  const n6 = n1.insert('', 5);
  t.true(equals(n6.value, Just(5)));
});

test('find', t => {
  const n1 = Trie.empty();
  const n2 = n1.insert('foo', 1);
  t.true(equals(n2.find('foo'), Just(1)));

  const n3 = n2.insert('bar', 2);
  t.not(n2, n3);
  t.true(equals(n3.find('foo'), Just(1)));
  t.true(equals(n3.find('bar'), Just(2)));

  const n4 = n2.insert('foo', 3);
  t.true(equals(n4.find('foo'), Just(3)));
  t.true(equals(Trie.of(42).find(''), Just(42)));
});

test('singleton', t => {
  const n = Trie.singleton('foo', 1);
  t.true(equals(n.find('foo'), Just(1)));
});

test('has', t => {
  const n1 = Trie.singleton('foo', 1);
  t.true(n1.has('foo'));
  t.false(n1.has('bar'));

  const n2 = n1.insert('bar', 2);
  t.true(n2.has('foo'));
  t.true(n2.has('bar'));
});

test('delete', t => {
  const n = Trie.singleton('foo', 1).insert('bar', 2).delete('foo');
  t.is(n.find('foo'), Nothing);
  t.true(equals(n.find('bar'), Just(2)));
});

test('adjust', t => {
  const n1 = Trie.singleton('foo', 1);
  const n2 = n1.adjust(S.inc, 'foo');
  t.true(equals(n1.find('foo'), Just(1)));
  t.true(equals(n2.find('foo'), Just(2)));

  const n3 = n1.adjust(S.inc, 'bar');
  t.true(equals(n3.find('foo'), Just(1)));
});

test('fromObject', t => {
  const n = Trie.fromObject({foo: 1, bar: 2, baz: 3});
  t.true(equals(n.find('foo'), Just(1)));
  t.true(equals(n.find('bar'), Just(2)));
  t.true(equals(n.find('baz'), Just(3)));
});

test('toObject', t => {
  const o = {foo: 1, bar: 2, baz: 3};
  t.true(S.equals(Trie.fromObject(o).toObject(), o));
});

const trie123 = () => Trie.fromObject({foo: 1, bar: 2, baz: 3});

test('equals', t => {
  const n1 = trie123();
  const n2 = trie123();
  t.true(n1.equals(n2));
  t.false(n1.equals(n2.insert('foo', 4)));
  t.false(n1.equals(n2.insert('quux', 4)));
  t.true(Trie.empty().insert('foo', 1).equals(Trie.singleton('foo', 1)));
});

test('fromArray', t => {
  const o = {foo: 1, bar: 2, baz: 3};
  t.true(Trie.fromObject(o).equals(Trie.fromArray(S.pairs(o))));
});

test('toArray', t => {
  const ps = [['foo', 1], ['bar', 2], ['baz', 3]];
  t.true(equals(Trie.fromArray(ps).toArray(), ps));
});

test('values', t => {
  t.true(equals(trie123().values(), [1,2,3]));
});

test('isEmpty', t => {
  t.true(Trie.empty().isEmpty());
  t.false(Trie.singleton('foo', 1).isEmpty());
  t.true(Trie.singleton('foo', 1).delete('foo').isEmpty());
});

test('size', t => {
  t.is(Trie.empty().size(), 0);
  t.is(Trie.of(2).size(), 1);
  t.is(Trie.singleton('foo', 1).size(), 1);

  const n = Trie.fromObject({foo: 1, bar: 2});
  t.is(n.size(), 2);
  t.is(n.insert('baz', 3).size(), 3);
  t.is(n.insert('foo', 2).size(), 2);
});

test('map', t => {
  t.true(equals(trie123().map(inc).toObject(), {foo: 2, bar: 3, baz: 4}));
});

test('reduce', t => {
  t.is(trie123().reduce(add, 0), 6);
  t.is(Trie.empty().reduce(add, 0), 0);
});

test('ap', t => {
  const n1 = trie123().ap(Trie.fromObject({foo: inc, bar: dec}));
  t.true(equals(n1.toObject(), {foo: 2, bar: 1}));

  const n2 = trie123().ap(Trie.fromObject({foo: inc, quux: dec}));
  t.true(equals(n2.toObject(), {foo: 2}));

  const n3 = Trie.empty().ap(Trie.singleton('foo', inc));
  t.true(n3.isEmpty());

  const n4 = trie123().ap(Trie.empty());
  t.true(n4.isEmpty());
});

test('unionL', t => {
  t.true(trie123().unionL(
    trie123().insert('baz', 4))
         .equals(trie123().insert('baz', 4)));
});

test('unionR', t => {
  t.true(trie123().unionR(
    trie123().insert('baz', 4))
         .equals(trie123()));
});

test('toString', t => {
  t.is(trie123().toString(), 'Trie("foo": 1, "bar": 2, "baz": 3)');
});

test('findBy', t => {
  const fn = () => tA => tA.value;
  const n1 = Trie.singleton('foo', 1);
  t.true(equals(n1.findBy(fn)('foo'), Just(1)));
  t.true(equals(Trie.empty().findBy(fn)('foo'), Nothing));
});
