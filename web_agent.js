const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const OpenAI = require('openai');
const readline = require('readline');
const fs = require('fs');
require('dotenv/config');

puppeteer.use(StealthPlugin());

const openai = new OpenAI();
const timeout = 5000;
  

async function image_to_base64(image_file) {
    return await new Promise((resolve, reject) => {
        fs.readFile(image_file, (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                reject();
                return;
            }

            const base64Data = data.toString('base64');
            const dataURI = `data:image/jpeg;base64,${base64Data}`;
            resolve(dataURI);
        });
    });
}

async function input( text ) {
    let the_prompt;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await (async () => {
        return new Promise( resolve => {
            rl.question( text, (prompt) => {
                the_prompt = prompt;
                rl.close();
                resolve();
            } );
        } );
    })();

    return the_prompt;
}

async function sleep( milliseconds ) {
    return await new Promise((r, _) => {
        setTimeout( () => {
            r();
        }, milliseconds );
    });
}

async function highlight_links( page ) {
    await page.evaluate(() => {
        document.querySelectorAll('[gpt-link-text]').forEach(e => {
            e.removeAttribute("gpt-link-text");
        });
    });

    const elements = await page.$$(
        "a, button, input, textarea, [role=button], [role=treeitem]"
    );

    elements.forEach( async e => {
        await page.evaluate(e => {
            function isElementVisible(el) {
                if (!el) return false; // Element does not exist

                function isStyleVisible(el) {
                    const style = window.getComputedStyle(el);
                    return style.width !== '0' &&
                           style.height !== '0' &&
                           style.opacity !== '0' &&
                           style.display !== 'none' &&
                           style.visibility !== 'hidden';
                }

                function isElementInViewport(el) {
                    const rect = el.getBoundingClientRect();
                    return (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                    );
                }

                // Check if the element is visible style-wise
                if (!isStyleVisible(el)) {
                    return false;
                }

                // Traverse up the DOM and check if any ancestor element is hidden
                let parent = el;
                while (parent) {
                    if (!isStyleVisible(parent)) {
                    return false;
                    }
                    parent = parent.parentElement;
                }

                // Finally, check if the element is within the viewport
                return isElementInViewport(el);
            }

            e.style.border = "1px solid red";

            const position = e.getBoundingClientRect();

            if( position.width > 5 && position.height > 5 && isElementVisible(e) ) {
                const link_text = e.textContent.replace(/[^a-zA-Z0-9 ]/g, '');
                e.setAttribute( "gpt-link-text", link_text );
            }
        }, e);
    } );
}

async function waitForEvent(page, event) {
    return page.evaluate(event => {
        return new Promise((r, _) => {
            document.addEventListener(event, function(e) {
                r();
            });
        });
    }, event)
}

async function scrollPage(page, scrollDirection, scrollAmount) {
    switch (scrollDirection) {
        case 'down':
            await page.evaluate((scrollAmount) => {
                window.scrollBy(0, scrollAmount);
            }, scrollAmount);
            break;
        case 'up':
            await page.evaluate((scrollAmount) => {
                window.scrollBy(0, -scrollAmount);
            }, scrollAmount);
            break;
        case 'right':
            await page.evaluate((scrollAmount) => {
                window.scrollBy(scrollAmount, 0);
            }, scrollAmount);
            break;
        case 'left':
            await page.evaluate((scrollAmount) => {
                window.scrollBy(-scrollAmount, 0);
            }, scrollAmount);
            break;
        default:
            console.log("Invalid scroll direction. Use 'up', 'down', 'left', or 'right'.");
            break;
    }
    await page.waitForTimeout(500); // Wait for half a second after scrolling
}

async function createCursor(page) {
    await page.evaluate(() => {
        const cursor = document.createElement('div');
        cursor.setAttribute('id', 'puppeteerCursor');
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        cursor.style.border = '2px solid black';
        cursor.style.borderRadius = '10px'; // Make it circular
        cursor.style.position = 'absolute';
        cursor.style.zIndex = '100000'; // Ensure it's on top
        cursor.style.transition = 'ease 0.2s'; // Smooth move animation
        document.body.appendChild(cursor);
    });
}

