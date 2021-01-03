import { Config } from './Config';
import DomManager from './dom/DomManager';
import Settings from './model/Settings';
import ThreadManager from './model/ThreadManager';
import LanguageDetector from './lang/LanguageDetector';

/**
 * Manages the content-side app.
 */
export default class App {
    /** True if filtering is currently enabled. */
    private enabled = true;
    /** Current settings. */
    private settings: Settings = new Settings();
    /** Language detector. */
    private languageDetector = new LanguageDetector(Config.settings.maxLanguageDetectorCacheSize);
    /** Thread list observer. */
    private threadListObserver: MutationObserver;
    /** Array of thread managers. */
    private threadManagers = new Map<HTMLElement, ThreadManager>();
    /** Flag for debugging. */
    private debugLogEnabled = true;

    // HTML Elements
    private yayFilterStatus: HTMLElement | null = null;
    private yayFilterInfo: HTMLElement | null = null;
    private threadContainer: HTMLElement | null = null;

    /**
     * Constructs an App instance.
     */
    constructor() {
        // watch settings
        // FIXME: Move this listener to background script so that we can avoid unnecessary console errors
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName != 'sync') return;
            this.updateSettings(() => Settings.loadFromJSON(changes.settings.newValue));
        });

        // define thread list observer
        this.threadListObserver = new MutationObserver((m, o) => this.handleThreadListUpdate(m, o));
    }

    /**
     * Reloads the app.
     */
    reload(reason: string): void {
        Promise.resolve()
            .then(() => this.verifyUrl(`${window.location.host}${window.location.pathname}`))
            .then(() => this.startInitialization())
            .then(() => this.loadSettings())
            .then(() => this.setEnabledFromDefault())
            .then(() => this.findCommentContainer())
            .then((elem) => this.findCommentHeader(elem))
            .then((elem) => this.injectFilterButton(elem))
            .then(() => this.refresh())
            .catch((error) => {
                if (this.debugLogEnabled) console.error(error);
            });
    }

    /**
     * Checks if the app is ready for accepting events.
     * @return true if ready
     */
    private isReady(): boolean {
        return this.threadContainer != null;
    }

    //--------------------------------------------------------------------------
    //    Observers
    //--------------------------------------------------------------------------

    /**
     * Starts observers.
     */
    private startObservers(): void {
        if (this.threadListObserver != null && this.threadContainer != null) {
            this.threadListObserver.observe(this.threadContainer, { subtree: false, childList: true });
        }
    }

    /**
     * Stops all observers.
     */
    private stopObservers(): void {
        this.threadListObserver.disconnect();
    }

    //--------------------------------------------------------------------------
    //    Tasks
    //--------------------------------------------------------------------------

    /**
     * Verifies the URL.
     * @param url URL to check
     */
    private verifyUrl(url: string): void {
        if (url != Config.url.targetUrl) throw new Error('unexpected URL');
    }

    /**
     * Loads settings.
     * @return Promise of void
     */
    private loadSettings(): Promise<void> {
        const p = new Promise<void>((resolve, reject) => {
            Settings.loadFromStorage().then(
                (s) => {
                    this.settings = s;
                    resolve();
                },
                (error) => reject(error),
            );
        });
        return p;
    }

    /**
     * Sets the default enabled setting.
     */
    private setEnabledFromDefault(): void {
        this.enabled = this.settings.isEnabledDefault();
    }

    /**
     * Finds the comment container.
     * @return Promise of the comment container
     */
    private findCommentContainer(): Promise<HTMLElement> {
        const p = new Promise<HTMLElement>((resolve, reject) => {
            DomManager.withCommentContainer((elem) => {
                if (elem == null) {
                    reject('comment container not found');
                } else {
                    resolve(elem);
                }
            });
        });
        return p;
    }

    /**
     * Finds the comment header element.
     * @param commentContainer comment container
     * @return Promise of the comment header element
     */
    private findCommentHeader(commentContainer: HTMLElement): Promise<HTMLElement> {
        const p = new Promise<HTMLElement>((resolve, reject) => {
            const observer = new MutationObserver((m, o) => {
                // check if the comment header exists
                const elem = DomManager.findCommentHeader();
                if (elem == null) return;

                // stop observer
                o.disconnect();

                // return element
                resolve(elem);
            });
            observer.observe(commentContainer, { subtree: false, childList: true });
        });
        return p;
    }

    /**
     * Injects a filter button.
     * @param commentHeader comment header
     */
    private injectFilterButton(commentHeader: HTMLElement): void {
        // create filter button
        this.clearYayFilterContainer();
        const [c, s, i] = DomManager.createYayFilterContainer(() => this.toggleEnabled());
        commentHeader.appendChild(c);

        // set elements
        this.yayFilterStatus = s;
        this.yayFilterInfo = i;
        this.threadContainer = DomManager.getCommentThreadContainer();

        // refresh status
        this.refreshStatus();
    }

    /**
     * Clears outdated information and stops observers.
     */
    private startInitialization(): void {
        this.stopObservers();
        this.yayFilterStatus = this.yayFilterInfo = this.threadContainer = null;
    }

    /**
     * Refreshes all threads.
     */
    private refresh(): void {
        this.stopObservers();
        this.startObservers(); // observer must start before finding threads

        // process already-rendendered threads
        DomManager.findCommentThreads().forEach((t) =>
            this.getOrCreateThreadManager(t)[0]
                .refreshAll()
                .catch((error) => {
                    // do nothing
                }),
        );
    }

    /**
     * Clears the filter button.
     */
    private clearYayFilterContainer(): void {
        const elem = DomManager.findYayFilterContainer();
        if (elem != null) {
            elem.remove();
        }
    }

    /**
     * Updates the status labels.
     */
    private refreshStatus(): void {
        const st = this.yayFilterStatus;
        const info = this.yayFilterInfo;

        // const st = DomManager.findYayFilterStatus();
        // const info = DomManager.findYayFilterInfo();

        if (!st || !info) {
            // console.log(st, info);
            return;
        }

        // FIXME: count incrementally for better performance
        const threads = [...DomManager.findCommentThreads()];
        const numVisible = threads.filter((e) => e.style.display != 'none').length;

        DomManager.replaceText(st, this.enabled ? 'ON' : 'OFF');
        DomManager.replaceText(info, this.enabled ? `(${numVisible} / ${threads.length})` : '');
    }

    //--------------------------------------------------------------------------
    //    Event Handlers
    //--------------------------------------------------------------------------

    /**
     * Handles the update of the thread list.
     * @param mutations mutation list
     * @param observer mutation observer
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleThreadListUpdate(mutations: MutationRecord[], observer: MutationObserver): void {
        if (!this.isReady()) return;

        for (const mutation of mutations) {
            if (mutation.type != 'childList') continue;

            // clean outdated thread managers
            for (const thread of mutation.removedNodes as NodeListOf<HTMLElement>) {
                const tm = this.threadManagers.get(thread);
                if (tm !== undefined) {
                    tm.destroy();
                    this.threadManagers.delete(thread);
                }
            }
            if (mutation.removedNodes.length != 0) this.refreshStatus();

            // create new thread managers
            for (const thread of mutation.addedNodes as NodeListOf<HTMLElement>) {
                this.getOrCreateThreadManager(thread)[0]
                    .refreshAll()
                    .catch((error) => {
                        // do nothing
                    });
            }
        }
    }

    /**
     * Toggles the filtering enabled setting.
     */
    toggleEnabled(): void {
        this.enabled = !this.enabled;

        if (!this.isReady()) return;
        this.threadManagers.forEach((tm) =>
            tm.refreshFilter().catch((error) => {
                // do nothing
            }),
        );
    }

    /**
     * Updates the current settings.
     * @param func function to update settings
     */
    private updateSettings(func: (s: Settings) => Settings): void {
        if (!this.enabled) {
            this.settings = func(this.settings);
        } else {
            const oldSettings = this.settings.copy();
            this.settings = func(this.settings);
            if (this.settings.shouldUpdateLanguageSettings(oldSettings)) {
                this.handleSettingsUpdate();
            }
        }
    }

    /**
     * Handles settings updates.
     */
    private handleSettingsUpdate(): void {
        if (!this.isReady()) return;

        for (const tm of this.threadManagers.values())
            tm.refreshFilter().catch((error) => {
                // do nothing
            });
    }

    //--------------------------------------------------------------------------
    //    Utilities
    //--------------------------------------------------------------------------

    /**
     * Gets or creates a thread manager.
     * @param thread thread container
     * @return tuple of a thread manager and if the manager is new
     */
    private getOrCreateThreadManager(thread: HTMLElement): [ThreadManager, boolean] {
        const tm = this.threadManagers.get(thread);
        if (tm === undefined) {
            const t = new ThreadManager(
                thread,
                () => (this.enabled ? this.settings : null),
                (text: string) => this.languageDetector.detectLanguage(text),
                () => this.refreshStatus(),
            );
            this.threadManagers.set(thread, t);
            return [t, true];
        } else {
            return [tm, false];
        }
    }

    /**
     * Prints debugging information.
     * @param text text to output
     */
    private log(text: string): void {
        if (this.debugLogEnabled) {
            const date = new Date();
            console.debug(`[${date.toISOString()}] ${text}`);
        }
    }
}
