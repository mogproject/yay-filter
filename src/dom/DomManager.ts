import { Config } from '../Config';

/**
 * Handles DOM elements on YouTube.
 */
export default class DomManager {
    /**
     * Gets the first element that matches the query.
     * @param query query
     * @param ancestor ancestor element
     */
    static getElementByQuery(query: string, ancestor: HTMLElement | null = null): HTMLElement {
        const elem = (ancestor == null ? document : ancestor).querySelector(query);
        if (elem == null) throw new Error(`Element not found: ${query}`);
        return elem as HTMLElement;
    }

    /**
     * Gets the first element that has the specific ID.
     * @param id element ID
     */
    static getElementById(id: string): HTMLElement {
        return this.getElementByQuery(`#${id}`);
    }

    /**
     * Finds the comment container from the page.
     * @return comment container element or null if it has not yet rendered
     */
    static findCommentContainer(): HTMLElement | null {
        return document.querySelector(Config.dom.selector.ytCommentContainer);
    }

    /**
     * Waits for and gets the comment container.
     * @param callback callback function
     * @param timeout timeout in milliseconds
     * @param delay polling interval in milliseconds
     */
    static withCommentContainer(callback: (elem: HTMLElement | null) => void, timeout = 30000, delay = 200): void {
        if (timeout <= 0) {
            // time limit exceeded
            callback(null);
        }

        const elem = this.findCommentContainer();
        if (elem == null) {
            // retry
            window.setTimeout(() => this.withCommentContainer(callback, timeout - delay, delay), delay);
        } else {
            callback(elem);
        }
    }

    /**
     * Finds the comment header.
     * @return comment header element or null if it has not yet rendered
     */
    static findCommentHeader(): HTMLElement | null {
        return document.querySelector(Config.dom.selector.ytCommentTitle);
    }

    /**
     * Finds the filter button container.
     * @return filter button container or null if it has not yet rendered
     */
    static findYayFilterContainer(): HTMLElement | null {
        return document.getElementById(Config.dom.id.yayFilterContainer);
    }

    /**
     * Gets the filter button container.
     * @return filter button container
     */
    static getYayFilterContainer(): HTMLElement {
        return this.getElementById(Config.dom.id.yayFilterContainer);
    }

    /**
     * Finds the filter button status.
     * @return filter button status
     */
    static findYayFilterStatus(): HTMLElement | null {
        return document.getElementById(Config.dom.id.yayFilterStatus);
    }

    /**
     * Finds the filter button info.
     * @return filter button info
     */
    static findYayFilterInfo(): HTMLElement | null {
        return document.getElementById(Config.dom.id.yayFilterInfo);
    }

    /**
     * Gets the thread container.
     * @param body document body element
     * @return thread container element
     */
    static getCommentThreadContainer(body: HTMLElement = document.body): HTMLElement {
        return this.getElementByQuery(Config.dom.selector.ytCommentContents, body);
    }

    /**
     * Finds all comment threads.
     * @return list of thread containers
     */
    static findCommentThreads(threadContainer: HTMLElement): NodeListOf<HTMLElement> {
        return threadContainer.querySelectorAll(Config.dom.selector.ytCommentThread);
    }

    /**
     * Finds all loaded reply elements.
     * @param thread thread
     * @return list of reply elements
     */
    static findReplyElements(thread: HTMLElement): NodeListOf<HTMLElement> {
        return thread.querySelectorAll(Config.dom.selector.ytCommentReplyElement);
    }

    /**
     * Gets the main comment container.
     * @param thread thread
     * @return comment container element
     */
    static getMainCommentContainer(thread: HTMLElement): HTMLElement {
        return this.getElementByQuery(Config.dom.selector.ytCommentMain, thread);
    }

    /**
     * Finds the reply container of the given thread.
     * @param thread thread
     * @return reply container or null if not found
     */
    static findReplyContainer(thread: HTMLElement): HTMLElement | null {
        return thread.querySelector(Config.dom.selector.ytCommentReplyContainer);
    }

    /**
     * Fetches the text content of the comment element.
     * @param thread thread container
     * @return text
     */
    static fetchTextContent(thread: HTMLElement): string {
        const text = thread.querySelector(Config.dom.selector.ytCommentText);
        return this.cleanText(text?.textContent);
    }

    /**
     * Cleans whitespace in the text.
     * @param text input text
     */
    static cleanText(text: string | null | undefined): string {
        if (text === undefined || text == null) return '';
        return text.replace(/\s+/g, ' ');
    }

    //--------------------------------------------------------------------------
    //    Specific HTML Element Generators
    //--------------------------------------------------------------------------

