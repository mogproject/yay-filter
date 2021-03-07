import { Config } from './Config';
import DomManager from './dom/DomManager';
import Settings from './model/Settings';

/**
 * Manages the pop-up page.
 */
class PopupApp {
    /** Current settings. */
    private settings: Settings;
    /** Language look-up table. */
    private langMap: Map<string, string>;
    /** Reference to the languages form. */
    private formLanguages: HTMLFormElement;
    /** Reference to the general section div. */
    private sectionGeneral: HTMLDivElement;
    /** Reference to the language list. */
    private sectionLanguagesList: HTMLDivElement;
    /** Reference to the language select. */
    private sectionLanguagesSelect: HTMLSelectElement;
    /** Reference to the blocked words form. */
    private formBlockedWords: HTMLFormElement;
    /** Reference to the blocked words input. */
    private blockedWordsInput: HTMLTextAreaElement;
    /** Reference to the blocked words save button. */
    private buttonSaveBlockedWords: HTMLInputElement;

    /**
     * Constructs the app.
     * @param settings settings
     */
    constructor(settings: Settings) {
        this.settings = settings;

        // create language map
        this.langMap = new Map<string, string>();
        for (const [code, name, localName] of Config.languages) {
            const description =
                localName.toLocaleLowerCase() == name.toLocaleLowerCase() ? name : `${name} (${localName})`;
            this.langMap.set(code, description);
        }

        // render static elements

        // create HTML elements
        const mainElem = DomManager.getElementById('popup-main');

        // header
        const header = document.createElement('header') as HTMLElement;
        const title = document.createElement('span');
        title.className = 'popup-title';
        title.appendChild(document.createTextNode('Yay Filter'));
        const titleVersion = document.createElement('span');
        titleVersion.className = 'popup-title-version';
        titleVersion.appendChild(document.createTextNode(`v${Config.version}`));
        header.appendChild(title);
        header.appendChild(titleVersion);

        // footer
        const footer = document.createElement('footer') as HTMLElement;
        const resetLink = DomManager.createAnchor('#', chrome.i18n.getMessage('reset_settings'), '');
        resetLink.addEventListener('click', () => this.resetSetings());
        footer.appendChild(resetLink);
        footer.appendChild(DomManager.createAnchor(Config.url.projectUrl, chrome.i18n.getMessage('visit_homepage')));
        footer.appendChild(DomManager.createAnchor(Config.url.donationUrl, chrome.i18n.getMessage('donate')));

        // setttings
        const settingsDiv = document.createElement('div') as HTMLDivElement;
        settingsDiv.className = 'popup-settings';

        // (1) General Settings
        this.sectionGeneral = document.createElement('div') as HTMLDivElement;
        settingsDiv.appendChild(this.sectionGeneral);

        // (2) Languages
        this.formLanguages = DomManager.createForm(() => this.addListedLanguage(this.sectionLanguagesSelect.value));

        this.sectionLanguagesList = document.createElement('div') as HTMLDivElement;

        this.sectionLanguagesSelect = this.createLanguageSelect();
        const buttonAddLanguage = this.createLanguageAddButton();
        this.formLanguages.appendChild(this.sectionLanguagesList);
        this.formLanguages.appendChild(this.createUnknownLanguage());
        this.formLanguages.appendChild(
            DomManager.createDiv([this.sectionLanguagesSelect, buttonAddLanguage], 'popup-lang-select-container'),
        );

        settingsDiv.appendChild(DomManager.createElementWithText('h4', chrome.i18n.getMessage('languages')));
        settingsDiv.appendChild(this.formLanguages);

        // (3) Blocked Words
        this.formBlockedWords = DomManager.createForm(() => this.saveBlockedWords(this.blockedWordsInput.value));
        this.formBlockedWords.id = 'popup-form-blocked-words';
        this.blockedWordsInput = this.createBlockedWordsTextArea();
        this.buttonSaveBlockedWords = this.createBlockedWordsSaveButton();

        this.formBlockedWords.appendChild(DomManager.createDiv([this.blockedWordsInput]));
        this.formBlockedWords.appendChild(
            DomManager.createDiv([this.buttonSaveBlockedWords], 'popup-button-container'),
        );

        settingsDiv.appendChild(DomManager.createElementWithText('h4', chrome.i18n.getMessage('blocked_words')));
        settingsDiv.appendChild(this.formBlockedWords);

        // add to the main element
        mainElem.appendChild(header);
        mainElem.appendChild(settingsDiv);
        mainElem.appendChild(footer);

        // render dynamic elements
        this.render(this.settings);
    }

