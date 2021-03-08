/* eslint-disable @typescript-eslint/no-explicit-any */
import { LanguageDetectorResult } from '../../lang/LanguageDetector';
import Settings from '../../model/Settings';
import { chrome } from 'jest-chrome';

describe('Settings#constructor', () => {
    test('default arguments', () => {
        Object.assign(Navigator, { languages: () => ['en-US', 'en'] });

        let s = new Settings(undefined, undefined, undefined, undefined, undefined, undefined);
        let e =
            '{"ed":true,"ef":true,"el":true,"bl":false,"il":["en"],"iu":false,"ll":["en"],"pt":20,"ew":true,"bw":[],"re":false,"fr":false}';
        expect(s.toJSON()).toBe(e);

        s = new Settings(
            undefined,
            undefined,
            undefined,
            undefined,
            ['ja', 'en', 'de'],
            undefined,
            undefined,
            undefined,
            undefined,
        );
        e =
            '{"ed":true,"ef":true,"el":true,"bl":false,"il":["ja","en","de"],"iu":false,"ll":["ja","en","de"],"pt":20,"ew":true,"bw":[],"re":false,"fr":false}';

        expect(s.toJSON()).toBe(e);

        s = new Settings(
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            ['ja', 'de'],
            undefined,
            undefined,
        );
        e =
            '{"ed":true,"ef":true,"el":true,"bl":false,"il":["en"],"iu":false,"ll":["en","ja","de"],"pt":20,"ew":true,"bw":[],"re":false,"fr":false}';
        expect(s.toJSON()).toBe(e);

        s = new Settings(
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            ['ja', 'de', 'en'],
            undefined,
            undefined,
        );
        e =
            '{"ed":true,"ef":true,"el":true,"bl":false,"il":["en"],"iu":false,"ll":["ja","de","en"],"pt":20,"ew":true,"bw":[],"re":false,"fr":false}';
        expect(s.toJSON()).toBe(e);

        s = new Settings(
            undefined,
            undefined,
            undefined,
            undefined,
            ['en', 'en', 'ja', 'es'],
            undefined,
            ['ja', 'de', 'en', 'de', 'ja'],
            undefined,
            undefined,
        );
        e =
            '{"ed":true,"ef":true,"el":true,"bl":false,"il":["es","ja","en"],"iu":false,"ll":["es","ja","de","en"],"pt":20,"ew":true,"bw":[],"re":false,"fr":false}';

        expect(s.toJSON()).toBe(e);
    });
});

describe('Settings#copy', () => {
    test('normal cases', () => {
        const s = new Settings(
            false,
            true,
            true,
            false,
            ['ja', 'de', 'en'],
            undefined,
            ['en', 'de', 'ja', 'es'],
            15,
            true,
            ['XYZ', 'abc'],
        );
        const t = s.copy();
        t.setEnabledDefault(true).removeListedLanguage('en').addListedLanguage('fr', true).setPercentageThreshold(18);
        let e =
            '{"ed":false,"ef":true,"el":true,"bl":false,"il":["en","de","ja"],"iu":false,"ll":["en","de","ja","es"],"pt":15,"ew":true,"bw":["XYZ","abc"],"re":false,"fr":false}';

        expect(s.toJSON()).toBe(e);
        e =
            '{"ed":true,"ef":true,"el":true,"bl":false,"il":["de","ja","fr"],"iu":false,"ll":["de","ja","es","fr"],"pt":18,"ew":true,"bw":["XYZ","abc"],"re":false,"fr":false}';
        expect(t.toJSON()).toBe(e);
    });
});

describe('Settings#setEnabledDefault', () => {
    test('normal cases', () => {
        const s = new Settings();
        expect(s.isEnabledDefault()).toBeTruthy();
        s.setEnabledDefault(false);
        expect(s.isEnabledDefault()).toBeFalsy();
        s.setEnabledDefault(true);
        expect(s.isEnabledDefault()).toBeTruthy();
    });
});

