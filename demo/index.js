module.exports = (API_KEY) => {
    const _compileOptions = (options) => {
        const OTHER_KEY_NAMES = {
            executablePath: ["executable", "exec", "path"],
            headless: ["headless", "head", "visible"],
            userDataDir: ["userDataDir", "userData", "user", "data", "dir"],
        }
        const DEFAULT_VALUES = {
            headless: false,
        }
        const compiledOptions = {};
        for(let key in OTHER_KEY_NAMES) {
            if(options[key]) {
                compiledOptions[key] = options[key];
            }
        }
        for(let key in options) {
            for(let otherKey in OTHER_KEY_NAMES) {
                if(OTHER_KEY_NAMES[otherKey].includes(key)) {
                    compiledOptions[otherKey] = options[key];
                }
            }
        }
        for(let key in DEFAULT_VALUES) {
            if(!compiledOptions[key]) {
                compiledOptions[key] = DEFAULT_VALUES[key];
            }
        }
        delete compiledOptions.remote;
        return compiledOptions;
    }
    const { Client } = require("../index.js");
    const Browser = Client({
        "goto": {
            args: ["string"],
        },
        "click": {
            args: ["string"],
        },
        "type": {
            args: ["string", "string"],
        },
        "waitForNavigation": {
            args: [],
        },
        "_spawn": {
            args: [],
        }
    }, "ws://34.125.173.177:3000?api_key=" + API_KEY);
    Browser.launch = async (options) => {
        const compiledOptions = _compileOptions(options);
        const browser = new Browser(compiledOptions);
        await browser._spawn();
        return browser;
    }
    return Browser;
};


(async () => {
    const Browser = module.exports("YOUR_API_KEY");

    const browser = await Browser.launch({});
    await browser.goto("google");
    await browser.type("input[name='q']", "puppeteer");
    await browser.click("input[name='btnK']");
    await browser.waitForNavigation();
    console.log("Done!");
})();


