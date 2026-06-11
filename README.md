# Zabbix E2E Web Monitoring Project

Zabbix Web Scenario와 Browser Item을 활용하여 웹서비스의 가용성과 사용자 관점의 E2E 시나리오를 모니터링하는 프로젝트


## 1. 프로젝트 개요

| 항목         | 내용                                         |
| ---------- | ------------------------------------------ |
| 프로젝트명      | 웹서비스 가용성 모니터링 구축   |
| 모니터링 도구    | Zabbix 7.x LTS                             |
| 배포 방식      | Cloud VM 기반 Docker Compose                 |
| 운영체제       | Ubuntu 24.04 LTS                           |
| 데이터베이스     | PostgreSQL                                 |
| 샘플 웹서비스    | nginx                                      |
| 주요 모니터링 방식 | Web Scenario, Browser Item, Trigger, Alert |
| 수행 기간      | 3주                                         |


## 2. 프로젝트 목표

* Docker Compose를 이용하여 Zabbix 모니터링 환경을 구성한다.
* nginx 샘플 웹서비스를 구축하고 `/`, `/health`, `/status` 경로를 제공한다.
* Zabbix Web Scenario를 통해 HTTP 상태 코드, 응답 본문, 응답 시간을 검증한다.
* 이후 Trigger 및 Alert를 구성하여 장애 발생과 복구를 확인한다.
* Midibus 웹서비스를 대상으로 Browser Item 기반 사용자 시나리오 모니터링을 구성한다.


## 3. 아키텍처

![Architecture Diagram](images/architecture_diagram.jpg)

각 보라색 사각형은 Docker Compose로 구성한 컨테이너이다.

Zabbix Web UI는 관리자가 8080 포트로 접근하는 관리자 화면이다.
Web Scenario의 실제 HTTP 요청은 Zabbix Web UI가 아니라 `zabbix-server` 컨테이너가 수행한다.

nginx 샘플 앱은 Docker 내부 네트워크에서 다음 주소로 접근한다.

```text
http://nginx/
http://nginx/health
http://nginx/status
http://nginx/nginx_status
```


## 4. 시스템 구성

Docker Compose로 구성한 서비스는 다음과 같다.

| 서비스           | 컨테이너명             | 역할                               |
| ------------- | ----------------- | -------------------------------- |
| postgresql    | zabbix-postgresql | Zabbix 데이터 저장용 PostgreSQL 데이터베이스 |
| zabbix-server | zabbix-server     | Zabbix 모니터링 서버                   |
| zabbix-web    | zabbix-web        | Zabbix Web Frontend              |
| zabbix-agent2 | zabbix-agent2     | Zabbix Server에 호스트 상태 메트릭을 제공하는 모니터링 에이전트 |
| nginx-agent2  | nginx-agent2      | nginx 프로세스 및 내부 상태를 `system.run[]`으로 수집하는 전용 에이전트 |
| nginx         | nginx-sample      | Web Scenario 테스트용 샘플 웹서비스        |


## 5. 디렉터리 구조

```text
.
├── docker-compose.yml
├── .env.example
├── .gitignore
├── nginx/
│   └── conf.d/
│       └── default.conf
├── zabbix/
│   ├── agent2/
│   │   └── scripts/
│   └── export/
├── images/
│   └── screenshots/
│       ├── week1/
│       ├── week2/
│       └── week3/
├── reports/
│   └── result-report.md
└── docs/
```


## 6. 사전 요구사항

VM 환경에는 다음 소프트웨어가 필요하다.

* Ubuntu 24.04 LTS
* Docker Engine 26.x 이상
* Docker Compose v2.x 이상
* Zabbix Server	7.x LTS, Zabbix Web (Frontend) (동일 버전)
* PostgreSQL 15.x 이상
* nginx 1.24 이상
* Git 2.x 이상
* curl / wget 기본 포함


## 7. 네트워크 및 포트 정책

본 프로젝트는 Docker Compose에 서비스별 포트 사용 목적을 명시하고, 실제 외부 접근 제어는 Cloud VM의 Security Group에서 수행한다.
Security Group 인바운드 규칙은 허용 목록 방식으로 관리하며, 명시적으로 허용하지 않은 포트와 출발지는 암시적으로 거부된다.

