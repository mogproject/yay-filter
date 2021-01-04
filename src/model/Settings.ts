import { Config } from '../Config';
import { LanguageDetectorResult } from '../lang/LanguageDetector';
import ArrayUtil from '../util/ArrayUtil';
import SetUtil from '../util/SetUtil';

/**
 * Manages settings.
 */
export default class Settings {
    /** True if the filter should be enabled by default. */
    private enabledDefault: boolean;
    /** Languages to be visible. */
    private includeLanguages: Set<string>;
    /** Languages shown in the menu. */
    private listedLanguages: string[];
    /** Lowerbound of the language usage in each comment. */
    private percentageThreshold: number;
    /** True if the comment with unknown languages should be visible. */
    private includeUnknownLanguage: boolean;
    /** Words to exclude. */
    private excludeWords: string[];

    /**
     * Constructs settings.
     * @param enabledDefault enabled by default
     * @param includeLanguages languages to be visible
     * @param includeUnknownLanguage true if unknown languages should be visible
     * @param listedLanguages listed languages
     * @param percentageThreshold percentage threshold
     * @param excludeWords words to exclude
     */
    constructor(
        enabledDefault?: boolean | undefined,
        includeLanguages?: Array<string> | undefined,
        includeUnknownLanguage?: boolean | undefined,
        listedLanguages?: Array<string> | undefined,
        percentageThreshold?: number | undefined,
        excludeWords?: string[] | undefined,
    ) {
        // enabled default: default true
        this.enabledDefault = enabledDefault === undefined ? true : enabledDefault;

        // include languages: default read browser settings
        const languages =
            includeLanguages === undefined ? this.getPreferredLanguages() : ArrayUtil.distinct(includeLanguages);
        this.includeLanguages = new Set(languages);

        // include unknown languages: default false
        this.includeUnknownLanguage = includeUnknownLanguage === undefined ? false : includeUnknownLanguage;

        // listed languages: default clone the include languages
        if (listedLanguages === undefined) {
            this.listedLanguages = [...this.includeLanguages];
        } else {
            // listed languages must be a superset of the include languages
            const ll = new Set(listedLanguages);

            // prepend include languages that are not in the list
            this.listedLanguages = languages.filter((s) => !ll.has(s)).concat(ArrayUtil.distinct(listedLanguages));
        }

        // percentage threshold: default defined in Config
        this.percentageThreshold =
            percentageThreshold === undefined ? Config.settings.defaultPercentageThreshould : percentageThreshold;

        // exclude words: default empty
        this.excludeWords = excludeWords === undefined ? [] : excludeWords;
    }

    /**
     * Returns a copy of this Settings.
     * @return copy of the settings
     */
    copy(): Settings {
        return new Settings(
            this.enabledDefault,
            [...this.includeLanguages],
            this.includeUnknownLanguage,
            [...this.listedLanguages],
            this.percentageThreshold,
            [...this.excludeWords],
        );
    }

    //--------------------------------------------------------------------------
    //    I/O
    //--------------------------------------------------------------------------

    /**
     * Converts the settings to a JSON string.
     * @return JSON string
     */
    toJSON(): string {
        return JSON.stringify({
            ed: this.enabledDefault,
            il: this.listedLanguages.filter((s) => this.includeLanguages.has(s)), // order languages
            iu: this.includeUnknownLanguage,
            ll: this.listedLanguages,
            pt: this.percentageThreshold,
            ew: this.excludeWords,
        });
    }

    /**
     * Loads settings from a JSON string.
     * @param s JSON string
     * @return Settings instance
     */
    static loadFromJSON(s: string | undefined): Settings {
        if (s === undefined) return new Settings();

        const obj = JSON.parse(s);
        return new Settings(obj.ed, obj.il, obj.iu, obj.ll, obj.pt, obj.ew);
    }

    /**
     * Loads settings from Local Storage.
     * @return Promise of the Settings
     */
    static loadFromStorage(): Promise<Settings> {
        return new Promise<Settings>((resolve) => {
            chrome.storage.sync.get('settings', (result) => resolve(this.loadFromJSON(result.settings)));
        });
    }

    /**
     * Saves the current settings to Local Storage.
     * @return Promise of void
     */
    saveToStorage(): Promise<void> {
        return new Promise<void>((resolve) => {
            chrome.storage.sync.set({ settings: this.toJSON() }, () => resolve());
        });
    }

    //--------------------------------------------------------------------------
    //    Getters / Setters
    //--------------------------------------------------------------------------

    /**
     * Detects prefererred languages from the browser settings.
     * @return list of preferred languages
     */
    private getPreferredLanguages(): string[] {
        return ArrayUtil.distinct(
            navigator.languages.map((s) => s.substring(0, 2).toLowerCase()).filter((s) => s.length == 2),
        );
    }

