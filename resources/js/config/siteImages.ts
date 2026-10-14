/**
 * ──────────────────────────────────────────────────────────────
 *  IMAGES FOR THE LANDING, LOGIN AND REGISTER PAGES
 * ──────────────────────────────────────────────────────────────
 *  This is the ONLY file you need to edit to change pictures.
 *
 *  1. Put your image file inside:  public/images/
 *  2. Type its file name below (name + extension, e.g. 'books.jpg').
 *
 *  If a file is missing, the page shows a green placeholder that
 *  prints the file name it is waiting for, so nothing looks broken.
 *
 *  Tips: JPG/WEBP photos under ~400 KB load fastest.
 *        Landscape photos work best, except 'hero' (portrait crop).
 * ──────────────────────────────────────────────────────────────
 */

export const logo = 'logo.png';

export const siteImages = {
    // Big arch-shaped photo on the landing page (campus photo works great)
    hero: 'acc_campus.png',

    // Small example-listing photo that floats over the hero (e.g. a calculator)
    heroListing: 'hero-listing.jpg',

    // Category tiles on the landing page
    categories: {
        electronics: 'cat-electronics.jpg',
        clothing: 'cat-clothing.jpg',
        schoolSupplies: 'cat-school-supplies.jpg',
        food: 'cat-food.jpg',
        home: 'cat-home.jpg',
        services: 'cat-services.jpg',
    },

    // Photo beside the "community / trust" section (students, a meet-up…)
    community: 'community.jpg',

    // Background photo on the left side of the login and register pages
    auth: 'acc_campus.png',

    // Wide photo behind the greeting on the dashboard
    dashboard: 'acc_campus.png',

    // Photo beside the "Sell something" form
    sell: 'sell-banner.jpg',

    // Hero strip at the top of the marketplace page
    marketplace: 'marketplace-banner.png',
};