| 컴포넌트             |        포트 | 용도                  | 노출 범위         | Security Group 정책       |
| ---------------- | --------: | ------------------- | ------------- | ----------------------- |
| Zabbix Web UI    |  8080/tcp | 관리자 Web UI 접속       | 외부 노출 필요      | 허용된 IP 또는 업무망에서만 허용    |
| Zabbix Server    | 10051/tcp | Zabbix 내부 서비스 포트    | Docker 내부 전용   | 외부 인바운드 허용 규칙 없음      |
| Zabbix Agent2    | 10050/tcp | Agent 통신 포트         | Docker 내부 전용   | 외부 인바운드 허용 규칙 없음      |
| nginx Agent2     | 10050/tcp | nginx 전용 Agent 통신 포트 | Docker 내부 전용   | 외부 인바운드 허용 규칙 없음      |
| nginx Sample App |    80/tcp | Web Scenario 테스트 대상 | Docker 내부 전용   | 외부 인바운드 허용 규칙 없음      |
| PostgreSQL       |  5432/tcp | Zabbix 데이터베이스       | Docker 내부 전용 | 외부 인바운드 허용 규칙 없음      |

Docker Compose에서 호스트에 publish되는 포트는 Zabbix Web UI의 `8080/tcp`뿐이다.
Zabbix Web Scenario에서는 외부 IP가 아니라 Docker 내부 서비스명인 `nginx`를 사용한다.
Zabbix Server는 Docker 내부 네트워크를 통해 `zabbix-agent2:10050`으로 Agent2에 접근한다.
nginx 전용 `nginx-agent2`는 `nginx-sample` 컨테이너의 PID namespace를 공유하여 nginx 프로세스 상태를 확인한다.


## 8. 설치 및 기동 방법

프로젝트 루트 디렉터리에서 다음 명령어를 실행한다.

```bash
docker compose up -d
```
- 정상 기동 예시
![docker_compose_up_screenshot](images/screenshots/week1/screenshot_1_docker_compose_up.png)

컨테이너 상태를 확인한다.

```bash
docker compose ps
```
- 정상 기동 예시
![docker_compose_ps_screenshot](images/screenshots/week1/screenshot_2_docker_compose_ps.png)

정상 기동 시 다음 컨테이너가 실행된다.

```text
nginx-sample
nginx-agent2
zabbix-agent2
zabbix-postgresql
zabbix-server
zabbix-web
```

전체 서비스를 중지하려면 다음 명령어를 실행한다.

```bash
docker compose down
```

PostgreSQL 데이터 볼륨까지 삭제해야 하는 초기화 상황이 아니라면 `-v` 옵션은 사용하지 않는다.

```bash
# 주의: DB 볼륨 삭제
docker compose down -v
```


## 9. nginx 샘플 앱

nginx 샘플 웹서비스는 Web Scenario 테스트 대상으로 사용된다.

| 경로        | 기대 응답                        | 검증 목적                     |
| --------- | ---------------------------- | ------------------------- |
| `/`       | HTTP 200, `Welcome to nginx` | 메인 페이지 Required String 검증 |
| `/health` | HTTP 200, `OK`               | 상태 확인 엔드포인트 검증            |
| `/status` | HTTP 200, `status check`     | 상태 페이지 응답 및 응답시간 검증       |
| `/nginx_status` | nginx stub_status 응답 | Agent2 `system.run[]` 내부 지표 수집 |

### 9.1 nginx 샘플 앱 검증

VM 내부에서 다음 명령어로 확인할 수 있다.

```bash
curl -i http://127.0.0.1/
curl -i http://127.0.0.1/health
curl -i http://127.0.0.1/status
```
- 정상 기동 예시
![nginx_sample_screenshot](images/screenshots/week1/screenshot_3_nginx_sample_test.png)

nginx 설정 문법은 다음 명령어로 확인한다.

```bash
docker exec nginx-sample nginx -t
```

Zabbix Server 컨테이너에서 Docker 내부 네트워크로 nginx에 접근 가능한지 확인하려면 다음 명령어를 사용한다.

```bash
docker exec zabbix-server sh -c "wget -qO- http://nginx/ || true"
docker exec zabbix-server sh -c "wget -qO- http://nginx/health || true"
docker exec zabbix-server sh -c "wget -qO- http://nginx/status || true"
```

