// middleware/localeMiddleware.js
'use strict';
const fr = require('../locales/fr');
const en = require('../locales/en');

const SUPPORTED     = ['fr', 'en'];
const DEFAULT_LOCALE = 'fr';
const locales        = { fr, en };

module.exports = (req, res, next) => {
    let locale = DEFAULT_LOCALE;

    // 1. Session preference (set by /locale/:lang)
    if (req.session?.locale && SUPPORTED.includes(req.session.locale)) {
        locale = req.session.locale;
    } else {
        // 2. Browser Accept-Language header
        const browserLang = (req.headers['accept-language'] || '')
            .split(',')[0].split('-')[0].toLowerCase();
        if (SUPPORTED.includes(browserLang)) locale = browserLang;
    }

    res.locals.t      = locales[locale];   // available as t.* in all EJS views
    res.locals.locale = locale;            // available as locale in all EJS views
    req.locale        = locale;
    req.t             = locales[locale];   // available in controllers via req.t

    next();
};
