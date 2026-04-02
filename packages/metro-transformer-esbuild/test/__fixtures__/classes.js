class Animal {
  #name;
  #sound;

  constructor(name, sound) {
    this.#name = name;
    this.#sound = sound;
  }

  get name() {
    return this.#name;
  }

  speak() {
    return `${this.#name} says ${this.#sound}`;
  }

  static create(name, sound) {
    return new Animal(name, sound);
  }
}

class Dog extends Animal {
  #tricks = [];

  learn(trick) {
    this.#tricks.push(trick);
  }

  showTricks() {
    return this.#tricks;
  }
}

export { Animal, Dog };
