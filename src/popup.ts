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

        const selectContainer = document.createElement('div') as HTMLDivElement;
        selectContainer.className = 'popup-lang-select-container';
        this.sectionLanguagesSelect = this.createLanguageSelect();
        const buttonAddLanguage = this.createLanguageAddButton();

        selectContainer.appendChild(this.sectionLanguagesSelect);
        selectContainer.appendChild(buttonAddLanguage);

        this.formLanguages.appendChild(this.sectionLanguagesList);
        this.formLanguages.appendChild(this.createUnknownLanguage());
        this.formLanguages.appendChild(selectContainer);

        settingsDiv.appendChild(DomManager.createElementWithText('h4', chrome.i18n.getMessage('languages')));
        settingsDiv.appendChild(this.formLanguages);

        // add to the main element
        mainElem.appendChild(header);
        mainElem.appendChild(settingsDiv);
        mainElem.appendChild(footer);

        // render dynamic elements
        this.render(this.settings);
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
        const [checkbox, label] = DomManager.createCheckbox(
            'chk-enabled-default',
            settings.isEnabledDefault(),
            chrome.i18n.getMessage('enable_by_default'),
            (ev: Event) => this.updateEnabledDefault((ev.target as HTMLInputElement).checked),
        );
        this.sectionGeneral.appendChild(checkbox);
        this.sectionGeneral.appendChild(label);

        // listed languages
        this.settings.getListedLanguages().forEach((lang) => this.renderAddedLanguage(lang));

        // set unknown language
        const elem = document.getElementById('chk-lang-unknown') as HTMLInputElement;
        if (elem !== undefined) elem.checked = this.settings.getIncludeUnknown();
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
        const container = document.createElement('div') as HTMLDivElement;

        container.id = 'lang-unknown';
        container.className = 'popup-lang-container';
        const [checkbox, label] = DomManager.createCheckbox(
            'chk-lang-unknown',
            this.settings.getIncludeUnknown(),
            chrome.i18n.getMessage('unknown'),
            (ev: Event) => this.updateLanguageUnknown((ev.target as HTMLInputElement).checked),
        );
        container.appendChild(checkbox);
        container.appendChild(label);

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

        const container = document.createElement('div') as HTMLDivElement;
        container.id = containerId;
        container.className = 'popup-lang-container';
        const [checkbox, label] = DomManager.createCheckbox(
            `chk-lang-${languageCode}`,
            this.settings.getIncludeLanguages().has(languageCode),
            description,
            (ev: Event) => this.updateLanguageSettings(languageCode, (ev.target as HTMLInputElement).checked),
        );
        container.appendChild(checkbox);
        container.appendChild(label);
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
     * Handles a change of the language setting.
     * @param languageCode language code
     * @param value new value
     */
    private updateLanguageSettings(languageCode: string, value: boolean): void {
        this.settings.setIncludeLanguage(languageCode, value).saveToStorage();
    }

    /**
     * Handles a change of the unknown language setting.
     * @param value new value
     */
    private updateLanguageUnknown(value: boolean): void {
        this.settings.setIncludeUnknown(value).saveToStorage();
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
