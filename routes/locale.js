// routes/locale.js
'use strict';
const express = require('express');
const router  = express.Router();

const SUPPORTED = ['fr', 'en'];

// GET /locale/fr  or  GET /locale/en
// Saves the chosen language in the session then redirects back.
// req.session.save() is called explicitly so the locale is guaranteed
// to be persisted before the redirect fires — otherwise the async write
// can race the incoming request and the page re-renders with the old locale.
router.get('/:lang', (req, res) => {
    const { lang } = req.params;
    if (SUPPORTED.includes(lang)) {
        req.session.locale = lang;
    }

    // Force the session to be written before redirecting
    req.session.save((err) => {
        if (err) console.error('Session save error (locale):', err);

        // No-store so the browser never serves the destination from cache
        res.setHeader('Cache-Control', 'no-store');

        const redirectTo = req.headers.referer || '/';
        res.redirect(redirectTo);
    });
});

module.exports = router;