describe('Settings#setIncludeLanguage', () => {
    test('error cases', () => {
        const s = new Settings();
        expect(() => s.setSelectedLanguage('ja', true)).toThrowError();
    });
    test('normal cases', () => {
        const s = new Settings();
        expect(s.getSelectedLanguages()).toEqual(new Set(['en']));
        expect(s.addListedLanguage('ja', true)).toEqual(s);

        expect(s.getSelectedLanguages()).toEqual(new Set(['en', 'ja']));
        expect(s.setSelectedLanguage('ja', false)).toEqual(s);
        expect(s.getSelectedLanguages()).toEqual(new Set(['en']));
        expect(s.setSelectedLanguage('ja', true)).toEqual(s);
        expect(s.getSelectedLanguages()).toEqual(new Set(['en', 'ja']));
    });
});

describe('Settings#addListedLanguage', () => {
    test('normal cases', () => {
        const s = new Settings();
        expect(s.addListedLanguage('en', true)).toEqual(s);
        expect(s.getListedLanguages()).toEqual(['en']);
        expect(s.getSelectedLanguages()).toEqual(new Set(['en']));
        expect(s.addListedLanguage('en', false)).toEqual(s); // no effect
        expect(s.getListedLanguages()).toEqual(['en']);
        expect(s.getSelectedLanguages()).toEqual(new Set(['en']));

        expect(s.addListedLanguage('de', false)).toEqual(s);
        expect(s.getListedLanguages()).toEqual(['en', 'de']);
        expect(s.getSelectedLanguages()).toEqual(new Set(['en']));

        expect(s.removeListedLanguage('en')).toEqual(s);
        expect(s.getListedLanguages()).toEqual(['de']);
        expect(s.getSelectedLanguages()).toEqual(new Set([]));

        expect(s.removeListedLanguage('de')).toEqual(s);
        expect(s.getListedLanguages()).toEqual([]);
        expect(s.getSelectedLanguages()).toEqual(new Set([]));
    });
});

describe('Settings#setIncludeUnknown', () => {
    test('normal cases', () => {
        const s = new Settings();
        expect(s.getSelectUnknown()).toBeFalsy();
        expect(s.setSelectUnknown(true)).toEqual(s);
        expect(s.getSelectUnknown()).toBeTruthy();
        expect(s.setSelectUnknown(false)).toEqual(s);
        expect(s.getSelectUnknown()).toBeFalsy();
    });
});

