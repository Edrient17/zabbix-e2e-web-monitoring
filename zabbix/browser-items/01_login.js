var browser, result;

browser = new Browser(Browser.chromeOptions());

function findRequired(strategy, selector, name) {
    var el = browser.findElement(strategy, selector);
    if (el === null) {
        throw Error("cannot find " + name + ": " + selector);
    }
    return el;
}

function clickIfExists(strategy, selector, name) {
    browser.setElementWaitTimeout(1000);

    var el = browser.findElement(strategy, selector);

    browser.setElementWaitTimeout(10000);

    if (el !== null) {
        el.click();
        browser.collectPerfEntries(name);
        return true;
    }

    return false;
}

try {
    var params = JSON.parse(value);

    browser.setScreenSize(Number(params.width), Number(params.height));
    browser.setElementWaitTimeout(10000);
    browser.setSessionTimeout(30000);

    browser.navigate(params.webURL);
    browser.collectPerfEntries("open login page");

    findRequired("xpath", "//input[@id='username']", "username input").sendKeys(params.username);
    findRequired("xpath", "//input[@type='password']", "password input").sendKeys(params.password);
    findRequired("xpath", "//button[@type='button']", "login button").click();

    browser.collectPerfEntries("submit login");

    findRequired("xpath", "//li[@id='menu_dashboard' and contains(., '대시보드')]", "dashboard menu");
    browser.collectPerfEntries("login success");

    clickIfExists("xpath", "//*[@onclick='tutorialLayerTodayClose()']", "close tutorial popup");
    clickIfExists("xpath", "//area[contains(@href, 'trialLayerTodayClose')]", "close trial popup");

    findRequired("xpath", "//li[@id='menu_dashboard' and contains(., '대시보드')]", "usable dashboard after popup close");
    browser.collectPerfEntries("dashboard usable");

    result = browser.getResult();
    result.screenshot = browser.getScreenshot();
}
catch (err) {
    if (!(err instanceof BrowserError)) {
        browser.setError(err.message);
    }

    result = browser.getResult();
    result.error.screenshot = browser.getScreenshot();
}
finally {
    return JSON.stringify(result);
}