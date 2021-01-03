import CircularBuffer from '../util/CircularBuffer';

/**
 * Entry of the language detector result.
 */
interface LanguageDetectorResultEntry {
    language: string;
    percentage: number;
}

/**
 * Language detector result.
 */
export interface LanguageDetectorResult {
    isReliable: boolean;
    languages: LanguageDetectorResultEntry[];
}

/**
 * Implements a language detector with dedicated caches.
 */
export default class LanguageDetector {
    /** Cache structure. */
    private cache = new Map<number, LanguageDetectorResult>();
    /** Queue to store keys. */
    private entries: CircularBuffer<number>;
    /** Maximum cache size. */
    private maxCacheSize: number;

    /**
     * Constructs a LanguageDetector instance.
     * @param maxCacheSize maximum cache size
     */
    constructor(maxCacheSize: number) {
        this.maxCacheSize = maxCacheSize;
        this.entries = new CircularBuffer(maxCacheSize);
    }

    /**
     * Analyzes text and tries to detect languages.
     * @param text text to be analyzed
     * @return Promise of the result
     */
    detectLanguage(text: string): Promise<LanguageDetectorResult> {
        const hash = this.hashCode(text);
        const result = this.cache.get(hash);

        if (result === undefined) {
            return new Promise<LanguageDetectorResult>((resolve) =>
                // send message to background script
                chrome.runtime.sendMessage(text, (r: LanguageDetectorResult) => {
                    if (this.entries.size() == this.maxCacheSize) {
                        const oldKey = this.entries.pop();
                        if (oldKey !== undefined) this.cache.delete(oldKey);
                    }
                    this.cache.set(hash, r);
                    this.entries.push(hash);

                    // for debugging
                    // this.debugPrint(text, r);

                    resolve(r);
                }),
            );
        } else {
            return Promise.resolve(result);
        }
    }

    /**
     * Clears the entire cache.
     */
    clearCache(): void {
        this.cache.clear();
        this.entries.clear();
    }

    /**
     * Returns the current cache size.
     * @return cache size
     */
    getCacheSize(): number {
        return this.cache.size;
    }

    /**
     * Generates a hash code from a string.
     * @param text string
     * @return hash code
     */
    private hashCode(text: string): number {
        return [...text].reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0);
    }

    /**
     * Prints out the text and its result.
     * @param text text
     * @param result detector result
     */
    private debugPrint(text: string, result: LanguageDetectorResult): void {
        const t = text.substring(0, 40).replace(/\s/g, ' ').padEnd(40);
        const langs = result.languages.map((e) => `${e.language}->${e.percentage}`);
        console.debug(`${t}: ${langs}`);
    }
}
