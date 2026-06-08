# Zabbix E2E Web Monitoring Project

Zabbix Web Scenario와 Browser Item을 활용하여 웹서비스의 가용성과 사용자 관점의 E2E 시나리오를 모니터링하는 프로젝트로, 단순한 서버 상태 확인을 넘어, 실제 사용자의 서비스 이용 흐름에 가까운 방식으로 웹서비스 접속, 응답 상태, 응답 본문, 응답 시간, 로그인 및 주요 기능 동작 여부를 검증하는 것을 목표로 한다.

## 1. 프로젝트 개요

| 항목         | 내용                                         |
| ---------- | ------------------------------------------ |
| 프로젝트명      | Zabbix E2E 시나리오 테스트를 통한 웹서비스 가용성 모니터링 구축   |
| 모니터링 도구    | Zabbix 7.x LTS                             |
| 배포 방식      | Cloud VM 기반 Docker Compose                 |
| 운영체제       | Ubuntu 24.04 LTS                           |
| 데이터베이스     | PostgreSQL                                 |
| 샘플 웹서비스    | nginx                                      |
| 주요 모니터링 방식 | Web Scenario, Browser Item, Trigger, Alert |
| 수행 기간      | 3주                                         |

## 2. 프로젝트 목표

이 프로젝트의 주요 목표는 다음과 같다.

* Docker Compose를 이용하여 Zabbix 모니터링 환경 구성
* nginx 샘플 웹서비스를 구축하고 `/`, `/health`, `/status` 경로 제공
* Zabbix Web Scenario를 통해 HTTP 상태 코드, 응답 본문, 응답 시간 검증
* Trigger를 구성하여 장애 발생 시 Zabbix에서 문제 상태 감지
* Midibus 웹서비스를 대상으로 Browser Item 기반 사용자 시나리오 모니터링 구성

## 3. 시스템 구성

현재 Docker Compose로 구성한 서비스는 다음과 같다.

| 서비스           | 역할                               |
| ------------- | -------------------------------- |
| postgresql    | Zabbix 데이터 저장용 PostgreSQL 데이터베이스 |
| zabbix-server | Zabbix 모니터링 서버                   |
| zabbix-web    | Zabbix Web Frontend              |
| zabbix-agent2 | Zabbix Agent2                    |
| nginx         | Web Scenario 테스트용 샘플 웹서비스        |

## 4. 디렉터리 구조

```text
.
├── docker-compose.yml
├── .env.example
├── .gitignore
├── nginx/
│   └── conf.d/
│       └── default.conf
├── zabbix/
│   └── export/
├── screenshots/
│   ├── week1/
│   ├── week2/
│   └── week3/
├── reports/
│   └── result-report.md
└── docs/
```

## 5. 사전 요구사항

VM 환경에는 다음 소프트웨어가 필요하다.

* Ubuntu 24.04 LTS
* Docker Engine
* Docker Compose v2
* Git

## 6. 실행 방법

프로젝트 루트 디렉터리에서 다음 명령어를 실행

```bash
docker compose up -d
```

컨테이너 상태 확인:

```bash
docker compose ps
```

현재 구성 기준으로 다음 컨테이너가 실행된다.

```text
nginx-sample
zabbix-agent2
zabbix-postgresql
zabbix-server
zabbix-web
```

## 7. nginx 샘플 웹서비스 확인

nginx 샘플 웹서비스는 Web Scenario 테스트 대상으로 사용되며, 제공 경로는 다음과 같다.

| 경로        | 기대 응답                               |
| --------- | ----------------------------------- |
| `/`       | HTTP 200, `Welcome to nginx` 문자열 포함 |
| `/health` | HTTP 200, `OK` 반환                   |
| `/status` | HTTP 200, `healthy` 반환              |

확인 명령어:

```bash
curl -i http://127.0.0.1/
curl -i http://127.0.0.1/health
curl -i http://127.0.0.1/status
```

정상 확인 결과:

```text
/       → HTTP/1.1 200 OK, Welcome to nginx
/health → HTTP/1.1 200 OK, OK
/status → HTTP/1.1 200 OK, healthy
```

## 8. Zabbix Web UI 접속

Zabbix Web Frontend는 VM의 8080 포트로 접근한다.

```text
http://<VM_PUBLIC_IP>:8080
```

기본 로그인 정보:

```text
Username: Admin
Password: zabbix
```
