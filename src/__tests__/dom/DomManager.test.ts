import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import DomManager from '../../dom/DomManager';

describe('DomManager#fetchTextContent', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../resources/threads.html'), 'utf8');
    const dom = new JSDOM(html);

    beforeAll(async () => {
        //
    });
    test('some threads and replies', async () => {
        const tc = DomManager.getCommentThreadContainer(dom.window.document.body);
        const threads = DomManager.findCommentThreads(tc);

        expect(threads.length).toBe(3);

        const getMain = (t: HTMLElement) => DomManager.fetchTextContent(DomManager.getMainCommentContainer(t));
        const getReplies = (t: HTMLElement) =>
            [...DomManager.findReplyElements(t)].map((elem) => DomManager.fetchTextContent(elem as HTMLElement));

        // 1
        expect(getMain(threads[0])).toEqual('スレッド1');
        expect(getReplies(threads[0])).toStrictEqual([
            '短い返信。',
            'ネストした返信',
            '長めの返信 あ い う え お',
            '2番目の返信に対する返信',
            '@author1234 返信',
        ]);

        // 2
        expect(getMain(threads[1])).toEqual('スレッド3 ...');
        expect(getReplies(threads[1])).toStrictEqual([]);

        // 3
        expect(getMain(threads[2])).toEqual('スレッド2 長文 長文 長文 長文 長文 長文 長文 長文 おわり');
        expect(getReplies(threads[2])).toStrictEqual(['1件の 返信']);
    });
});
