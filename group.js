class Group {
    constructor() { // create empty group, internally is an array
        this.content = [];
    }

    add(value) { // adds value if it isn't already a member, use has(), return false if addition works, false if not
        if (this.has(value)) return false;
        this.content.push(value);
        return true;
    }

    has(value) { // check if value is already in Group
        return (this.content.indexOf(value) >= 0) ? true : false;
    }

    delete(value) { // removes value if it is a member, returns true if deletion works, false if not
        if (!this.has(value)) return false;
        // overwrite target value with value in index 0
        this.content[this.content.indexOf(value)] = this.content[0];
        this.content.shift();
        return true;
    }

    static from(iterable) {
        let group = new Group();
        for (const i of iterable) {
            group.add(i);
        };
        return group;
    }

    [Symbol.iterator] = function() {
        return new GroupIterator(this);
    }
}

class GroupIterator {
    constructor(group) {
        this.group = group;
        this.position = 0;
    }
    next() {
        if (this.position == group.content.length) return {done: true};

        // Create return object
        let value = {
            value: this.group.content[this.position]
        }
        // increment position
        this.position++;
        return {value, done: false};
    }
}
module.exports = {Group};