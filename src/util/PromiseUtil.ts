/**
 * Promise utilities.
 */
export default class PromiseUtil {
    /**
     * Returns a Promise instance that resolves after the given amount of time.
     * @param milliseconds delay in milliseconds
     */
    static delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }
}
