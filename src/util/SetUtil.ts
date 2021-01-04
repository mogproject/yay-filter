/**
 * Set utilities.
 */
export default class SetUtil {
    /**
     * Compares two sets.
     * @param a set a
     * @param b set b
     * @return true if two sets have the same elements
     */
    static equals<T>(a: Set<T>, b: Set<T>): boolean {
        return a.size === b.size && [...a].every((x) => b.has(x));
    }
}