async function moveCursor(page, x, y) {
    await page.evaluate((x, y) => {
        const cursor = document.getElementById('puppeteerCursor');
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
    }, x, y);
}

async function login(page, usernameOrEmail, password) {
    const loginUrl = page.url(); // Get the current URL of the page
    await page.goto(loginUrl, { waitUntil: 'networkidle0' });

    // Your login script modified to use dynamic values and current URL
    await page.type('input[formcontrolname="email"], input[formcontrolname="username"]', usernameOrEmail, { delay: 100 });
    await page.type('input[formcontrolname="password"]', password, { delay: 100 });

    // Attempt to click the login button
    const loginButtonSelector = 'form button';
    await Promise.all([
        page.waitForNavigation(),
        page.click(loginButtonSelector),
    ]);

    console.log('Login successful with provided credentials');
    // Store cookies for session handling
    const cookies = await page.cookies();
    // Store cookies for future use
    fs.writeFileSync('cookies.json', JSON.stringify(cookies));
}


(async () => {
    console.log( "###########################################" );
    console.log( "# GPT4V-Browsing by Unconventional Coding #" );
    console.log( "###########################################\n" );

    const browser = await puppeteer.launch({
        headless: false, // Make sure the browser is visible
        //executablePath: '/Users/innocentkushal/Desktop/WebAgent/Scrape-anything---Web-AI-agent/chrome/mac_arm-116.0.5793.0/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
        executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });
    
    const page = await browser.newPage();
    await page.setViewport( {
        width: 1200,
        height: 1200,
        deviceScaleFactor: 1,
    } );

    try {
        const cookiesString = fs.readFileSync('cookies.json');
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);
        console.log("PAGE URL: " + page.url())
            await page.goto( url, {
                waitUntil: "domcontentloaded",
                timeout: timeout,
            } );

            await Promise.race( [
                waitForEvent(page, 'load'),
                sleep(timeout)
            ] );

            await highlight_links( page );
            await page.screenshot( {
                path: "screenshot.jpg",
                fullPage: true,
            } );

            screenshot_taken = true;
    } catch (error) {
        console.log('No stored cookies found.');
    }

    const messages = [
        {
            "role": "system",
            "content": `You are an agent controlling a browser. You will be given instructions on what to do by browsing. You are connected to a web browser and you will be given the screenshot of the website you are on. The links on the website will be highlighted in red in the screenshot. Always read what is in the screenshot. Don't guess link names.

            You open the browser yourself, go to a specific URL by answering with the following JSON format:
            {"url": "url goes here"} 
            and show what you are doing, scrolling up and down as per your need, 

            You can click links on the website by referencing the text inside of the link/button, by answering in the following JSON format:
            {"click": "Text in link"}

            Once you are on a URL and you have found the answer to the user's question, you can answer with a regular message.

            Use google search by set a sub-page like 'https://google.com/search?q=search' if applicable. Prefer to use Google for simple queries. If the user provides a direct URL, go to that one. Do not make up links,
            
            if you are instructed to login to any website, let the automation script run first. `,
        }
    ];

    console.log("GPT: How can I assist you today?")
    const prompt = await input("You: ");
    console.log();

    messages.push({
        "role": "user",
        "content": prompt,
    });

    let url;
    let screenshot_taken = false;

    while( true ) {
        /* Condition to check if login is required */
        const lastMessage = messages[messages.length - 1].content.toLowerCase();
        if (lastMessage.includes("submit")) {
            // Execute login process using the automation script
            const usernameOrEmail = await input("Username or Email: ");
            const password = await input("Password: ");
            try {
                await login(page, usernameOrEmail, password); // Assuming loginAutomation function takes 'page' as an argument
                console.log("Logged in successfully.");
                const cookiesString = fs.readFileSync('cookies.json');
                const cookies = JSON.parse(cookiesString);
                await page.setCookie(...cookies);
                console.log("PAGE URL: " + page.url())
                const newPageUrl = page.url();
                await page.goto( newPageUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: timeout,
                } );

                await Promise.race( [
                    waitForEvent(page, 'load'),
                    sleep(timeout)
                ] );

                await highlight_links( page );
                await page.screenshot( {
                    path: "screenshot.jpg",
                    fullPage: true,
                } );

                screenshot_taken = true;
                // Continue with other tasks after successful login
            } catch (error) {
                console.error('Login error:', error);
                // Handle login error, maybe ask for credentials again or abort
                continue; // Skip to next iteration of the loop
            }
        }
        if( url ) {
            console.log("Crawling " + url);
            await createCursor(page);
            await page.goto( url, {
                waitUntil: "domcontentloaded",
                timeout: timeout,
            } );

            await Promise.race( [
                waitForEvent(page, 'load'),
                sleep(timeout)
            ] );

            await scrollPage(page, 'down', 500); // Scroll down
            await page.waitForTimeout(1000); // Wait a bit to see the scroll effect
            await scrollPage(page, 'up', 500); // Scroll back up
            await page.waitForTimeout(1000); // Wait a bit to see the scroll effect

            await highlight_links( page );
            await page.screenshot( {
                path: "screenshot.jpg",
                fullPage: true,
            } );

            screenshot_taken = true;
            url = null;
        }

        if( screenshot_taken ) {
            const base64_image = await image_to_base64("screenshot.jpg");

            messages.push({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": base64_image,
                    },
                    {
                        "type": "text",
                        "text": "Here's the screenshot of the website you are on right now. You can click on links with {\"click\": \"Link text\"} or you can crawl to another URL if this one is incorrect. If you find the answer to the user's question, you can respond normally.",
                    }
                ]
            });

            screenshot_taken = false;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            max_tokens: 1024,
            messages: messages,
        });

        const message = response.choices[0].message;
        const message_text = message.content;

        messages.push({
            "role": "assistant",
            "content": message_text,
        });

        console.log( "GPT: " + message_text );

        if (message_text.indexOf('{"click": "') !== -1) {
            console.log("CLICK DETECTED")
            let parts = message_text.split('{"click": "');
            parts = parts[1].split('"}');
            const link_text = parts[0].replace(/[^a-zA-Z0-9 ]/g, '');
        
            console.log("Clicking on " + link_text)
        
            try {
                const elements = await page.$$('[gpt-link-text]');
        
                let partial;
                let exact;
        
                for (const element of elements) {
                    const attributeValue = await element.evaluate(el => el.getAttribute('gpt-link-text'));
        
                    if (attributeValue.includes(link_text)) {
                        partial = element;
                    }
        
                    if (attributeValue === link_text) {
                        exact = element;
                    }
                }
        
                if (exact || partial) {
                    const [response] = await Promise.all([
                        page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(e => console.log("Navigation timeout/error:", e.message)),
                        (exact || partial).click()
                    ]);
        
                    // Additional checks can be done here, like validating the response or URL
                    await Promise.race( [
                        waitForEvent(page, 'load'),
                        sleep(timeout)
                    ] );

                    await highlight_links(page);
        
                    await page.screenshot({
                        path: "screenshot.jpg",
                        quality: 100,
                        fullpage: true
                    });
        
                    screenshot_taken = true;
                } else {
                    throw new Error("Can't find link");
                }
            } catch (error) {
                console.log("ERROR: Clicking failed", error);
        
                messages.push({
                    "role": "user",
                    "content": "ERROR: I was unable to click that element",
                });
            }
        
            continue;
        } 
        else if (message_text.indexOf('{"url": "') !== -1) {
            console.log("URL DETECTED.")
            let parts = message_text.split('{"url": "');
            parts = parts[1].split('"}');
            url = parts[0];
        
            continue;
        }

        const prompt = await input("You: ");
        console.log();

        messages.push({
            "role": "user",
            "content": prompt,
        });
    }
})();
