// Kept out of theme.tsx: that file is 'use client', and a constant imported
// from it into a server component (app/layout.tsx) arrives as a client
// reference, not a string.
export const THEME_STORAGE_KEY = 'quixhub-theme';

// Runs inline in <head>, before first paint, so the stored/system theme is
// applied immediately instead of the page flashing light first.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;
