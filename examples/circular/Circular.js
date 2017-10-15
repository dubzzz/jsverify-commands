const assert = require('assert');

function Circular(num) {
    var startIdx = 0;
    var endIdx = 0;
    var data = [...Array(num).keys()].map(() => null);

    this.isEmpty = () => startIdx === endIdx && data[startIdx] === null;
    this.isFull = () => startIdx === endIdx && data[startIdx] !== null;
    this.pop = () => {
        const popped = data[startIdx];
        data[startIdx++] = null;
        startIdx %= num;
        return popped;
    };
    this.push = (value) => {
        assert(value !== null, "Circular::push does not accept null values");
        data[endIdx++] = value;
        endIdx %= num;
    };
    this.size = () => this.isFull() ? num : (endIdx >= startIdx ? endIdx - startIdx : num - startIdx + endIdx);
}

module.exports = Circular;
