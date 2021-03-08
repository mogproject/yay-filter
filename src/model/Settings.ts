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
    /** True if the filter button should be injected. (since v0.1.2) */
    private showFilterButton: boolean;
    /** True if language filter is enabled. (since v0.1.2) */
    private filterByLanguage: boolean;
    /** True if the selected languages should be treated as a blocklist. (since v0.1.2) */
    private blockSelectedLanguages: boolean;
    /** Languages to be selected. */
    private selectedLanguages: Set<string>;
    /** Languages shown in the menu. */
    private listedLanguages: string[];
    /** Lowerbound of the language usage in each comment. */
    private percentageThreshold: number;
    /** True if the comment with unknown languages should be selected. */
    private selectUnknownLanguage: boolean;
    /** True if word filter is enabled. (since v0.1.2) */
    private filterByWord: boolean;
    /** Words to exclude. */
    private blockedWords: string[];
    /** True if blocked words should be treated as regular expression. (since v0.1.2) */
    private regularExpressionEnabled: boolean;
    /** True if reply comments should be filtered. */
    private filterReplies: boolean;
    /** Cache of regular expressions. */
    private regExp: RegExp[];

    /**
     * Constructs settings.
     * @param enabledDefault enabled by default
     * @param showFilterButton show filter button
     * @param filterByLanguage enable language filtering
     * @param blockSelectedLanguages block languages instead of allowing
     * @param selectedLanguages languages to be selected
     * @param selectUnknownLanguage true if unknown languages should be selected
     * @param listedLanguages listed languages
     * @param percentageThreshold percentage threshold
     * @param filterByWord enable word filtering
     * @param excludeWords words to exclude
     * @param regularExpressionEnabled enable regular expression
     * @param filterReplies filter replies
     */
    constructor(
        enabledDefault?: boolean | undefined,
        showFilterButton?: boolean | undefined,
        filterByLanguage?: boolean | undefined,
        blockSelectedLanguages?: boolean | undefined,
        selectedLanguages?: Array<string> | undefined,
        selectUnknownLanguage?: boolean | undefined,
        listedLanguages?: Array<string> | undefined,
        percentageThreshold?: number | undefined,
        filterByWord?: boolean | undefined,
        excludeWords?: string[] | undefined,
        regularExpressionEnabled?: boolean | undefined,
        filterReplies?: boolean | undefined,
    ) {
        // enabled default: default true
        this.enabledDefault = enabledDefault === undefined ? true : enabledDefault;

        // filter button: default true
        this.showFilterButton = showFilterButton == undefined ? true : showFilterButton;

        // language filter: default true
        this.filterByLanguage = filterByLanguage == undefined ? true : filterByLanguage;

        // blocklist: default false
        this.blockSelectedLanguages = blockSelectedLanguages == undefined ? false : blockSelectedLanguages;

        // include languages: default read browser settings
        const languages =
            selectedLanguages === undefined ? this.getPreferredLanguages() : ArrayUtil.distinct(selectedLanguages);
        this.selectedLanguages = new Set(languages);

        // include unknown languages: default false
        this.selectUnknownLanguage = selectUnknownLanguage === undefined ? false : selectUnknownLanguage;

        // listed languages: default clone the include languages
        if (listedLanguages === undefined) {
            this.listedLanguages = [...this.selectedLanguages];
        } else {
            // listed languages must be a superset of the include languages
            const ll = new Set(listedLanguages);

            // prepend include languages that are not in the list
            this.listedLanguages = languages.filter((s) => !ll.has(s)).concat(ArrayUtil.distinct(listedLanguages));
        }

        // percentage threshold: default defined in Config
        this.percentageThreshold =
            percentageThreshold === undefined ? Config.settings.defaultPercentageThreshould : percentageThreshold;

        // word filter: default true
        this.filterByWord = filterByWord == undefined ? true : filterByWord;

        // exclude words: default empty
        this.blockedWords = excludeWords === undefined ? [] : excludeWords;

        // regular expression: default false
        this.regularExpressionEnabled = regularExpressionEnabled == undefined ? false : regularExpressionEnabled;
        this.regExp = [];
        this.cacheRegExp();

        // filter replies: default false
        this.filterReplies = filterReplies === undefined ? false : filterReplies;
    }

    /**
     * Creates RegExp instances for blocked words in regular expression.
     */
    private cacheRegExp(): void {
        if (this.regularExpressionEnabled) {
            this.regExp = this.blockedWords.map((w) => new RegExp(w, 'i'));
        }
    }

    /**
     * Returns a copy of this Settings.
     * @return copy of the settings
     */
    copy(): Settings {
        return new Settings(
            this.enabledDefault,
            this.showFilterButton,
            this.filterByLanguage,
            this.blockSelectedLanguages,
            [...this.selectedLanguages],
            this.selectUnknownLanguage,
            [...this.listedLanguages],
            this.percentageThreshold,
            this.filterByWord,
            [...this.blockedWords],
            this.regularExpressionEnabled,
            this.filterReplies,
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
            ef: this.showFilterButton,
            el: this.filterByLanguage,
            bl: this.blockSelectedLanguages,
            il: this.listedLanguages.filter((s) => this.selectedLanguages.has(s)), // order languages
            iu: this.selectUnknownLanguage,
            ll: this.listedLanguages,
            pt: this.percentageThreshold,
            ew: this.filterByWord,
            bw: this.blockedWords,
            re: this.regularExpressionEnabled,
            fr: this.filterReplies,
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
        return new Settings(
            obj.ed,
            obj.ef,
            obj.el,
            obj.bl,
            obj.il,
            obj.iu,
            obj.ll,
            obj.pt,
            obj.ew,
            obj.bw,
            obj.re,
            obj.fr,
        );
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
     * @param enabled true if filtering is enabled by defaultenabled
     * @return updated settings
     */
    setEnabledDefault(enabled: boolean): Settings {
        this.enabledDefault = enabled;
        return this;
    }

    /**
     * Returns the filter button visible setting.
     * @return true if filter button is visible
     */
    isFilterButtonVisible(): boolean {
        return this.showFilterButton;
    }

    /**
     * Updates the filter button visible setting.
     * @param enabled true if filter button is visibleenabled
     * @return updated settings
     */
    setFilterButtonVisible(visible: boolean): Settings {
        this.showFilterButton = visible;
        return this;
    }

    /**
     * Returns the language filter setting.
     * @return true if language filter is enabled
     */
    isLanguageFilterEnabled(): boolean {
        return this.filterByLanguage;
    }

    /**
     * Updates the language filter setting.
     * @param enabled true if language filter is enabledenabled
     * @return updated settings
     */
    setLanguageFilterEnabled(enabled: boolean): Settings {
        this.filterByLanguage = enabled;
        return this;
    }

    /**
     * Returns the language blocklist setting.
     * @return true if language filter is blocklist
     */
    isLanguageBlockList(): boolean {
        return this.blockSelectedLanguages;
    }

    /**
     * Updates the language blocklist setting.
     * @param isBlockList if language filter is blocklistenabled
     * @return updated settings
     */
    setLanguageBlockList(isBlockList: boolean): Settings {
        this.blockSelectedLanguages = isBlockList;
        return this;
    }

    /**
     * Updates a language filtering setting.
     * @param language language code
     * @param value true if the language should be visible
     * @return updated settings
     */
    setSelectedLanguage(language: string, value: boolean): Settings {
        if (!this.listedLanguages.includes(language)) throw new Error('language is not listed');

        if (value) {
            this.selectedLanguages.add(language);
        } else {
            this.selectedLanguages.delete(language);
        }
        return this;
    }

    /**
     * Returns the set of the languages to be visible.
     * @return set of language codes
     */
    getSelectedLanguages(): Set<string> {
        return this.selectedLanguages;
    }

    /**
     * Returns the unknown language setting.
     * @return true if unknown languages should be visible
     */
    getSelectUnknown(): boolean {
        return this.selectUnknownLanguage;
    }

    /**
     * Updates the unknown language setting.
     * @param value true if unknown languages should be visible
     * @return updated settings
     */
    setSelectUnknown(value: boolean): Settings {
        this.selectUnknownLanguage = value;
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
        if (include) this.selectedLanguages.add(language);
        return this;
    }

    /**
     * Removes a language from the list.
     * @param language language code
     * @return updated settings
     */
    removeListedLanguage(language: string): Settings {
        // first, unselect if it is checked
        if (this.selectedLanguages.has(language)) {
            this.selectedLanguages.delete(language);
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
     * @return updated settings
     */
    setPercentageThreshold(value: number): Settings {
        this.percentageThreshold = Math.max(0, Math.min(100, value));
        return this;
    }

    /**
     * Returns the word filter setting.
     * @return true if word filter is enabled
     */
    isWordFilterEnabled(): boolean {
        return this.filterByWord;
    }

    /**
     * Updates the word filter setting.
     * @param enabled true if word filter is enabled
     * @return updated settings
     */
    setWordFilterEnabled(enabled: boolean): Settings {
        this.filterByWord = enabled;
        return this;
    }

    /**
     * Returns the list of blocked words.
     * @return blocked word list
     */
    getBlockedWords(): string[] {
        return this.blockedWords;
    }

    /**
     * Updates the list of blocked words.
     * @param words word list
     * @return updated settings
     */
    setBlockedWords(words: string[]): Settings {
        // clean whitespace
        const cleaned = words.map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s);
        this.blockedWords = cleaned;
        this.cacheRegExp();
        return this;
    }

    /**
     * Returns the regular expression setting.
     * @return true if word filter is in regular expression
     */
    isRegularExpression(): boolean {
        return this.regularExpressionEnabled;
    }

    /**
     * Updates the regular expression setting.
     * @param enabled if word filter is in regular expression
     * @return updated settings
     */
    setRegularExpression(enabled: boolean): Settings {
        this.regularExpressionEnabled = enabled;
        this.cacheRegExp();
        return this;
    }

    /**
     * Returns if replies should be filtered.
     * @return filter replies
     */
    getFilterReplies(): boolean {
        return this.filterReplies;
    }

    /**
     * Updates if replies should be filtered.
     * @param value new filter replies
     * @return updated settings
     */
    setFilterReplies(value: boolean): Settings {
        this.filterReplies = value;
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
        if (!this.filterByLanguage) return false; // no filter

        if (this.matchByLanguage(detectedLanguages)) {
            return !this.blockSelectedLanguages;
        } else {
            return this.blockSelectedLanguages;
        }
    }

    /**
     * Checks if the language filter matches the language filter.
     * @param detectedLanguages detected languages
     * @return true if the content matches the language filter.
     */
    private matchByLanguage(detectedLanguages: LanguageDetectorResult): boolean {
        // shortcut when no languages are selected
        if (this.selectedLanguages.size == 0 && !this.selectedLanguages) return true;

        // filter by percentage
        const filtered = detectedLanguages.languages
            .filter((lang) => lang.percentage >= this.percentageThreshold)
            .map((lang) => lang.language);

        // unknown
        if (filtered.length == 0) return !this.selectUnknownLanguage;

        return !filtered.some((lang) => {
            if (lang == 'und' && this.selectUnknownLanguage) return true; // unknown

            // treat as an ISO-639-1 code
            const code = lang.charAt(2) == '-' ? lang.substring(0, 2) : lang;
            return this.selectedLanguages.has(code);
        });
    }

    /**
     * Checks if the word filter should hide the content.
     * @param text text to be examined
     * @return true if the content should be hidden
     */
    shouldFilterByWord(text: string): boolean {
        if (!this.filterByWord) return false; // no filter

        if (this.regularExpressionEnabled) {
            return this.regExp.some((r) => text.match(r));
        } else {
            const t = text.toLocaleLowerCase();
            return this.blockedWords.some((w) => t.includes(w.toLocaleLowerCase()));
        }
    }

    /**
     * Determines if the content side needs to refresh filtering by comparing with old settings.
     * @param oldSettings old settings
     * @return true if the content script should refresh
     */
    shouldRefreshFilter(oldSettings: Settings): boolean {
        if (!SetUtil.equals(oldSettings.selectedLanguages, this.selectedLanguages)) return true;
        if (oldSettings.filterByLanguage !== this.filterByLanguage) return true;
        if (oldSettings.blockSelectedLanguages !== this.blockSelectedLanguages) return true;
        if (oldSettings.selectUnknownLanguage !== this.selectUnknownLanguage) return true;
        if (oldSettings.percentageThreshold !== this.percentageThreshold) return true;

        if (oldSettings.filterByWord !== this.filterByWord) return true;
        if (oldSettings.regularExpressionEnabled !== this.regularExpressionEnabled) return true;

        // FIXME: improve performance?
        if (!SetUtil.equals(new Set(oldSettings.blockedWords), new Set(this.blockedWords))) return true;
        if (oldSettings.filterReplies !== this.filterReplies) return true;
        return false;
    }
}
