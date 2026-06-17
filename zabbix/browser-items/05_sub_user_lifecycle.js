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
    var suffix = (new Date()).getTime();

    var subUserName = params.testPrefix + "-subuser-" + suffix;
    var subUserEmail = params.testPrefix + "-subuser-" + suffix + "@example.com";
    var subUserPassword = "ZbxBi1234!";
    var subUserPhone = "010" + String(suffix).slice(-8);

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

    var baseUrl = params.webURL.replace(/\/login\/?$/, "");

    browser.navigate(baseUrl + "/subUsers");
    browser.collectPerfEntries("open sub users page");

    findRequired("xpath", "//button[@id='editPlaylistBtn']", "add sub user button").click();

    var roleSelector = findRequired("xpath", "//select[@id='userRoleSelector']", "user role selector");
    roleSelector.click();
    roleSelector.sendKeys("\uE015");
    roleSelector.sendKeys("\uE007");

    findRequired("xpath", "//input[@id='subUserEmail']", "sub user email input").sendKeys(subUserEmail);
    findRequired("xpath", "//input[@id='subUserPassword']", "sub user password input").sendKeys(subUserPassword);
    findRequired("xpath", "//input[@id='subUserPasswordCheck']", "sub user password check input").sendKeys(subUserPassword);
    findRequired("xpath", "//input[@id='subUserName']", "sub user name input").sendKeys(subUserName);
    findRequired("xpath", "//input[@id='subUserPhone']", "sub user phone input").sendKeys(subUserPhone);

    findRequired("xpath", "//button[@id='saveSubUserInfoBtn']", "save new sub user button").click();
    acceptAlertIfPresent();

    Zabbix.sleep(2000);

    browser.collectPerfEntries("create sub user");

    findRequired(
        "xpath",
        "//tr[.//td[contains(@aria-describedby, 'subUserList_userName') and (contains(@title, '" + subUserName + "') or contains(., '" + subUserName + "'))]]",
        "created sub user row"
    ).click();

    var editRoleSelector = findRequired("xpath", "//select[@id='userRoleSelector']", "edit user role selector");
    editRoleSelector.click();
    editRoleSelector.sendKeys("\uE015");
    editRoleSelector.sendKeys("\uE007");

    findRequired("xpath", "//button[@id='saveSubUserInfoBtn']", "save changed sub user button").click();
    acceptAlertIfPresent();

    Zabbix.sleep(2000);

    browser.collectPerfEntries("change sub user role");

    findRequired(
        "xpath",
        "//tr[.//td[contains(@aria-describedby, 'subUserList_userName') and (contains(@title, '" + subUserName + "') or contains(., '" + subUserName + "'))]]//img[contains(@src, 'delete_btn_small.png') and contains(@onclick, 'deleteSubUser')]",
        "delete sub user button"
    ).click();

    acceptAlertRequired("confirm delete sub user");

    Zabbix.sleep(3000);

    browser.setElementWaitTimeout(1000);
    var deletedSubUser = browser.findElement(
        "xpath",
        "//td[contains(@aria-describedby, 'subUserList_userName') and (contains(@title, '" + subUserName + "') or contains(., '" + subUserName + "'))]"
    );
    browser.setElementWaitTimeout(10000);

    if (deletedSubUser !== null) {
        throw Error("sub user delete failed: user still exists: " + subUserName);
    }

    browser.collectPerfEntries("delete sub user");

    result = browser.getResult();
    result.subUserName = subUserName;
    result.subUserEmail = subUserEmail;
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
