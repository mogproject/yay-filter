import App from './App';

/**
 * Entry point of the program.
 */
function main(): void {
    // create app
    const app = new App();

    // add event listeners
    window.addEventListener('load', () => app.reload('load'));
    window.addEventListener('yt-page-data-updated', () => app.reload('yt-page-data-updated'));
}

main();
