const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the login page
    await page.goto('https://app.accally.com/auth/');

    // Fill in the login form and submit
    await page.type('input[formcontrolname="email"], input[formcontrolname="username"]', 'xyz@gmail.com', { delay: 100 });
    await page.type('input[formcontrolname="password"]', 'password', { delay: 100 });

    // Attempt to click the login button
    const loginButtonSelector = 'form button';
    await Promise.all([
        page.waitForNavigation(),
        page.click(loginButtonSelector),
    ]);

    // Wait for navigation after login
    await page.waitForNavigation();

    // Store cookies for session handling
    const cookies = await page.cookies();

    // Close the browser
    await browser.close();
})();
