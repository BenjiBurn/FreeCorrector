// Interface text in the browser's language: French for a French browser,
// English otherwise (_locales/, default_locale "en"). Loaded as a classic
// script wherever settings.js is: background, content scripts, pages.

/* global fcApi */
/* exported fcT, fcUiLang, fcLocalizePage, fcPlural */

// The message for `key`, with $1… placeholders filled from `subs`.
function fcT(key, subs) {
  try {
    return fcApi.i18n.getMessage(key, subs === undefined ? undefined : [].concat(subs).map(String)) || key;
  } catch {
    return key;
  }
}

const fcUiLang = /^fr/i.test(fcT("@@ui_locale")) ? "fr" : "en";

// "1 problème", "3 problèmes": keys `${base}One` and `${base}Many`.
function fcPlural(base, n) {
  return fcT(n > 1 || (fcUiLang === "en" && n === 0) ? `${base}Many` : `${base}One`, n);
}

// Fills the page from data-i18n attributes: data-i18n (text),
// data-i18n-placeholder, data-i18n-title, data-i18n-aria-label.
function fcLocalizePage(root = document) {
  if (root === document) document.documentElement.lang = fcUiLang;
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = fcT(el.dataset.i18n);
  for (const attr of ["placeholder", "title", "aria-label"]) {
    const data = `i18n${attr.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())}`;
    for (const el of root.querySelectorAll(`[data-i18n-${attr}]`)) el.setAttribute(attr, fcT(el.dataset[data]));
  }
}