    private createBlockedWordsTextArea(): HTMLTextAreaElement {
        const elem = document.createElement('textarea') as HTMLTextAreaElement;
        elem.placeholder = chrome.i18n.getMessage('blocked_words_description');
        elem.rows = 3;
        elem.wrap = 'off';
        elem.maxLength = 500;
        elem.addEventListener('input', () => this.renderBlockedWordsAddButton());

        return elem;
    }

    private createBlockedWordsSaveButton(): HTMLInputElement {
        const elem = DomManager.createSubmit(
            chrome.i18n.getMessage('save'),
            chrome.i18n.getMessage('save_blocked_words'),
        );
        elem.className = 'popup-button-save';
        return elem;
    }

    /**
     * Clears all dynamic HTML elements.
     */
    private clearElements(): void {
        DomManager.clearChildElements(this.sectionGeneral);
        DomManager.clearChildElements(this.sectionLanguagesList);
    }

    /**
     * Renders dynamic HTML elements.
     * @param settings settings to apply
     */
    private render(settings: Settings): void {
        // general settings
        this.sectionGeneral.appendChild(
            DomManager.createCheckbox(
                'chk-enabled-default',
                settings.isEnabledDefault(),
                chrome.i18n.getMessage('enable_by_default'),
                (ev: Event) => this.updateEnabledDefault((ev.target as HTMLInputElement).checked),
            ),
        );
        this.sectionGeneral.appendChild(
            DomManager.createCheckbox(
                'chk-filter-replies',
                settings.getFilterReplies(),
                chrome.i18n.getMessage('filter_replies'),
                (ev: Event) => this.updateFilterReplies((ev.target as HTMLInputElement).checked),
            ),
        );

        // listed languages
        this.settings.getListedLanguages().forEach((lang) => this.renderAddedLanguage(lang));

        // set unknown language
        const elem = document.getElementById('chk-lang-unknown') as HTMLInputElement;
        if (elem !== undefined) elem.checked = this.settings.getSelectUnknown();

        // blocked words
        this.blockedWordsInput.value = this.settings.getBlockedWords().join('\n');
        this.renderBlockedWordsAddButton();
    }

    /**
     * Creates the language select.
     */
    private createLanguageSelect(): HTMLSelectElement {
        const elem = document.createElement('select') as HTMLSelectElement;
        elem.className = 'popup-lang-select';

        elem.appendChild(DomManager.createOption('--', chrome.i18n.getMessage('select_language')));
        Config.languages.forEach((lang) => {
            const text = this.langMap.get(lang[0]);
            if (text) elem.appendChild(DomManager.createOption(lang[0], text));
        });
        return elem;
    }

    /**
     * Creates the language add button.
     */
    private createLanguageAddButton(): HTMLInputElement {
        const elem = DomManager.createSubmit('╋', chrome.i18n.getMessage('add_this_language'));
        elem.className = 'popup-button-icon-add';
        return elem;
    }

    /**
     * Creates a language remove button for the given language.
     * @param languageCode language code
     */
    private createLanguageRemoveButton(languageCode: string): HTMLInputElement {
        const elem = DomManager.createButton('━', chrome.i18n.getMessage('remove_this_language'), () =>
            this.removeListedLanguage(languageCode),
        );
        elem.className = 'popup-button-icon-remove';
        return elem;
    }

