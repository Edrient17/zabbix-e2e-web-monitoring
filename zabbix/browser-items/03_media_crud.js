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

function acceptAlertIfPresent() {
    var alert = browser.getAlert();
    if (alert !== null && alert.text !== null) {
        alert.accept();
        return true;
    }

    return false;
}

function acceptAlertRequired(name) {
    for (var i = 0; i < 10; i++) {
        var alert = browser.getAlert();

        if (alert !== null && alert.text !== null) {
            alert.accept();
            browser.collectPerfEntries(name);
            return true;
        }

        Zabbix.sleep(500);
    }

    throw Error("cannot find browser alert: " + name);
}

try {
    var params = JSON.parse(value);
    var videoFileName = params.testVideoPath.split("/").pop();

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


    findRequired("xpath", "//div[contains(@class, 'fileUploadBtn')]", "media upload button").click();

    findRequired("xpath", "//input[@type='file' and @name='file']", "media file input").sendKeys(params.testVideoPath);

    findRequired("xpath", "//button[@id='trigger-upload']", "upload start button").click();
    browser.collectPerfEntries("start media upload");

    Zabbix.sleep(30000);

    findRequired("xpath", "//button[@id='closeFileUploadLayerBtn']", "close upload layer button").click();
    browser.collectPerfEntries("close upload layer");

    findRequired("xpath", "//li[@id='menu_media_icon']", "media menu").click();

    findRequired("xpath", "//li[@id='mediaSubMenu_categoryAll']", "media all submenu").click();

    var mediaName = findRequired(
        "xpath",
        "//div[starts-with(@id, 'mediaName_') and contains(., '" + videoFileName + "')]",
        "uploaded media name"
    );

    var mediaNameId = mediaName.getAttribute("id");
    var mediaId = mediaNameId.replace("mediaName_", "");

    findRequired("xpath", "//input[@id='mediaCheck_" + mediaId + "']", "uploaded media checkbox").click();

    var actionSelector = findRequired("xpath", "//select[@id='mediaActionSelector']", "media action selector");
    actionSelector.click();
    actionSelector.sendKeys("\uE015");
    actionSelector.sendKeys("\uE015");
    actionSelector.sendKeys("\uE015");
    actionSelector.sendKeys("\uE007");

    acceptAlertRequired("confirm delete media");

    Zabbix.sleep(3000);

    browser.setElementWaitTimeout(1000);
    var deletedMedia = browser.findElement(
        "xpath",
        "//div[starts-with(@id, 'mediaName_') and contains(., '" + videoFileName + "')]"
    );
    browser.setElementWaitTimeout(10000);

    if (deletedMedia !== null) {
        throw Error("media delete failed: uploaded media still exists: " + videoFileName);
    }

    browser.collectPerfEntries("delete media");

    result = browser.getResult();
    result.videoFileName = videoFileName;
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
