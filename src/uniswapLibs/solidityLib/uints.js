const UINT256_MOD = 2n ** 256n;
const UINT160_MOD = 2n ** 160n;

class Uint256 {
    constructor(value) {
        this.value = Uint256.wrap(value);
    }

    static wrap(x) {
        return ((BigInt(x) % UINT256_MOD) + UINT256_MOD) % UINT256_MOD;
    }

    add(other) {
        return new Uint256(this.value + BigInt(other));
    }

    sub(other) {
        return new Uint256(this.value - BigInt(other));
    }

    mul(other) {
        return new Uint256(this.value * BigInt(other));
    }

    div(other) {
        return new Uint256(this.value / BigInt(other));
    }

    mod(other) {
        return new Uint256(this.value % BigInt(other));
    }

    toString() {
        return this.value.toString();
    }

    toBigInt() {
        return this.value;
    }
}

class Uint160 {
    constructor(value) {
        this.value = Uint160.wrap(value);
    }

    static wrap(x) {
        return ((BigInt(x) % UINT160_MOD) + UINT160_MOD) % UINT160_MOD;
    }

    add(other) {
        return new Uint160(this.value + BigInt(other));
    }

    sub(other) {
        return new Uint160(this.value - BigInt(other));
    }

    mul(other) {
        return new Uint160(this.value * BigInt(other));
    }

    div(other) {
        return new Uint160(this.value / BigInt(other));
    }

    mod(other) {
        return new Uint160(this.value % BigInt(other));
    }

    toString() {
        return this.value.toString();
    }

    toBigInt() {
        return this.value;
    }
}