    /**
     * Creates the unknown language checkbox with a label.
     */
    private createUnknownLanguage(): HTMLDivElement {
        const container = DomManager.createCheckbox(
            'chk-lang-unknown',
            this.settings.getSelectUnknown(),
            chrome.i18n.getMessage('unknown'),
            (ev: Event) => this.updateLanguageUnknown((ev.target as HTMLInputElement).checked),
        );
        container.id = 'lang-unknown';
        container.className = 'popup-lang-container';
        return container;
    }

    /**
     * Renders a checkbox for the given language with a label and remove button.
     * @param languageCode language code
     */
    private renderAddedLanguage(languageCode: string): void {
        const description = this.langMap.get(languageCode);
        if (description == null) return;

        const containerId = `lang-${languageCode}`;
        if (document.getElementById(containerId) != null) return; // already included

        const container = DomManager.createCheckbox(
            `chk-lang-${languageCode}`,
            this.settings.getSelectedLanguages().has(languageCode),
            description,
            (ev: Event) => this.updateLanguageSettings(languageCode, (ev.target as HTMLInputElement).checked),
        );
        container.id = containerId;
        container.className = 'popup-lang-container';
        container.appendChild(this.createLanguageRemoveButton(languageCode));

        this.sectionLanguagesList.appendChild(container);
    }

    /**
     * Removes the checkbox for the given language.
     * @param languageCode language code
     */
    private renderRemovedLanguage(languageCode: string): void {
        const elem = document.getElementById(`lang-${languageCode}`);
        if (elem != null) elem.remove();
    }

    private renderBlockedWordsAddButton(): void {
        this.buttonSaveBlockedWords.disabled =
            this.settings.getBlockedWords().join('\n') === this.blockedWordsInput.value;
    }

    //--------------------------------------------------------------------------
    //    Event Handlers
    //--------------------------------------------------------------------------

    /**
     * Handles a change of the default enabled.
     * @param value new value
     */
    private updateEnabledDefault(value: boolean): void {
        this.settings.setEnabledDefault(value).saveToStorage();
    }

    /**
     * Handles a change of the filter replies.
     * @param value new value
     */
    private updateFilterReplies(value: boolean): void {
        this.settings.setFilterReplies(value).saveToStorage();
    }
    /**
     * Handles a change of the language setting.
     * @param languageCode language code
     * @param value new value
     */
    private updateLanguageSettings(languageCode: string, value: boolean): void {
        this.settings.setSelectedLanguage(languageCode, value).saveToStorage();
    }

    /**
     * Handles a change of the unknown language setting.
     * @param value new value
     */
    private updateLanguageUnknown(value: boolean): void {
        this.settings.setSelectUnknown(value).saveToStorage();
    }

    /**
     * Adds another language to the list.
     * @param languageCode language code
     */
    private addListedLanguage(languageCode: string): void {
        this.settings.addListedLanguage(languageCode, true).saveToStorage();
        this.renderAddedLanguage(languageCode);
    }

    /**
     * Removes a language from the list.
     * @param languageCode language code
     */
    private removeListedLanguage(languageCode: string): void {
        this.settings.removeListedLanguage(languageCode).saveToStorage();
        this.renderRemovedLanguage(languageCode);
    }

    private saveBlockedWords(blockedWordsText: string): void {
        this.buttonSaveBlockedWords.disabled = true;
        this.settings.setBlockedWords(blockedWordsText.split('\n')).saveToStorage();
        this.blockedWordsInput.value = this.settings.getBlockedWords().join('\n');
    }

    /**
     * Resets to the default settings.
     */
    private resetSetings(): void {
        this.settings = new Settings();
        this.clearElements();
        this.render(this.settings);
        this.sectionLanguagesSelect.selectedIndex = 0;
        this.settings.saveToStorage();
    }
}

/**
 * Entry point of the program.
 */
function main() {
    Settings.loadFromStorage() // load settings
        .catch((error) => {
            // fallback
            return new Settings();
        })
        .then((s) => new PopupApp(s))
        .catch((error) => {
            console.error(error);
        });
}

main();