    /**
     * Creates an HTML string for the filter button.
     * @param onClick callback function on click
     * @return tuple of the container, status, and info elements
     */
    static createYayFilterContainer(onClick: (ev: Event) => void): [HTMLSpanElement, HTMLSpanElement, HTMLSpanElement] {
        const span = document.createElement('span');
        span.id = Config.dom.id.yayFilterContainer;

        const tooltip = this.createElementWithText('div', chrome.i18n.getMessage('filter_comments'));
        tooltip.id = 'tooltip';
        tooltip.classList.add('style-scope', 'tp-yt-paper-tooltip', 'yay-tooltip');
        tooltip.setAttribute('role', 'tooltip');
        span.appendChild(tooltip);

        const div = document.createElement('div');

        const parser = new DOMParser();
        const svg = parser.parseFromString(Config.dom.svg.filterIcon, 'image/svg+xml');
        div.appendChild(svg.documentElement);
        const filterLabel = this.createElementWithText('span', chrome.i18n.getMessage('filter'));
        filterLabel.id = Config.dom.id.yayFilterLabel;
        div.appendChild(filterLabel);
        const filterStatus = document.createElement('span') as HTMLSpanElement;
        filterStatus.id = Config.dom.id.yayFilterStatus;
        div.appendChild(filterStatus);
        const filterInfo = document.createElement('span') as HTMLSpanElement;
        filterInfo.id = Config.dom.id.yayFilterInfo;
        div.appendChild(filterInfo);
        span.appendChild(div);

        div.addEventListener('click', onClick, false);
        return [span, filterStatus, filterInfo];
    }

    //--------------------------------------------------------------------------
    //    General HTML Element Generators
    //--------------------------------------------------------------------------

    /**
     * Creates a checkbox.
     * @param id element ID
     * @param checked checked
     * @param text text
     * @param onChanged on changed
     * @return div element containing input and label elements
     */
    static createCheckbox(id: string, checked: boolean, text: string, onChanged: (ev: Event) => void): HTMLDivElement {
        const container = document.createElement('div') as HTMLDivElement;
        const checkbox = document.createElement('input') as HTMLInputElement;
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.checked = checked;
        checkbox.addEventListener('change', onChanged);

        const label = document.createElement('label') as HTMLLabelElement;
        label.htmlFor = checkbox.id;

        // convert newline to <BR>
        const tokens = text.split('\n');
        for (let i = 0; i < tokens.length; ++i) {
            if (i > 0) label.appendChild(document.createElement('br'));
            label.appendChild(document.createTextNode(tokens[i]));
        }

        container.appendChild(checkbox);
        container.appendChild(label);

        return container;
    }

    /**
     * Creates an element with text.
     * @param tagName tag name
     * @param text text
     * @return new element
     */
    static createElementWithText(tagName: string, text: string): HTMLElement {
        const ret = document.createElement(tagName) as HTMLElement;
        ret.appendChild(document.createTextNode(text));
        return ret;
    }

    /**
     * Creates an anchor element.
     * @param href href
     * @param text text
     * @param target target
     * @return anchor element
     */
    static createAnchor(href: string, text: string, target = '_blank'): HTMLAnchorElement {
        const anchor = document.createElement('a') as HTMLAnchorElement;
        anchor.href = href;
        anchor.target = target;
        anchor.appendChild(document.createTextNode(text));
        return anchor;
    }

    /**
     * Creates an option element.
     * @param value value
     * @param text text
     * @return option element
     */
    static createOption(value: string, text: string): HTMLOptionElement {
        const elem = this.createElementWithText('option', text) as HTMLOptionElement;
        elem.value = value;
        return elem;
    }

    /**
     * Creates an input-button element.
     * @param label label
     * @param title title
     * @param onClick on click
     * @return input element
     */
    static createButton(label: string, title: string, onClick: (ev: Event) => void): HTMLInputElement {
        const elem = document.createElement('input') as HTMLInputElement;
        elem.type = 'button';
        elem.value = label;
        elem.title = title;
        elem.addEventListener('click', onClick);
        return elem;
    }

    /**
     * Creates a submit button.
     * @param label label
     * @param title title
     * @return input element
     */
    static createSubmit(label: string, title: string): HTMLInputElement {
        const elem = document.createElement('input') as HTMLInputElement;
        elem.type = 'submit';
        elem.value = label;
        elem.title = title;
        return elem;
    }

    /**
     * Creates a form element.
     * @param onSubmit on submit
     * @return form element
     */
    static createForm(onSubmit: () => void): HTMLFormElement {
        const elem = document.createElement('form') as HTMLFormElement;
        elem.addEventListener('submit', (ev: Event) => {
            ev.preventDefault();
            onSubmit();
            return false;
        });
        return elem;
    }

    /**
     * Creates a div element.
     * @param innerElems list of child elements
     * @param className class name of the div
     */
    static createDiv(innerElems: HTMLElement[], className = ''): HTMLDivElement {
        const elem = document.createElement('div') as HTMLDivElement;
        if (className) elem.className = className;
        innerElems.forEach((e) => elem.appendChild(e));
        return elem;
    }

    //--------------------------------------------------------------------------
    //    Utilities
    //--------------------------------------------------------------------------

    /**
     * Updates the text node in the given element.
     * @param elem HTML element
     * @param text new text
     */
    static replaceText(elem: HTMLElement, text: string): void {
        if (elem.childNodes.length == 0) {
            elem.appendChild(document.createTextNode(text));
        } else {
            elem.childNodes[0].nodeValue = text;
        }
    }

    /**
     * Clears all child elements.
     * @param element parent element
     */
    static clearChildElements(element: HTMLElement): void {
        while (element.lastChild) element.removeChild(element.lastChild);
    }
}