    /**
     * Returns the default enabled setting.
     * @return true if filtering is enabled by default
     */
    isEnabledDefault(): boolean {
        return this.enabledDefault;
    }

    /**
     * Updates the default denabled setting.
     * @param enabled true if filtering is enabled by default
     */
    setEnabledDefault(enabled: boolean): Settings {
        this.enabledDefault = enabled;
        return this;
    }

    /**
     * Updates a language filtering setting.
     * @param language language code
     * @param value true if the language should be visible
     * @return updated settings
     */
    setIncludeLanguage(language: string, value: boolean): Settings {
        if (!this.listedLanguages.includes(language)) throw new Error('language is not listed');

        if (value) {
            this.includeLanguages.add(language);
        } else {
            this.includeLanguages.delete(language);
        }
        return this;
    }

    /**
     * Returns the set of the languages to be visible.
     * @return set of language codes
     */
    getIncludeLanguages(): Set<string> {
        return this.includeLanguages;
    }

    /**
     * Returns the unknown language setting.
     * @return true if unknown languages should be visible
     */
    getIncludeUnknown(): boolean {
        return this.includeUnknownLanguage;
    }

    /**
     * Updates the unknown language setting.
     * @param value true if unknown languages should be visible
     * @return updated settings
     */
    setIncludeUnknown(value: boolean): Settings {
        this.includeUnknownLanguage = value;
        return this;
    }

    /**
     * Returns the array of listed languages.
     * @return listed languages
     */
    getListedLanguages(): string[] {
        return this.listedLanguages;
    }

    /**
     * Adds a language to the list.
     * @param language language code
     * @param include true if this language should be visible
     * @return updated settings
     */
    addListedLanguage(language: string, include: boolean): Settings {
        // check if the language is already listed
        if (this.listedLanguages.includes(language)) return this;

        this.listedLanguages.push(language);
        if (include) this.includeLanguages.add(language);
        return this;
    }

    /**
     * Removes a language from the list.
     * @param language language code
     * @return updated settings
     */
    removeListedLanguage(language: string): Settings {
        // first, unselect if it is checked
        if (this.includeLanguages.has(language)) {
            this.includeLanguages.delete(language);
        }
        // next remove from the list
        ArrayUtil.remove(this.listedLanguages, language);
        return this;
    }

    /**
     * Returns the percentage threshold.
     * @return percentage threshold
     */
    getPercentageThreshold(): number {
        return this.percentageThreshold;
    }

    /**
     * Updates the percentage threshold.
     * @param value new percentage threshold
     */
    setPercentageThreshold(value: number): Settings {
        this.percentageThreshold = Math.max(0, Math.min(100, value));
        return this;
    }

    //--------------------------------------------------------------------------
    //    Filtering Logic
    //--------------------------------------------------------------------------

    /**
     * Checks if the language filter should hide the content.
     * @param detectedLanguages detected languages
     * @return true if the content should be hidden
     */
    shouldFilterByLanguage(detectedLanguages: LanguageDetectorResult): boolean {
        // shortcut when no languages are selected
        if (this.includeLanguages.size == 0 && !this.includeUnknownLanguage) return true;

        // filter by percentage
        const filtered = detectedLanguages.languages
            .filter((lang) => lang.percentage >= this.percentageThreshold)
            .map((lang) => lang.language);

        // unknown
        if (filtered.length == 0) return !this.includeUnknownLanguage;

        return !filtered.some((lang) => {
            if (lang == 'und' && this.includeUnknownLanguage) return true; // unknown

            // treat as an ISO-639-1 code
            const code = lang.charAt(2) == '-' ? lang.substring(0, 2) : lang;
            return this.includeLanguages.has(code);
        });
    }

    /**
     * Checks if the word filter should hide the content.
     * @param text text to be examined
     * @return true if the content should be hidden
     */
    shouldFilterByWord(text: string): boolean {
        const t = text.toLocaleLowerCase();
        return this.excludeWords.some((w) => t.includes(w.toLocaleLowerCase()));
    }

    /**
     * Determines if the content side needs to re-render all threads by comparing with old settings.
     * @param oldSettings old settings
     */
    shouldUpdateLanguageSettings(oldSettings: Settings): boolean {
        if (!SetUtil.equals(oldSettings.includeLanguages, this.includeLanguages)) return true;
        if (oldSettings.includeUnknownLanguage !== this.includeUnknownLanguage) return true;
        if (oldSettings.percentageThreshold !== this.percentageThreshold) return true;
        return false;
    }
}
