/**
 * Array utilities.
 */
export default class ArrayUtil {
    /**
     * Creates an array of distinct elements, preserving the input ordering.
     * @param xs array of elements
     * @return array of distinct elements
     */
    static distinct<T>(xs: Array<T>): Array<T> {
        const s = new Set<T>();
        const ret = new Array<T>();

        for (const x of xs) {
            if (!s.has(x)) {
                ret.push(x);
                s.add(x);
            }
        }
        return ret;
    }

    /**
     * Removes at most one specific element from an array.
     * @param xs array of elements
     * @param x element to find
     */
    static remove<T>(xs: Array<T>, x: T): void {
        const index = xs.indexOf(x);
        if (index > -1) xs.splice(index, 1);
    }
}
