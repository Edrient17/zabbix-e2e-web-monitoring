# Playwright와 Zabbix Browser Item 비교

## 1. 개요

웹서비스의 E2E 테스트는 실제 사용자의 흐름을 자동으로 실행하여 로그인, 화면 이동, 데이터 생성, 삭제, 재생 같은 기능이 정상 동작하는지 확인하는 방식이다.

이 프로젝트에서는 기존 E2E 도구로 많이 사용하는 Playwright 대신 Zabbix의 Browser Item을 사용하여 Midibus 웹사이트의 주요 사용자 기능을 모니터링했다.

두 도구는 모두 브라우저 자동화를 수행하고, 둘 다 CI/CD나 스케줄러를 통해 자동 실행할 수 있다. 차이는 자동 실행 가능 여부가 아니라 실행 결과가 어디에 저장되고, 어떤 운영 흐름과 연결되는지에 있다. Playwright는 테스트 자동화와 상세 디버깅에 강하고, Zabbix Browser Item은 Zabbix 모니터링 체계 안에서 사용자 관점 점검 결과를 item, Trigger, Problem, Dashboard, Email Action으로 연결하는 데 강하다.

## 2. Playwright란

Playwright는 Microsoft에서 제공하는 브라우저 자동화 및 E2E 테스트 프레임워크이다. Chromium, Firefox, WebKit을 지원하며, 테스트 코드, assertion, fixture, trace, screenshot, video recording, parallel execution, CI 연동 기능이 강력하다.

일반적인 Playwright 테스트는 다음과 같은 형태를 가진다.

```javascript
import { test, expect } from '@playwright/test';

test('login works', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('#username', process.env.USERNAME);
  await page.fill('#password', process.env.PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.locator('#dashboard')).toBeVisible();
});
```

즉, Playwright는 개발 및 배포 파이프라인에서 기능 회귀를 검증하는 데 강한 도구이다.

## 3. Zabbix Browser Item이란

Zabbix Browser Item은 Zabbix Server가 Selenium WebDriver를 통해 실제 브라우저를 실행하고, JavaScript 기반 스크립트로 웹 페이지를 조작한 뒤 결과를 item 값으로 저장하는 기능이다.

이 프로젝트에서는 Selenium Chrome 컨테이너를 Browser Item 실행 환경으로 사용했다.

```yaml
ZBX_WEBDRIVERURL: http://selenium-chrome:4444
ZBX_STARTBROWSERPOLLERS: 2
```

Browser Item 스크립트는 `browser.navigate()`, `browser.findElement()`, `click()`, `sendKeys()`, `browser.collectPerfEntries()` 등을 사용하여 사용자 흐름을 실행한다.

실행 결과는 Zabbix item 값으로 저장되고, Dependent Item과 Trigger를 통해 장애 여부를 판단한다.

## 4. 핵심 차이점

| 구분 | Playwright | Zabbix Browser Item |
|---|---|---|
| 성격 | 브라우저 테스트 자동화 도구 | Zabbix 내장 브라우저 모니터링 item |
| 실행 방식 | 테스트 코드가 브라우저를 제어하여 시나리오 실행 | Zabbix item으로 등록한 JavaScript가 Selenium WebDriver를 통해 브라우저 실행 |
| 사용자 행동 작성 방식 | 개발자가 테스트 코드에 클릭, 입력, 검증 로직을 작성 | Zabbix Browser Item 스크립트에 클릭, 입력, 검증 로직을 작성 |
| 자동 실행 | CI/CD, cron, scheduler, 테스트 서버 등으로 자동화 가능 | Zabbix item interval에 따라 주기 실행 |
| 결과 저장 | 테스트 리포트, 로그, trace, screenshot, video, CI artifact | Zabbix item history, latest data, problem event |
| 실패 분석 | 에러 로그, 스택 트레이스, Trace Viewer, screenshot, video로 상세 분석 | Browser Item 결과 JSON, `error.message`, Dependent Item 값으로 원인 확인 |
| 장애 연계 | Slack, PagerDuty, Zabbix 등과 별도 연동 필요 | Trigger, Problem, Dashboard, Email Action과 직접 연결 |
| 적합한 용도 | 배포 전 회귀 테스트, 상세 디버깅, 복잡한 테스트 자동화 | 운영 중 핵심 사용자 흐름 감시, Zabbix 통합 관제 |

