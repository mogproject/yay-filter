import CircularBuffer from '../../util/CircularBuffer';

describe('CircularBuffer#pop()', () => {
    test('normal cases', () => {
        const xs = new CircularBuffer<number>(5);
        expect(xs.size()).toEqual(0);
        xs.push(1);
        expect(xs.size()).toEqual(1);
        xs.push(2);
        expect(xs.size()).toEqual(2);

        expect(xs.pop()).toBe(1);
        expect(xs.pop()).toBe(2);
        expect(xs.pop()).toBeUndefined();

        xs.push(3);
        xs.push(4);
        xs.push(5);
        xs.push(6);
        xs.push(7);
        expect(xs.size()).toBe(5);
        expect(() => xs.push(8)).toThrowError();

        expect(xs.pop()).toBe(3);
        expect(xs.pop()).toBe(4);
        expect(xs.pop()).toBe(5);
        expect(xs.pop()).toBe(6);
        expect(xs.pop()).toBe(7);
        expect(xs.pop()).toBeUndefined();
    });
});

describe('CircularBuffer#clear()', () => {
    test('normal cases', () => {
        const xs = new CircularBuffer<number>(5);
        expect(xs.size()).toEqual(0);
        xs.push(1);
        expect(xs.size()).toEqual(1);
        xs.push(2);
        expect(xs.size()).toEqual(2);
        xs.clear();
        expect(xs.size()).toEqual(0);
        expect(xs.pop()).toBeUndefined();

        xs.push(3);
        xs.push(4);
        xs.push(5);
        xs.push(6);
        xs.push(7);
        expect(xs.size()).toBe(5);
        expect(() => xs.push(8)).toThrowError();
        xs.clear();
        expect(xs.size()).toEqual(0);
        expect(xs.pop()).toBeUndefined();
    });
});
