import { Config } from '../Config';
import Settings from './Settings';
import LanguageDetector from '../lang/LanguageDetector';

/**
 * Defines application context.
 */
export default class AppContext {
    /** True if filtering is currently enabled. */
    enabled = true;

    /** Current settings. */
    settings: Settings = new Settings();

    /** Language detector. */
    languageDetector = new LanguageDetector(Config.settings.maxLanguageDetectorCacheSize);
}
