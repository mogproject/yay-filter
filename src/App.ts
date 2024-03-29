import { Config } from './Config';
import DomManager from './dom/DomManager';
import Settings from './model/Settings';
import ThreadManager from './model/ThreadManager';
import AppContext from './model/AppContext';

/**
 * Unexpected URL error.
 */
class UnexpectedUrlError extends Error {
    constructor(url: string) {
        super(`unexpected URL: ${url}`);
    }
}

/**
 * Manages the content-side app.
 */
export default class App {
    /** Application context. */
    private context = new AppContext();
    /** True if reload() has been called. */
    private loaded = false;
    /** Thread list observer. */
    private threadListObserver: MutationObserver;
    /** Map of thread managers. */
    private threadManagers = new Map<HTMLElement, ThreadManager>();

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
     * Manually load the app.
     */
    load(): void {
        if (!this.loaded) this.reload('startup');
    }

    /**
     * Reloads the app.
     */
    reload(reason: string): void {
        // this.log(`reload(${reason})`);

        this.loaded = true;
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
                if (!(error instanceof UnexpectedUrlError)) {
                    if (Config.debug.enabled) console.error(error);
                }
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
        // this.log(`verifyUrl(${url})`);

        if (url != Config.url.targetUrl) throw new UnexpectedUrlError(url);
    }

    /**
     * Loads settings.
     * @return Promise of void
     */
    private loadSettings(): Promise<void> {
        const p = new Promise<void>((resolve, reject) => {
            Settings.loadFromStorage().then(
                (s) => {
                    this.context.settings = s;
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
        this.context.enabled = this.context.settings.isEnabledDefault();
    }

    /**
     * Finds the comment container.
     * @return Promise of the comment container
     */
    private findCommentContainer(): Promise<HTMLElement> {
        // this.log('findCommentContainer');

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
        // this.log('findCommentHeader');

        // check if it already exists (this can happen by a browser's "go back" button, etc.)
        const e = DomManager.findCommentHeader();
        // this.log(String(e));
        if (e != null) return Promise.resolve(e);

        const p = new Promise<HTMLElement>((resolve, reject) => {
            const observer = new MutationObserver((m, o) => {
                // this.log('observer call');

                // check if the comment header exists
                const elem = DomManager.findCommentHeader();
                if (elem == null) return;

                // stop observer
                o.disconnect();

                // return element
                // this.log('observer finds element');
                resolve(elem);
            });
            observer.observe(commentContainer, { subtree: false, childList: true });
        });
        // this.log('watching: ' + String(commentContainer.outerHTML));
        return p;
    }

    /**
     * Injects a filter button.
     * @param commentHeader comment header
     */
    private injectFilterButton(commentHeader: HTMLElement): void {
        // this.log('injectFilterButton()');

        // do not inject
        if (!this.context.settings.isFilterButtonVisible()) {
            this.threadContainer = DomManager.getCommentThreadContainer();
            return;
        }

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
        // this.log('startInitialization');

        this.stopObservers();
        this.yayFilterStatus = this.yayFilterInfo = this.threadContainer = null;
    }

    /**
     * Refreshes all threads.
     */
    private refresh(): void {
        if (this.threadContainer == null) return;

        this.stopObservers();
        this.startObservers(); // observer must start before finding threads

        // process already-rendendered threads
        DomManager.findCommentThreads(this.threadContainer).forEach((t) =>
            this.getOrCreateThreadManager(t)
                .refreshMain()
                .catch((error) => {
                    if (Config.debug.enabled) console.error(error);
                }),
        );
    }

    /**
     * Clears the filter button.
     */
    private clearYayFilterContainer(): void {
        // this.log(`clearYayFilterContainer()`);

        const elem = DomManager.findYayFilterContainer();
        if (elem != null) {
            elem.remove();
        }
    }

    /**
     * Updates the status labels.
     */
    private refreshStatus(): void {
        if (this.threadContainer == null) return;

        const st = this.yayFilterStatus;
        const info = this.yayFilterInfo;

        // const st = DomManager.findYayFilterStatus();
        // const info = DomManager.findYayFilterInfo();

        if (!st || !info) {
            // console.debug(st, info);
            return;
        }

        // FIXME: count incrementally for better performance
        const threads = [...DomManager.findCommentThreads(this.threadContainer)];
        const numVisible = threads.filter((e) => e.style.display != 'none').length;

        DomManager.replaceText(st, this.context.enabled ? 'ON' : 'OFF');
        DomManager.replaceText(info, this.context.enabled ? `(${numVisible} / ${threads.length})` : '');
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
                this.getOrCreateThreadManager(thread)
                    .refreshMain()
                    .catch((error) => {
                        if (Config.debug.enabled) console.error(error);
                    });
            }
        }
    }

    /**
     * Toggles the filtering enabled setting.
     */
    toggleEnabled(): void {
        this.context.enabled = !this.context.enabled;

        if (!this.isReady()) return;
        this.threadManagers.forEach((tm) =>
            tm.refreshFilter().catch((error) => {
                if (Config.debug.enabled) console.error(error);
            }),
        );
        if (this.threadManagers.size == 0) this.refreshStatus();
    }

    /**
     * Updates the current settings.
     * @param func function to update settings
     */
    private updateSettings(func: (s: Settings) => Settings): void {
        if (!this.context.enabled) {
            this.context.settings = func(this.context.settings);
        } else {
            const oldSettings = this.context.settings.copy();
            this.context.settings = func(this.context.settings);
            if (this.context.settings.shouldRefreshFilter(oldSettings)) {
                this.handleSettingsUpdate();
            }
        }
    }

    /**
     * Handles settings updates.
     */
    private handleSettingsUpdate(): void {
        if (!this.isReady()) return;

        for (const tm of this.threadManagers.values()) {
            tm.refreshFilter().catch((error) => {
                if (Config.debug.enabled) console.error(error);
            });
        }
    }

    //--------------------------------------------------------------------------
    //    Utilities
    //--------------------------------------------------------------------------

    /**
     * Gets or creates a thread manager.
     * @param thread thread container
     * @return thread manager
     */
    private getOrCreateThreadManager(thread: HTMLElement): ThreadManager {
        const tm = this.threadManagers.get(thread);
        if (tm === undefined) {
            const t = new ThreadManager(this.context, thread, () => this.refreshStatus());
            this.threadManagers.set(thread, t);
            return t;
        } else {
            return tm;
        }
    }

    /**
     * Prints debugging information.
     * @param text text to output
     */
    private log(text: string): void {
        if (Config.debug.enabled) {
            const date = new Date();
            console.debug(`[${date.toISOString()}] ${text}`);
        }
    }
}
