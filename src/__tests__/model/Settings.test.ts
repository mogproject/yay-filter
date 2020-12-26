import { LanguageDetectorResult } from '../../lang/LanguageDetector';
import Settings from '../../model/Settings';

describe('Settings#constructor', () => {
    test('default arguments', () => {
        Object.assign(Navigator, { languages: () => ['en-US', 'en'] });

        let s = new Settings(undefined, undefined, undefined, undefined, undefined, undefined);
        expect(s.toJSON()).toBe('{"ed":true,"il":["en"],"iu":false,"ll":["en"],"pt":20,"ew":[]}');

        s = new Settings(undefined, ['ja', 'en', 'de'], undefined, undefined, undefined, undefined);
        expect(s.toJSON()).toBe('{"ed":true,"il":["ja","en","de"],"iu":false,"ll":["ja","en","de"],"pt":20,"ew":[]}');

        s = new Settings(undefined, undefined, undefined, ['ja', 'de'], undefined, undefined);
        expect(s.toJSON()).toBe('{"ed":true,"il":["en"],"iu":false,"ll":["en","ja","de"],"pt":20,"ew":[]}');

        s = new Settings(undefined, undefined, undefined, ['ja', 'de', 'en'], undefined, undefined);
        expect(s.toJSON()).toBe('{"ed":true,"il":["en"],"iu":false,"ll":["ja","de","en"],"pt":20,"ew":[]}');

        s = new Settings(
            undefined,
            ['en', 'en', 'ja', 'es'],
            undefined,
            ['ja', 'de', 'en', 'de', 'ja'],
            undefined,
            undefined,
        );
        expect(s.toJSON()).toBe(
            '{"ed":true,"il":["es","ja","en"],"iu":false,"ll":["es","ja","de","en"],"pt":20,"ew":[]}',
        );
    });
});

describe('Settings#copy', () => {
    test('normal cases', () => {
        const s = new Settings(false, ['ja', 'de', 'en'], undefined, ['en', 'de', 'ja', 'es'], 15, ['XYZ', 'abc']);
        const t = s.copy();
        t.setEnabledDefault(true);
        t.removeListedLanguage('en');
        t.addListedLanguage('fr', true);
        t.setPercentageThreshold(18);

        expect(s.toJSON()).toBe(
            '{"ed":false,"il":["en","de","ja"],"iu":false,"ll":["en","de","ja","es"],"pt":15,"ew":["XYZ","abc"]}',
        );
        expect(t.toJSON()).toBe(
            '{"ed":true,"il":["de","ja","fr"],"iu":false,"ll":["de","ja","es","fr"],"pt":18,"ew":["XYZ","abc"]}',
        );
    });
});

describe('Settings#shouldFilterByLanguage', () => {
    test('unknown language', () => {
        const s1 = new Settings(true, ['en'], true, ['en'], 50);
        const s2 = new Settings(true, ['en'], false, ['en'], 50);
        const r1: LanguageDetectorResult = { isReliable: false, languages: [] };
        const r2: LanguageDetectorResult = { isReliable: false, languages: [{ language: 'und', percentage: 100 }] };
        const r3: LanguageDetectorResult = {
            isReliable: false,
            languages: [
                { language: 'en', percentage: 49 },
                { language: 'de', percentage: 49 },
                { language: 'ja', percentage: 2 },
            ],
        };
        const r4: LanguageDetectorResult = {
            isReliable: false,
            languages: [
                { language: 'en', percentage: 50 },
                { language: 'de', percentage: 48 },
                { language: 'ja', percentage: 2 },
            ],
        };
        expect(s1.shouldFilterByLanguage(r1)).toBeFalsy();
        expect(s1.shouldFilterByLanguage(r2)).toBeFalsy();
        expect(s1.shouldFilterByLanguage(r3)).toBeFalsy();
        expect(s1.shouldFilterByLanguage(r4)).toBeFalsy();

        expect(s2.shouldFilterByLanguage(r1)).toBeTruthy();
        expect(s2.shouldFilterByLanguage(r2)).toBeTruthy();
        expect(s2.shouldFilterByLanguage(r3)).toBeTruthy();
        expect(s2.shouldFilterByLanguage(r4)).toBeFalsy();
    });
});
