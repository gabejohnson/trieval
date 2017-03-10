// Likely VERY inefficient port of Data.Trie of a Trie
import S from 'sanctuary';

// (Maybe a -> Trie a -> b) -> b -> (Trie a -> b) -> String -> Trie a -> b
function findBy_(m_t_b, b, t_b) {
  return mA => tA => {
    const [k, ...ks] = mA.isNothing ? '' : mA.value;
    return k === undefined ? tA.value :
      k in tA.children ?
      findBy_(m_t_b, b, t_b)(S.Just(ks))(tA.children[k]) :
      b;
  };
}

export class Trie {
  // a -> Trie a
  constructor(a) {
    // could null be a valid value? if so, we can't use S.toMaybe
    this.value = S.toMaybe(a);
    this.children = new Forest();
    this.keys = Object.freeze(this.value.isNothing ? [] : ['']);
  }

  /* Applicative */
  // a -> Trie a
  static of(a) { return new Trie(a); }

  /* Monoid */
  // Trie a
  static empty() { new Trie(); }

  /* Setoid */
  // Trie a ~> Trie a -> Bool
  equals(o) { return S.equals(this.toObject(), o.toObject()); }

  /* Semigroup */
  // Trie a ~> Trie a -> Trie a
  concat(o) { return Trie.fromObject(S.concat(this.toObject(), o.toObject())); }

  /* Functor */
  // Trie a ~> (a -> b) -> Trie b
  map(f) { return this.chain(a => this.of(f(a))); }

  /* Chain */
  // Trie a ~> (a -> Trie b) -> Trie b
  chain(f) {
    if (this.isEmpty()) return this;
    if (this.size() === 1 && this.keys[0] === '') return f(this.find(''));
    return Trie.fromObject(
      this.keys.reduce(
        (o, k) => (o[k] = f(this.find(k)).find(''), o),
        {}));
  };

  /* Apply */
  // Trie a ~> Trie (a -> b) -> Trie b
  ap(o) { return o.chain(f => this.map(f)); }

  /* Foldable */
  // reduce :: Trie a ~> ((b, a) -> b, b) -> b
  reduce(f, init) {
    if (this.isEmpty()) return init;
    return this.keys.reduce((b, k) => f(b, this.find(k)), init);
  };

  /* Show */
  // Trie a ~> String
  toString() {
    const stringRep = S.toString(this.toObject());
    return `Trie(${stringRep.slice(1, stringRep.length-1)})`;
  }

  /* Traversable */
  // traverse :: Applicative f => Trie a ~> (TypeRep f, a -> f b) -> f (Trie b)
  // Trie.prototype.traverse = function traverse(T, f) {};

  /* Basic functions */

  // Trie a ~> Bool
  isEmpty() { return this.keys.length === 0; }

  // String -> a -> Trie a
  static from(k, a) { return Trie.empty().insert(k, a); }

  // Trie a ~> Int
  size() { return this.keys.length; }

  /* Conversion functions */

  // [[String, a]] -> Trie a
  static fromArray([[k, v], ...ps]) {
    return Trie
      .from(k, v)
      .concat(ps.length > 0 ? Trie.fromArray(ps) : Trie.empty());
  }

  // Object a -> Trie a
  static fromObject(o) {
    return Object
      .keys(o)
      .reduce((root, k) => root.insert(k, o[k]), Trie.empty());
  }

  // Trie a ~> (String -> a -> b) -> [b]
  toArrayBy(f) {
    return this.keys.reduce((bs, k) => [...bs, f(k)(this.find(k))], []);
  }

  // Trie a ~> [[String, a]]
  toArray() { return this.toArrayBy(k => b => [k, b]); }

  // Trie a ~> [a]
  values() { return this.keys.map(k => this.find(k).value); }

  // Trie a ~> Object a
  toObject() {
    return this.keys.reduce((o, k) => (o[k] = this.find(k).value, o), {});
  }

  /* Query methods */
  // Trie a ~> (Maybe a -> Trie a -> b) -> (String -> b)
  findBy(f) {
    return S.flip(
      findBy_(f,
              f(S.Nothing)(Trie.empty()),
              f(S.Nothing))
    )(this);
  }

  // I'll probably end up using the commented-out implementation below for efficiency.
  // Trie a ~> String -> Maybe a
  find(k) {
    return findBy_(S.K, S.Nothing, S.K(S.Nothing))(S.Just(k))(this);
    // return k === undefined ? this.value :
    //     k in this.children ?
    //     this.children[k].find(ks) :
    //     S.Nothing;
  }

  // Trie a ~> String -> Bool
  has(k) {
    return !this.find(k).isNothing;
  }

  // Trie a ~> String -> a -> Trie a
  insert(key, a) {
    const [k, ...ks] = key;
    if (k === undefined) {
        const n = Trie.of(a);
        n.children = this.children.clone();
        return n;
    }
    const n = this.value.isNothing ? Trie.empty() : Trie.of(this.value.value);
    n.keys = Object.freeze([...this.keys, key]);
    const child = this.children.find(k);
    n.children = this.children.clone();
    n.children.add(k, (child || Trie.empty()).insert(ks.join(''), a));
    return n;
  }

  // Trie a ~> a -> Trie a
  set(a) {
    return this.insert('', a);
  }

  // Trie a ~> (a -> a) -> String -> Trie a
  adjust(f, k) {
    const found = this.find(k);
    return found.isNothing ? this : this.set(k, found.value);
  }

  // Trie a ~> String -> Trie a
  delete(k) {
    const o = this.toObject();
    delete o[k];
    return Trie.fromObject(o);
  }

  // Trie a ~> Trie a -> Trie a
  unionL(o) { return o.concat(this); }

  // Trie a ~> Trie a -> Trie a
  unionR(o) { return this.concat(o); }

}

/* Fantasy Land Aliases */
const flPre = 'fantasy-land/';
['of', 'empty'].forEach(n => Trie[`${flPre}/${n}`] = Trie[n]);
['equals',
 'concat',
 'map',
 'chain',
 'ap',
 'reduce'].forEach(n => Trie.prototype[`${flPre}/${n}`] = Trie.prototype[n]);

// Trie a ~> String -> Trie a
// Trie.prototype.subtrie = function subtrie(k) {};

// THIS will could be very useful for a tokenizing string reader
// Trie a ~> String -> Maybe [String, a, String]
// Trie.prototype.match = function match(k) {};

// Trie a ~> String -> [[String, a, String]]
// Trie.prototype.matches = function matches(k) {};

/* Single-value modification */

// Trie a ~> (String -> a -> Maybe a -> Maybe a) -> String -> a -> Trie a
// Trie.prototype.alterBy = function alterBy(f) {};

/* Combining tries */

// Trie a ~> (a -> a -> Maybe a) -> Trie a -> Trie a
// Trie.prototype.mergeBy = function mergeBy(f) {};

/* Mapping functions */

// Trie a ~> (String -> a -> Maybe b) -> Trie b
// Trie.prototype.mapBy = function mapBy(f) {};

// Trie a ~> (a -> Maybe b) -> Trie b
// Trie.prototype.filterMap = function filterMap(f) {};
