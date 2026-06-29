# Zabbix Browser Item 프롬프트 가이드

AI에게 Zabbix Browser Item JavaScript와 관련 Zabbix 설정을 작성시키기 위한 3단계 프롬프트 템플릿이다.

```text
1단계: 공식 문서 기반 제약사항 정리
2단계: 사용자 행동 + HTML 기반 Browser Item JavaScript 작성
3단계: 반환 JSON 기반 Dependent Item / Trigger 설계
```

핵심은 AI가 일반 Playwright/Selenium 코드를 만들지 않도록 먼저 제약을 잡고, 실제 시나리오 코드는 HTML 블럭을 보고 추론하게 만드는 것이다.

---

## 1. 기본 원칙

- Zabbix Browser Item은 일반 Node.js, Playwright, Puppeteer, Selenium WebDriver 코드와 다르다.
- Browser Item에서는 Zabbix가 제공하는 `Browser`, `Element` 객체 기반으로 작성한다.
- npm package, 외부 라이브러리, `async/await` 기반 코드는 사용하지 않는다.
- 비밀번호, 토큰, 세션 값은 로그나 반환값에 남기지 않는다.
- 최종 반환값은 Dependent Item으로 분리하기 쉬운 JSON 문자열로 만든다.

권장 반환 JSON:

```json
{
  "success": 1,
  "status": "ok",
  "step": "dashboard_loaded",
  "duration_ms": 1234,
  "url": "https://example.com/dashboard",
  "error": "",
  "message": "login success"
}
```

---

## 2. 1단계 프롬프트: 제약사항 정리

이 단계에서는 코드를 작성하지 않는다. AI가 Zabbix Browser Item 환경을 먼저 이해하도록 만든다.

```text
너는 Zabbix Browser Item JavaScript 작성 전문가다.

아래 공식 문서를 확인한 뒤, Browser Item JavaScript 작성 규칙을 한국어로 정리해줘.
이번 단계에서는 코드를 작성하지 마.

참고 문서:
- Zabbix Browser item
  https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/browser
- Browser item JavaScript objects
  https://www.zabbix.com/documentation/current/en/manual/config/items/preprocessing/javascript/browser_item_javascript_objects
- Additional JavaScript objects
  https://www.zabbix.com/documentation/current/en/manual/config/items/preprocessing/javascript/javascript_objects
- Monitor websites with Browser items
  https://www.zabbix.com/documentation/current/en/manual/guides/monitor_browser
- JavaScript preprocessing
  https://www.zabbix.com/documentation/current/en/manual/config/items/preprocessing/javascript
- Dependent items
  https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/dependent_items
- JSONPath preprocessing
  https://www.zabbix.com/documentation/current/en/manual/config/items/preprocessing/jsonpath_functionality
- Trigger expression
  https://www.zabbix.com/documentation/current/en/manual/config/triggers/expression
- zabbix_js
  https://www.zabbix.com/documentation/current/en/manpages/zabbix_js

정리할 항목:
1. Browser Item JavaScript에서 사용할 수 있는 주요 객체와 메서드
2. 사용하면 안 되는 코드 스타일
3. 기본 스크립트 구조
4. 오류 처리 방식
5. return 값 설계 원칙
6. Dependent Item으로 분리하기 좋은 JSON 필드
7. 다음 단계에서 사용자가 제공해야 할 최소 정보
```

---

## 3. 2단계 프롬프트: JavaScript 작성

이 단계에서는 실제 Browser Item JavaScript를 만든다.<br>
*** 사용자는 “사용자 행동”과 “관련 HTML 블럭”을 제공하여 프롬프트 내의 Step을 구성한다. ***

````text
너는 Zabbix Browser Item JavaScript 작성 전문가다.

이전 단계에서 정리한 Zabbix Browser Item 제약사항을 반드시 지켜서 코드를 작성해줘.

중요 제약:
- Node.js, npm package, Playwright, Puppeteer, 일반 Selenium WebDriver 코드를 사용하지 마.
- async/await를 사용하지 마.
- Zabbix Browser Item에서 지원하는 Browser/Element 객체 메서드만 사용해.
- 모든 변수는 var로 선언해.
- 비밀번호, 토큰, 세션 값은 로그에 남기지 마.
- 최종 결과는 JSON.stringify(...) 형태의 문자열로 return해.

내가 제공하는 사용자 행동과 HTML 블럭을 보고 selector, 입력 대상, 클릭 대상, 대기 조건을 직접 추론해줘.
selector 후보가 여러 개면 가장 안정적인 selector를 선택하고 이유를 짧게 설명해줘.
정보가 조금 부족해도 합리적으로 초안을 작성해줘.
정말로 코드를 작성할 수 없을 정도로 중요한 정보가 없을 때만 질문해줘.

## 모니터링 시나리오

[무엇을 확인하는 시나리오인지 작성]

## 입력 파라미터

- URL: {$TARGET.URL}
- 사용자 ID: {$LOGIN.USER}
- 비밀번호: {$LOGIN.PASSWORD}

## 사용자 행동과 HTML 블럭

### 행동 1
설명:
[사용자가 하는 행동]

HTML:
```html
[관련 HTML]
```

### 행동 2
설명:
[사용자가 하는 행동]

HTML:
```html
[관련 HTML]
```

### 행동 3
설명:
[사용자가 하는 행동]

HTML:
```html
[관련 HTML]
```

## 성공 조건

[성공으로 판단할 조건]

```html
[성공 화면 또는 성공 요소 HTML]
```

## 실패 조건

