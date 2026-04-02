const obj = {
  name: "test",
  greet() {
    return `hello ${this.name}`;
  },
  get fullName() {
    return this.name;
  },
  set fullName(value) {
    this.name = value;
  },
  async fetchData() {
    return await Promise.resolve(42);
  },
  *items() {
    yield 1;
    yield 2;
  },
  [Symbol.iterator]() {
    return this.items();
  },
};

export default obj;
