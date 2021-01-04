/**
 * Outdated request error.
 */
export default class OutdatedRequestError extends Error {
    constructor(requestedAge: number, currentAge: number) {
        super(`outdated request: requested=${requestedAge}, current=${currentAge}`);
    }
}
