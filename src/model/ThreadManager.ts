import DomManager from '../dom/DomManager';
import { Config } from '../Config';
import AppContext from './AppContext';
import CommentInfo from './CommentInfo';

/**
 * Manages one comment thread.
 */
export default class ThreadManager {
    /** Application context. */
    private context: AppContext;
    /** Reference to the thread container element. */
    private elem: HTMLElement;
    /** Main comment observer. */
    private mainCommentObserver: MutationObserver;
    /** Reply comment observer. */
    private replyCommentObserver: MutationObserver;
    /** Main comment information. */
    private mainComment: CommentInfo;
    /** Map of reply information. */
    private replies = new Map<HTMLElement, CommentInfo>();

    // Functions
    private refreshStatusFunc: () => void;

    /**
     * Constructs a ThreadManager.
     * @param elem thread container
     * @param getSettings
     * @param detectLanguage
     */
    constructor(context: AppContext, elem: HTMLElement, refreshStatus: () => void) {
        this.context = context;
        this.elem = elem;
        this.refreshStatusFunc = refreshStatus;

        // main comment
        this.mainComment = new CommentInfo(this.context, elem, false);

        // set up observers
        this.mainCommentObserver = new MutationObserver((m, o) => this.handleMainCommentUpdate(m, o));
        this.replyCommentObserver = new MutationObserver((m, o) => this.handleReplyUpdate(m, o));
    }

    //--------------------------------------------------------------------------
    //    Event Handlers
    //--------------------------------------------------------------------------

    /**
     * Handles the update of the main comment.
     * @param mutations mutation list
     * @param observer observer
     */
    private handleMainCommentUpdate(mutations: MutationRecord[], observer: MutationObserver): void {
        this.refreshMain().catch((error) => {
            if (Config.debug.enabled) console.error(error);
        });
    }

    /**
     * Handles the update of replies.
     * @param mutations mutation list
     */
    private handleReplyUpdate(mutations: MutationRecord[], observer: MutationObserver): void {
        for (const mutation of mutations) {
            if (mutation.type != 'childList') continue;

            // clean outdated replies
            for (const elem of mutation.removedNodes as NodeListOf<HTMLElement>) {
                if (elem.tagName !== Config.dom.selector.ytCommentTagName) continue;
                const r = this.replies.get(elem);
                if (r !== undefined) {
                    r.destroy();
                    this.replies.delete(elem);
                }
            }

            // add new replies
            const ps = [];
            for (const elem of mutation.addedNodes as NodeListOf<HTMLElement>) {
                if (elem.tagName !== Config.dom.selector.ytCommentTagName) continue;
                const r = this.replies.get(elem);
                if (r === undefined) {
                    const rr = new CommentInfo(this.context, elem, true);
                    this.replies.set(elem, rr);
                    ps.push(rr.refreshAll());
                }
            }
            Promise.all(ps).catch((error) => {
                if (Config.debug.enabled) console.error(error);
            });
        }
    }

    //--------------------------------------------------------------------------
    //    Tasks
    //--------------------------------------------------------------------------

    /**
     * Refreshes the entire thread.
     * @return Promise of void
     */
    refreshMain(): Promise<void> {
        this.mainCommentObserver.disconnect();
        this.mainCommentObserver.observe(DomManager.getMainCommentContainer(this.elem), {
            subtree: true,
            characterData: true,
        });
        // console.debug(`refreshMain: ${this.mainComment}`);

        return this.mainComment
            .refreshAll()
            .then((filtered) => {
                // console.debug(`refreshMain filter=${filtered}: ${this.mainComment}`);

                // stop observer
                this.replyCommentObserver.disconnect();

                // reset replies
                [...this.replies.values()].forEach((r) => r.destroy());
                this.replies.clear();

                // observe replies
                const replyContainer = DomManager.findReplyContainer(this.elem);
                if (replyContainer == null) {
                    // console.debug(`No replies: ${this.mainComment}`);
                    return; // no replies
                }
                this.replyCommentObserver.observe(replyContainer, { subtree: false, childList: true });
                // console.debug(`Observe: ${this.mainComment}`);

                // refresh already-rendered replies only if the thread is visible
                if (!filtered) {
                    const ps = [];

                    for (const elem of DomManager.findReplyElements(this.elem)) {
                        const r = new CommentInfo(this.context, elem, true);
                        ps.push(r.refreshAll());
                        this.replies.set(elem, r);
                    }
                    return Promise.all(ps);
                }
            })
            .then(() => this.refreshStatusFunc());
    }

    /**
     * Refreshes filtering.
     * @return Promise of void
     */
    refreshFilter(): Promise<void> {
        // console.debug(`refreshFilter: ${this.mainComment}`);

        return this.mainComment
            .refreshFilter()
            .then((filtered) => {
                if (filtered) return;
                return Promise.all([...this.replies.values()].map((r) => r.refreshFilter()));
            })
            .then(() => this.refreshStatusFunc());
    }

    /**
     * Safely destroy this thread manager.
     */
    destroy(): void {
        // stop observers
        if (this.mainCommentObserver) this.mainCommentObserver.disconnect();
        if (this.replyCommentObserver) this.replyCommentObserver.disconnect();

        // destroy comment info
        this.mainComment.destroy();
        [...this.replies.values()].forEach((r) => r.destroy());
    }
}
