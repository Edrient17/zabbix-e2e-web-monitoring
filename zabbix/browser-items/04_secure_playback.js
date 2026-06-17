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

function activateRequiredButton(strategy, selector, name) {
    var lastError;

    for (var i = 0; i < 3; i++) {
        var el = findRequired(strategy, selector, name);

        try {
            el.click();
            return;
        }
        catch (err) {
            lastError = err;
        }

        try {
            el.sendKeys("\n");
            return;
        }
        catch (sendErr) {
            lastError = sendErr;
        }

        Zabbix.sleep(1000);
    }

    throw lastError;
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


    clickIfExists("xpath", "//*[@onclick='tutorialLayerTodayClose()']", "close tutorial popup");
    clickIfExists("xpath", "//area[contains(@href, 'trialLayerTodayClose')]", "close trial popup");


    findRequired("xpath", "//li[@id='menu_channel_icon']", "channel menu").click();

    findRequired("xpath", "//li[@id='channelSubMenu_ch_19ec4e3e']", "restricted channel submenu").click();

    findRequired(
        "xpath",
        "//div[starts-with(@id, 'mediaName_') and contains(., 'tutorialSampleVideo.mp4')]",
        "restricted channel media"
    ).click();

    findRequired(
        "xpath",
        "//button[@data-bs-target='#createSecurePlayKeyLayer']",
        "create secure play key button"
    ).click();

    findRequired("xpath", "//button[@id='quickBtn_1day']", "1 day expiration button").click();

    var allowedIpInput = findRequired("xpath", "//input[@id='tokenSecurity_allowedIP']", "allowed IP input");
    allowedIpInput.clear();
    allowedIpInput.sendKeys(params.allowedIP);

    findRequired("xpath", "//button[@id='createKeyBtn']", "create key button").click();
    Zabbix.sleep(2000);

    browser.collectPerfEntries("create secure play key");

    activateRequiredButton(
        "xpath",
        "//div[contains(@class, 'modal-footer')]//button[@id='applyShareUrlBtn']",
        "apply share url button"
    );

    browser.collectPerfEntries("apply secure key to share url");

    var shareUrl = findRequired("xpath", "//div[@id='link_area']", "share url").getText();

    if (shareUrl === null || shareUrl.indexOf("https://") !== 0) {
        throw Error("invalid share url: " + shareUrl);
    }

    findRequired("xpath", "//button[@id='createSecurePlayKeyLayerCloseBtn']", "close secure key layer button").click();

    browser.navigate(shareUrl);
    browser.collectPerfEntries("open secure playback url");

    browser.setElementWaitTimeout(30000);

    findRequired(
        "xpath",
        "//div[contains(@class, 'jw-icon-display') and @role='button']",
        "play button"
    ).click();

    findRequired(
        "xpath",
        "//*[contains(@class, 'jw-state-playing')]",
        "jw player playing state"
    );

    browser.collectPerfEntries("play secure video");

    result = browser.getResult();
    result.shareUrl = shareUrl;
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