[선택 사항: 실패 메시지, 권한 없음, timeout 등]

```html
[실패 화면 또는 실패 요소 HTML]
```

## 반환 JSON

아래 구조를 기본으로 사용해줘.

```json
{
  "success": 1,
  "status": "ok",
  "step": "dashboard_loaded",
  "duration_ms": 1234,
  "url": "https://example.com/dashboard",
  "error": "",
  "message": "login success"
}
```

## 출력 형식

1. 선택한 selector 목록
2. 최종 Zabbix Browser Item JavaScript 코드
3. 반환 JSON schema 설명
4. Zabbix item parameter 예시
5. 테스트할 때 확인할 점
````

---

## 4. 2단계 입력 예시

````text
## 모니터링 시나리오

로그인 페이지에 접속해서 ID/PW를 입력하고 로그인한다.
로그인 후 Dashboard 메뉴가 보이면 성공으로 판단한다.

## 입력 파라미터

- URL: {$TARGET.URL}
- 사용자 ID: {$LOGIN.USER}
- 비밀번호: {$LOGIN.PASSWORD}

## 사용자 행동과 HTML 블럭

### 행동 1
설명:
ID 입력창에 사용자 ID를 입력한다.

HTML:
```html
<input type="text" id="username" name="username" placeholder="User ID">
```

### 행동 2
설명:
비밀번호 입력창에 비밀번호를 입력한다.

HTML:
```html
<input type="password" id="password" name="password" placeholder="Password">
```

### 행동 3
설명:
로그인 버튼을 클릭한다.

HTML:
```html
<button type="submit" id="login-button">Login</button>
```

## 성공 조건

로그인 후 Dashboard 메뉴가 보이면 성공.

```html
<a class="menu-item active" href="/dashboard">Dashboard</a>
```
````

---

## 5. 3단계 프롬프트: Dependent Item과 Trigger 설계

2단계에서 만든 Browser Item의 반환 JSON을 기준으로 Zabbix 설정을 만든다.

````text
너는 Zabbix 모니터링 템플릿 설계 전문가다.

아래 Browser Item 반환 JSON을 기준으로 Dependent Item, JSONPath preprocessing, Trigger expression을 작성해줘.
가능하면 Zabbix 7.x 기준 문법으로 작성해줘.

## Master item 정보

- Host name: [예: Web Service]
- Master item name: [예: Browser check - Login]
- Master item key: [예: browser.login.check]
- Master item type: Browser item
- 반환값 type: Text

## 반환 JSON schema

```json
{
  "success": 1,
  "status": "ok",
  "step": "dashboard_loaded",
  "duration_ms": 1234,
  "url": "https://example.com/dashboard",
  "error": "",
  "message": "login success"
}
```

## 실패 예시

```json
{
  "success": 0,
  "status": "error",
  "step": "click_login_button",
  "duration_ms": 8200,
  "url": "https://example.com/login",
  "error": "login failed message detected",
  "message": "login failed"
}
```

## 원하는 Dependent Item

1. 성공 여부
2. 상태 문자열
3. 실패 단계
4. 소요 시간
5. 현재 URL
6. 오류 메시지
7. 사용자 표시용 메시지

## 원하는 Trigger

1. 성공 여부가 0이면 장애
2. 소요 시간이 기준값보다 크면 경고
3. error 메시지가 비어 있지 않으면 장애
4. Browser item 자체가 일정 시간 동안 값을 받지 못하면 장애

## 출력 형식

1. Master item 설정 요약
2. Dependent item 표
   - name
   - key
   - type of information
   - preprocessing JSONPath
   - units
   - description
3. Trigger expression 표
   - name
   - expression
   - severity
   - event name
   - operational data
   - recovery expression이 필요한 경우 recovery expression
4. 실제 Zabbix에 반영할 때 주의점
````

---

## 6. Dependent Item / Trigger 예시

| Name | Key | Type | JSONPath | Units |
|---|---|---|---|---|
| Browser login success | `browser.login.success` | Numeric unsigned | `$.success` |  |
| Browser login status | `browser.login.status` | Character | `$.status` |  |
| Browser login step | `browser.login.step` | Character | `$.step` |  |
| Browser login duration | `browser.login.duration_ms` | Numeric unsigned | `$.duration_ms` | ms |
| Browser login URL | `browser.login.url` | Character | `$.url` |  |
| Browser login error | `browser.login.error` | Text | `$.error` |  |
| Browser login message | `browser.login.message` | Text | `$.message` |  |

```text
로그인 실패:
last(/Web Service/browser.login.success)=0

응답 지연:
last(/Web Service/browser.login.duration_ms)>5000

오류 메시지 존재:
length(last(/Web Service/browser.login.error))>0

데이터 미수집:
nodata(/Web Service/browser.login.success,5m)=1
```

---

## 7. 사용 순서

1. 1단계 프롬프트로 Browser Item 제약사항을 정리한다.
2. 2단계 프롬프트에 실제 행동과 HTML 블럭을 붙여 JavaScript 초안을 만든다.
3. Zabbix Browser Item Test에서 코드를 확인한다.
4. 반환 JSON 예시를 3단계 프롬프트에 넣어 Dependent Item과 Trigger를 만든다.
5. Zabbix UI에 반영한 뒤 Latest data, Problems, Action log를 확인한다.

프롬프트 끝에 아래 문장을 붙이면 사소한 정보 누락 때문에 작업이 멈추는 일을 줄일 수 있다.

```text
정보가 부족해도 합리적으로 추론해서 초안을 작성해줘.
```
