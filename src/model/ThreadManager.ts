import { LanguageDetectorResult } from '../lang/LanguageDetector';
import DomManager from '../dom/DomManager';
import Settings from './Settings';
import PromiseUtil from '../util/PromiseUtil';

/**
 * Manages one comment thread.
 */
export default class ThreadManager {
    /** True if the language detector has already processed this thread. */
    private parsed = false;
    /** True if the extension has already waited for YouTube's rendering. */
    private waited = false;
    /** True if the thread is currently hidden. */
    private isFiltered;
    /** Reference to the thread container element. */
    private elem: HTMLElement;
    /** Cached result of the language detection. */
    private detectedLanguages: LanguageDetectorResult | null = null;
    /** Text content observer. */
    private observer: MutationObserver;
    /** Keeps track of refresh timings. */
    private age = 0;
    /** Part of the text. */
    private text = '';

    // Functions
    private getSettings: () => Settings | null;
    private detectLanguageFunc: (text: string) => Promise<LanguageDetectorResult>;
    private refreshStatusFunc: () => void;

    /**
     * Constructs a ThreadManager.
     * @param elem thread container
     * @param getSettings
     * @param detectLanguage
     */
    constructor(
        elem: HTMLElement,
        getSettings: () => Settings | null,
        detectLanguage: (text: string) => Promise<LanguageDetectorResult>,
        refreshStatus: () => void,
    ) {
        this.elem = elem;
        this.getSettings = getSettings;
        this.detectLanguageFunc = detectLanguage;
        this.refreshStatusFunc = refreshStatus;

        // get the current filtering status
        this.isFiltered = elem.style.display == 'none';

        // start observer
        this.observer = new MutationObserver(() => this.refreshAll());
        this.observer.observe(this.elem, { subtree: true, characterData: true });
    }

    /**
     * Refreshes the thread manager.
     * @return Promise of void
     */
    refreshAll(): Promise<void> {
        if (this.age < 0) return Promise.resolve(); // already destroyed

        this.parsed = false;
        const requestAge = this.incrementAge();

        return Promise.resolve()
            .then(() => this.fetchText(requestAge))
            .then((text) => this.detectLanguage(requestAge, text))
            .then((result) => this.saveDetectedLanguages(requestAge, result))
            .then(() => this.applyFilter(requestAge, this.getSettings()))
            .then(() => this.refreshStatus(requestAge));
    }

    /**
     * Refreshes filtering.
     * @return Promise of void
     */
    refreshFilter(): Promise<void> {
        if (this.age < 0) return Promise.resolve(); // already destroyed
        if (!this.parsed) return Promise.resolve(); // skip if refreshAll() is still working

        const requestAge = this.incrementAge();

        return Promise.resolve()
            .then(() => this.applyFilter(requestAge, this.getSettings()))
            .then(() => this.refreshStatus(requestAge));
    }

    /**
     * Increments the current age and returns it.
     * @return incremented age
     */
    incrementAge(): number {
        return (this.age = (this.age + 1) % 1000000000);
    }

    /**
     * Safely destroy this thread manager.
     */
    destroy(): void {
        if (this.observer) this.observer.disconnect();
        this.detectedLanguages = null;
        this.parsed = false;
        this.age = -1;
    }

    //--------------------------------------------------------------------------
    //    Tasks
    //--------------------------------------------------------------------------

    /**
     * Fetches text from the thread.
     * @param age requested age
     * @return Promise of the text content
     */
    private fetchText(age: number): Promise<string> {
        if (age != this.age) throw new Error('outdated request');
        const text = DomManager.fetchTextContent(this.elem);
        this.text = text.substring(0, 20).replace(/\s/g, ' ');
        // console.debug(`fetchText() => ${this.text} ...`);
        return Promise.resolve(text);
    }

    private detectLanguage(age: number, text: string): Promise<LanguageDetectorResult> {
        if (age != this.age) throw new Error('outdated request');
        return this.detectLanguageFunc(text);
    }

    /**
     * Saves the detected languages.
     * @param age requested age
     * @param result detection result
     */
    private saveDetectedLanguages(age: number, result: LanguageDetectorResult): void {
        if (age != this.age) throw new Error('outdated request');
        this.detectedLanguages = result;
        this.parsed = true;
    }

    /**
     * Applies a filter to the thread.
     * @param age requested age
     * @param settings settings to apply
     * @param enabled true if filtering is enabled
     * @return Promise of the tuple of old and current filtering states
     */
    private applyFilter(age: number, settings: Settings | null): Promise<void> {
        if (age != this.age) throw new Error('outdated request');

        const oldFiltered = this.isFiltered;

        const shouldFilter =
            settings != null &&
            this.detectedLanguages != null &&
            settings.shouldFilterByLanguage(this.detectedLanguages);
        this.isFiltered = shouldFilter;

        let p = Promise.resolve();

        if (oldFiltered != shouldFilter) {
            if (shouldFilter) {
                if (!this.waited) {
                    // wait for YouTube's rendering before hiding the thread
                    p = PromiseUtil.delay(300).then(() => {
                        // console.debug(`applyFilter:ON: ${this.text}`);
                        this.elem.style.display = 'none';
                        this.waited = true;
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

    /**
     * Refreshes status.
     * @param age requested age
     */
    private refreshStatus(age: number): void {
        if (age != this.age) throw new Error('outdated request');
        this.refreshStatusFunc();
    }
}
