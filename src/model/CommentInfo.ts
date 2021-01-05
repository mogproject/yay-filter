import { LanguageDetectorResult } from '../lang/LanguageDetector';
import DomManager from '../dom/DomManager';
import PromiseUtil from '../util/PromiseUtil';
import AppContext from './AppContext';

/**
 * Outdated request error.
 */
class OutdatedRequestError extends Error {
    constructor(requestedAge: number, currentAge: number) {
        super(`outdated request: requested=${requestedAge}, current=${currentAge}`);
    }
}

/**
 * Manages one comment.
 */
export default class CommentInfo {
    /** Application context. */
    private context: AppContext;
    /** Reference to the comment container element. */
    private elem: HTMLElement;
    /** True if the comment is a reply. */
    private isReply: boolean;
    /** True if the extension has already waited for YouTube's rendering. */
    private waited = false;
    /** Cached text. Whitespace is compressed. */
    private text = '';
    /** Cached result of the language detection. */
    private detectedLanguage: LanguageDetectorResult | null = null;
    /** Keeps track of text generations. */
    private age = 0;

    /**
     * Constructs a CommentInfo instance.
     * @param context application context
     * @param elem comment element
     * @param isReply true if the comment is a reply
     */
    constructor(context: AppContext, elem: HTMLElement, isReply: boolean) {
        this.context = context;
        this.elem = elem;
        this.isReply = isReply;
    }

    /**
     * Returns a readable string.
     */
    public toString = (): string => {
        const t = this.text.length > 20 ? this.text.substring(0, 20) + ' ...' : this.text;
        const lang = this.detectedLanguage?.languages.map((l) => `${l.language}->${l.percentage}`);
        return `CommentInfo(${t}, langages=${lang}, isReply=${this.isReply})`;
    };

    /**
     * Increments the current age and returns it.
     * @return incremented age
     */
    incrementAge(): number {
        return (this.age = (this.age + 1) % 1000000000);
    }

    /**
     * Analyzes the comment and then applies filering.
     * @return Promise of a boolean value that is true if the comment should be hidden
     */
    refreshAll(): Promise<boolean> {
        if (this.age < 0) return Promise.resolve(false);
        const requestAge = this.incrementAge();

        return Promise.resolve()
            .then(() => this.fetchText(requestAge))
            .then(() => this.detectLanguage(requestAge))
            .then((result) => this.saveLanguage(requestAge, result))
            .then(() => this.applyFilter(requestAge))
            .catch((error) => {
                if (!(error instanceof OutdatedRequestError)) throw error;
                return false;
            });
    }

    /**
     * Refreshes filtering.
     * @return Promise of a boolean value that is true if the comment should be hidden
     */
    refreshFilter(): Promise<boolean> {
        if (this.age < 0) return Promise.resolve(false);

        return this.applyFilter(this.age).catch((error) => {
            if (!(error instanceof OutdatedRequestError)) throw error;
            return false;
        });
    }

    /**
     * Safely destroys the comment info.
     */
    destroy(): void {
        this.age = -1;
    }

    //--------------------------------------------------------------------------
    //    Tasks
    //--------------------------------------------------------------------------

    /**
     * Verifies the requested age.
     * @param age requested age
     * @throws OutdatedRequestError
     */
    private verifyAge(age: number): void {
        if (age != this.age) throw new OutdatedRequestError(age, this.age);
    }

    /**
     * Fetches the comment text from the DOM.
     * @param requestAge requested age
     */
    private fetchText(requestAge: number): void {
        this.verifyAge(requestAge);

        const text = DomManager.fetchTextContent(this.elem);
        if (text != this.text) {
            this.waited = false; // content has been updated
            this.detectedLanguage = null;
            this.text = text;
        }
    }

    /**
     * Detectes the language used in the comment text.
     * @param age requested age
     * @return Promise of a detector result
     */
    private detectLanguage(age: number): Promise<LanguageDetectorResult> {
        this.verifyAge(age);

        return this.context.languageDetector.detectLanguage(this.text);
    }

    /**
     * Saves the detected languages.
     * @param age requested age
     * @param result detection result
     */
    private saveLanguage(age: number, result: LanguageDetectorResult): void {
        this.verifyAge(age);

        this.detectedLanguage = result;
    }

    /**
     * Applies a filter to the comment element.
     * @param age requested age
     * @return Promise of a boolean value that is true if the comment should be hidden
     */
    private applyFilter(age: number): Promise<boolean> {
        this.verifyAge(age);

        if (this.detectLanguage == null) return Promise.resolve(false);

        const filtered = this.elem.style.display == 'none';
        const shouldFilter = this.shouldFilter();
        let p = Promise.resolve(shouldFilter);

        if (filtered != shouldFilter) {
            if (shouldFilter) {
                if (!this.waited) {
                    // wait for YouTube's rendering before hiding the thread
                    p = PromiseUtil.delay(300).then(() => {
                        // console.debug(`applyFilter:ON: ${this.text}`);
                        this.elem.style.display = 'none';
                        this.waited = true;
                        return true;
                    });
                } else {
                    // console.debug(`applyFilter:ON: ${this.text}`);
                    this.elem.style.display = 'none';
                }
            } else {
                // console.debug(`applyFilter:OFF: ${this.text}`);
                this.elem.style.display = '';
            }
        }

        return p;
    }

    //--------------------------------------------------------------------------
    //    Filtering Logic
    //--------------------------------------------------------------------------

    /**
     * Returns if the comment should be filtered.
     * @return true if the comment should be hidden
     */
    private shouldFilter(): boolean {
        if (this.detectedLanguage == null) return false;
        if (!this.context.enabled) return false; // filter off
        const settings = this.context.settings;
        if (this.isReply && !settings.getFilterReplies()) return false; // all replies are visible
        return settings.shouldFilterByLanguage(this.detectedLanguage) || settings.shouldFilterByWord(this.text);
    }
}
