import {readThemePreference,resolveTheme,applyTheme} from './theme.js';
// Run before stylesheets and the main app, avoiding a light first paint for a
// saved dark preference. A fresh visit follows the device's colour preference.
let storage;try{storage=window.localStorage;}catch{}
applyTheme(document,resolveTheme(readThemePreference(storage),window.matchMedia?.('(prefers-color-scheme: dark)').matches||false));
