// Usage of symbol: create unique property that outside code cannot access
// so the "name" of the property and the name of the getter/setter is the same string
// but doesn't cause recursive calls
const rangeSym = Symbol('range');

class NumGen {
    constructor(range) {
        // this.range calls the setter method for range
        this.range = range;
    }
    get num() {
        return Math.floor(Math.random() * this.range);
    }
    // name of getter/setter method and property must be different
    // otherwise creates infinite recursive call
    get range() {
        return this[rangeSym];
    }
    set range(value) {
        if (value <= 0) {
            console.log('Bad input, setting to five.');
            this[rangeSym] = 5;
            return;
        }
        this[rangeSym] = value;
    }
}