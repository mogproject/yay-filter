/**
 * Simple fixed-size circular buffer implementation.
 */
export default class CircularBuffer<T> {
    private capacity: number;
    private data = new Array<T>();
    private index = 0;
    private sz = 0;

    constructor(capacity: number) {
        this.capacity = capacity;
    }

    push(element: T): void {
        if (this.sz == this.capacity) throw new Error('capacity exceeded');

        if (this.data.length < this.capacity) {
            this.data.push(element);
        } else {
            this.data[(this.index + this.sz) % this.capacity] = element;
        }
        ++this.sz;
    }

    pop(): T | undefined {
        if (this.sz == 0) return undefined;
        --this.sz;
        const ret = this.data[this.index];
        this.index = (this.index + 1) % this.capacity;
        return ret;
    }

    clear(): void {
        this.sz = 0;
    }

    size(): number {
        return this.sz;
    }
}
