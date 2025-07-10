class Mapping {

    constructor() {
        this.map = new Map();
        this.borderWordPoses = [];
    }

    get(wordPos) {
        return this.map.get(Number(wordPos)) ?? 0n;
    }

    getLowest() {
        return this.borderWordPoses.length > 0 ? this.borderWordPoses[0] : null;
    }

    getHighest() {
        return this.borderWordPoses.length === 2 ? this.borderWordPoses[1] :
            this.borderWordPoses.length === 1 ? this.borderWordPoses[0] :
                null;
    }

    set(wordPos, value) {
        this.#updateWordPoses(wordPos);
        this.map.set(Number(wordPos), BigInt(value));
    }



    #updateWordPoses(wordPos) {
        const num = Number(wordPos);

        if (this.borderWordPoses.length === 0) {
            this.borderWordPoses.push(num);
        } else if (this.borderWordPoses.length === 1) {
            if (num === this.borderWordPoses[0]) return;
            this.borderWordPoses.push(num);
            this.borderWordPoses.sort((a, b) => a - b); // Ensure lowest is first
        } else {
            // We already have two numbers: [min, max]
            if (num < this.borderWordPoses[0]) {
                this.borderWordPoses[0] = num;
            } else if (num > this.borderWordPoses[1]) {
                this.borderWordPoses[1] = num;
            }
            // No update if num is between current min and max
        }
    }

}

module.exports = Mapping;