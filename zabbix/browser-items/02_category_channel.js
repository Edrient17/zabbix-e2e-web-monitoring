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
    }
}

try {
    var params = JSON.parse(value);
    var categoryName = params.testPrefix + "-category-" + (new Date()).getTime();

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


    findRequired("xpath", "//li[@id='menu_media_icon']", "media menu").click();

    findRequired("xpath", "//*[@id='addCategoryBtn']", "add category button").click();

    var categoryInput = findRequired("xpath", "//input[@id='newCategoryName']", "new category name input");
    categoryInput.clear();
    categoryInput.sendKeys(categoryName);

    findRequired("xpath", "//button[@onclick='createNewCategory()']", "create category button").click();
    acceptAlertIfPresent();

    findRequired("xpath", "//*[contains(., '" + categoryName + "')]", "created category name");
    browser.collectPerfEntries("create category");

    findRequired("xpath", "//li[@id='menu_config_icon']", "config menu").click();

    findRequired("xpath", "//button[@id='categoryTab-tab']", "category tab").click();

    var categorySelector = "//a[starts-with(@id, 'category_') and (@title='" + categoryName + "' or normalize-space(.)='" + categoryName + "')]";
    findRequired("xpath", categorySelector, "created category in config").click();

    findRequired("xpath", "//button[@id='deleteCategoryBtn']", "delete category button").click();
    acceptAlertIfPresent();
    Zabbix.sleep(1000);
    acceptAlertIfPresent();

    browser.setElementWaitTimeout(1000);
    var deletedCategory = browser.findElement("xpath", categorySelector);
    browser.setElementWaitTimeout(10000);

    if (deletedCategory !== null) {
        throw Error("category still exists after delete: " + categoryName);
    }

    browser.collectPerfEntries("delete category");

    findRequired("xpath", "//button[@id='vodChannelTab-tab']", "vod channel tab").click();

    var channelUrl = findRequired("xpath", "//input[@id='channelUrl']", "channel url checkbox");
    var checked = channelUrl.getProperty("checked");

    if (checked !== true && checked !== "true") {
        channelUrl.click();
    }

    findRequired("xpath", "//button[@id='vodChannelConfigSaveBtn']", "vod channel config save button").click();
    acceptAlertIfPresent();

    channelUrl = findRequired("xpath", "//input[@id='channelUrl']", "channel url checkbox after save");
    checked = channelUrl.getProperty("checked");

    if (checked !== true && checked !== "true") {
        throw Error("channel URL checkbox is not enabled after save");
    }

    browser.collectPerfEntries("save channel config");

    result = browser.getResult();
    result.categoryName = categoryName;
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