## 5. Playwright의 장점

Playwright의 장점은 다음과 같다.

- 테스트 코드 작성 경험이 좋고 문서와 생태계가 풍부하다.
- locator, assertion, fixture, mock, trace, screenshot, video 등 테스트 기능이 강력하다.
- 여러 브라우저와 viewport를 쉽게 검증할 수 있다.
- CI/CD와 잘 맞아 배포 전 회귀 테스트에 적합하다.
- 실패 시 trace viewer로 어느 단계에서 실패했는지 상세하게 분석할 수 있다.
- 테스트 데이터를 준비하거나 API와 조합하는 시나리오 작성이 쉽다.

예를 들어 신규 기능 배포 전 로그인, 권한, 미디어 업로드, 결제, 관리자 기능 등이 깨지지 않았는지 검증하는 목적이라면 Playwright가 더 적합하다.

## 6. Zabbix Browser Item의 장점

Zabbix Browser Item의 장점은 다음과 같다.

- Zabbix item으로 실행되므로 수집 주기, 최신 데이터, 이력 관리가 자연스럽다.
- Trigger와 Action을 통해 장애 발생 및 복구 알림을 바로 구성할 수 있다.
- Web Scenario, Agent item, Browser Item을 하나의 Zabbix Dashboard에서 함께 볼 수 있다.
- 운영자가 이미 사용하는 Zabbix Problem 화면과 Action log에 통합된다.
- 사용자 관점의 기능 실패를 서버 지표, HTTP 응답 코드, 응답시간과 함께 분석할 수 있다.
- 별도의 CI 시스템 없이 Zabbix 내부 스케줄로 주기 실행할 수 있다.

이 프로젝트에서는 Browser Item 결과 JSON을 원본 item으로 저장하고, Dependent Item의 preprocessing을 통해 `execution.status`, `execution.message`, `validation.status`를 분리했다. 이를 통해 실행 실패와 기능 검증 실패를 별도 Trigger로 판단했다.

## 7. 기존 Playwright 운영 환경에서 Browser Item을 도입할 만한 경우

기존에 Playwright 기반 E2E 테스트가 안정적으로 운영되고 있고, 알림과 Dashboard 연동까지 잘 되어 있다면 Browser Item 도입이 반드시 필요한 것은 아니다. Browser Item은 Playwright를 대체하기보다 Zabbix 관제 체계 안으로 핵심 사용자 흐름 점검 결과를 끌어오고 싶을 때 가치가 있다.

도입을 검토할 만한 상황은 다음과 같다.

- Zabbix가 이미 장애 관제의 중심이고, E2E 실패를 Zabbix Problem으로 관리하고 싶을 때
- Web Scenario, 서버 metric, 사용자 기능 점검 결과를 하나의 Dashboard에서 보고 싶을 때
- 운영팀이 CI/CD 리포트보다 Zabbix Trigger, Problem, Action log 기준으로 대응할 때
- Playwright 결과를 Zabbix로 연동하는 별도 파이프라인을 만들기 부담스러울 때
- 로그인, 업로드, 재생, 사용자 관리처럼 운영 중 반드시 살아 있어야 하는 핵심 흐름만 선별해 감시하고 싶을 때

반대로 Playwright 결과가 이미 Slack, PagerDuty, Grafana, CI 리포트 등과 잘 연결되어 있고, 실패 분석에 trace, video, screenshot, network log가 중요하다면 Playwright 중심 운영을 유지하는 편이 더 낫다.