describe('Settings#setPercentageThreshold', () => {
    test('boundary values', () => {
        const s = new Settings();
        expect(s.setPercentageThreshold(0)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(0);

        expect(s.setPercentageThreshold(100)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(100);
    });
    test('exceeded values', () => {
        const s = new Settings();
        expect(s.setPercentageThreshold(-1)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(0);

        expect(s.setPercentageThreshold(101)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(100);
    });
    test('normal cases', () => {
        const s = new Settings();

        expect(s.setPercentageThreshold(1)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(1);

        expect(s.setPercentageThreshold(20)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(20);

        expect(s.setPercentageThreshold(50)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(50);

        expect(s.setPercentageThreshold(99)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(99);
    });
    test('fractional values', () => {
        const s = new Settings();
        expect(s.setPercentageThreshold(0.5)).toEqual(s);
        expect(s.getPercentageThreshold()).toEqual(0.5);
    });
});

describe('Settings#shouldFilterByLanguage', () => {
    test('unknown language', () => {
        const s1 = new Settings(true, true, true, false, ['en'], true, ['en'], 50);
        const s2 = new Settings(true, true, true, false, ['en'], false, ['en'], 50);
        const s3 = new Settings(true, true, true, false, [], false, ['en'], 50);

        const r1: LanguageDetectorResult = { isReliable: false, languages: [] };
        const r2: LanguageDetectorResult = {
            isReliable: false,
            languages: [{ language: 'und', percentage: 100 }],
        };
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
                { language: 'en-US', percentage: 50 },
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

        expect(s3.shouldFilterByLanguage(r1)).toBeTruthy();
    });
});

describe('Settings#shouldFilterByWord', () => {
    test('empty filter', () => {
        const s = new Settings(false, true, true, false, ['en', 'ja'], false, ['en', 'ja'], 20, true, []);
        expect(s.shouldFilterByWord('abc')).toBeFalsy();
    });
    test('normal cases', () => {
        const s = new Settings(false, true, true, false, ['en', 'ja'], false, ['en', 'ja'], 20, true, ['abc', 'XY']);
        expect(s.shouldFilterByWord('abc')).toBeTruthy();
        expect(s.shouldFilterByWord('ABC')).toBeTruthy();
        expect(s.shouldFilterByWord('aBcD')).toBeTruthy();
        expect(s.shouldFilterByWord('dAbC')).toBeTruthy();
        expect(s.shouldFilterByWord('dabcxy')).toBeTruthy();
        expect(s.shouldFilterByWord('dxy')).toBeTruthy();
        expect(s.shouldFilterByWord('dxYe')).toBeTruthy();
        expect(s.shouldFilterByWord('dXYe')).toBeTruthy();
        expect(s.shouldFilterByWord('a bcx y')).toBeFalsy();
        expect(s.shouldFilterByWord('')).toBeFalsy();
    });
});

describe('Settings#shouldRefreshFilter', () => {
    test('normal cases', () => {
        const s1 = new Settings(false, true, true, false, ['en'], false, ['en', 'de', 'ja'], 20, true, []);
        const s2 = new Settings(true, true, true, false, ['en'], false, ['en', 'de', 'ja'], 20, true, []);
        const s3 = new Settings(true, true, true, false, ['en'], false, ['en', 'ja', 'ko'], 20, true, []);
        const s4 = new Settings(false, true, true, false, ['en'], true, ['en', 'de', 'ja'], 20, true, []);
        const s5 = new Settings(false, true, true, false, ['en', 'de'], true, ['en', 'de', 'ja'], 20, true, []);
        const s6 = new Settings(false, true, true, false, ['de', 'en'], true, ['de', 'en', 'ja'], 20, true, []);
        const s7 = new Settings(false, true, true, false, ['en'], false, ['en', 'de', 'ja'], 21, true, []);
        const s8 = new Settings(false, true, true, false, ['en'], false, ['en', 'de', 'ja'], 20, true, [], false, true);
        expect(s1.shouldRefreshFilter(s2)).toBeFalsy();
        expect(s2.shouldRefreshFilter(s3)).toBeFalsy();
        expect(s1.shouldRefreshFilter(s4)).toBeTruthy();
        expect(s1.shouldRefreshFilter(s5)).toBeTruthy();
        expect(s5.shouldRefreshFilter(s6)).toBeFalsy();
        expect(s1.shouldRefreshFilter(s7)).toBeTruthy();
        expect(s1.shouldRefreshFilter(s8)).toBeTruthy();
        expect(s8.shouldRefreshFilter(s1)).toBeTruthy();
    });
});

describe('Settings#loadFromStorage', () => {
    test('normal cases', async () => {
        // mock functions
        let storage: { [key: string]: any } | undefined = undefined;
        chrome.storage.sync.set.mockImplementation((items: { [key: string]: any }, callback?: () => void) => {
            storage = items;
            if (callback) callback();
        });
        chrome.storage.sync.get.mockImplementation(
            (
                keys: string | { [key: string]: any } | string[] | null,
                callback: (items: { [key: string]: any }) => void,
            ) => {
                if (typeof keys == 'string') {
                    callback(storage === undefined ? {} : storage);
                }
            },
        );

        let s = new Settings();
        await expect(Settings.loadFromStorage()).resolves.toStrictEqual(s);
        await expect(s.saveToStorage()).resolves.toBeFalsy();

        s = s.setEnabledDefault(false).addListedLanguage('ja', true).setSelectUnknown(true);
        await expect(s.saveToStorage()).resolves.toBeFalsy();
        await expect(Settings.loadFromStorage()).resolves.toStrictEqual(s);
    });
});