### 9.2 zabbix-agent2 system.run 기반 nginx 내부 상태 수집

기존 Web Scenario는 URL 기준의 사용자 관점 가용성 검증에 사용한다.
추가로 `nginx-agent2`는 `system.run[]` item을 통해 스크립트를 실행하고 nginx 프로세스 및 내부 지표를 수집한다.

Zabbix UI에서 `nginx-sample` 호스트를 별도로 만들고 Agent Interface를 DNS `nginx-agent2`, Port `10050`으로 설정한다.
이후 다음 item key를 Zabbix agent 타입으로 등록한다.

```text
system.run[sh /var/lib/zabbix/user_scripts/nginx_process_count.sh]
system.run[sh /var/lib/zabbix/user_scripts/nginx_active_connections.sh]
system.run[sh /var/lib/zabbix/user_scripts/nginx_total_requests.sh]
```

각 item의 의미는 다음과 같다.

| item key | 수집 값 | 목적 |
| -------- | ------- | ---- |
| `nginx_process_count.sh` | nginx master/worker 프로세스 수 | URL이 아니라 프로세스 기준으로 nginx 동작 여부 확인 |
| `nginx_active_connections.sh` | 현재 active connection 수 | nginx 내부 연결 상태 확인 |
| `nginx_total_requests.sh` | 누적 request 수 | 요청 처리량 추세 확인 |

이 구성에서는 `system.run[]` 전체를 허용하지 않고, `docker-compose.yml`의 `ZBX_ALLOWKEY`로 필요한 스크립트 실행만 허용한다.

***보안상 주의할 점***은 다음과 같다.

* `system.run[]`은 Agent가 OS 명령을 실행하는 기능이므로 전체 허용하지 않고 필요한 명령만 `AllowKey`로 제한한다.
* `nginx-agent2`에는 Docker socket을 마운트하지 않는다. Docker socket을 열면 Agent가 다른 컨테이너나 호스트 Docker를 조작할 수 있어 권한 범위가 지나치게 커진다.
* `/nginx_status`는 내부 지표 엔드포인트이므로 외부에 공개하지 않고 Docker 내부 네트워크에서만 접근하도록 `allow`/`deny`를 설정한다.
* `nginx-agent2`는 `nginx-sample`의 PID namespace만 공유하여 프로세스 확인 범위를 nginx 컨테이너로 제한한다.


## 10. Zabbix Web UI 접속 및 초기 설정

Zabbix Web Frontend는 VM의 8080 포트로 접근합다.

```text
http://<VM_PUBLIC_IP>:8080
```

초기 로그인 정보는 다음과 같다.

```text
Username: Admin
Password: zabbix
```

최초 로그인 후 관리자 비밀번호를 변경하였다.


## 11. 현재 진행 상태

### 완료

* Cloud VM 생성
* VS Code Remote SSH 접속
* GitHub Repository 생성
* Docker 및 Docker Compose 설치
* Docker Compose 기반 Zabbix 스택 구성
* PostgreSQL, Zabbix Server, Zabbix Web, Agent2, nginx 기동
* nginx `/`, `/health`, `/status` 엔드포인트 구성
* nginx healthcheck 추가
* Zabbix Web UI 접속 확인
* Zabbix Admin 기본 비밀번호 변경
* Zabbix Agent2 availability 문제 해결
* nginx 전용 Agent2 sidecar 및 `system.run[]` 기반 내부 상태 수집 구성
* Week 1 검증 스크린샷 정리

### 예정

* nginx Web Scenario 구성
* Web Scenario Trigger 구성
* 장애 및 복구 테스트
* Web Scenario XML Export
* Midibus Browser Item 구성
* Alert Action 구성
* 결과보고서 작성


## 12. 트러블슈팅
### 12.1 Zabbix Agent2 Not Available

* 증상: Zabbix UI에서 `Zabbix agent is not available` 문제 발생
* 원인: Zabbix Host의 Agent Interface가 Docker 내부 Agent2 컨테이너 주소와 일치하지 않음
* 해결:

  * `docker-compose.yml`에서 `ZBX_HOSTNAME`을 `Zabbix server`로 설정
  * Zabbix UI에서 `Zabbix server` Host의 Agent Interface를 DNS `zabbix-agent2`, Port `10050`으로 수정
