chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // detect languages
    browser.i18n.detectLanguage(request).then(sendResponse);

    // must return true for asynchronious processes
    return true;
});
