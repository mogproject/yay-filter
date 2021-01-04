import ArrayUtil from '../../util/ArrayUtil';

describe('ArrayUtil#distinct', () => {
    test('empty array', () => {
        expect(ArrayUtil.distinct([])).toStrictEqual([]);
    });
    test('one element', () => {
        expect(ArrayUtil.distinct([123])).toStrictEqual([123]);
    });
    test('without duplicate elements', () => {
        const xs = [1, 2, 3, 4, 5];
        expect(ArrayUtil.distinct(xs)).toStrictEqual(xs);
    });
    test('with duplicate elements', () => {
        const xs = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5];
        expect(ArrayUtil.distinct(xs)).toStrictEqual([1, 2, 3, 4, 5]);

        // must preserve ordering
        const ys = [2, 1, 2, 3, 5, 3, 4, 4, 4, 5, 4, 5, 5, 5, 3];
        expect(ArrayUtil.distinct(ys)).toStrictEqual([2, 1, 3, 5, 4]);
    });
});

describe('ArrayUtil#remove', () => {
    test('element does not exist', () => {
        const xs = [1, 2, 3];
        ArrayUtil.remove(xs, 4);
        expect(xs).toStrictEqual([1, 2, 3]);
    });
    test('duplicate elements', () => {
        const xs = [1, 2, 3, 2];
        ArrayUtil.remove(xs, 2);
        expect(xs).toStrictEqual([1, 3, 2]);
        ArrayUtil.remove(xs, 2);
        expect(xs).toStrictEqual([1, 3]);
    });
});
