수정 사항을 반영하여 **TypeScript(인프라 정의)**와 **Python(로직 구현)** 하이브리드 구성으로 업데이트된 `requirements.md`입니다.

CDK는 TypeScript로 작성할 때 타입 지원(Type Safety)이 강력하여 인프라 실수를 줄일 수 있고, Lambda 함수는 Python으로 작성하면 라이브러리 활용이나 코드 작성이 편리하므로 **가장 이상적인 조합** 중 하나입니다.

아래 내용을 복사하여 `requirements.md`로 저장하세요.

---

# requirements.md

## 1. 프로젝트 개요 (Project Overview)

본 문서는 AWS CDK(Cloud Development Kit)를 사용하여 **고가용성(High Availability)**과 **보안(Security)**이 강화된 서버리스 웹 서비스 아키텍처를 구축하기 위한 요구사항을 정의한다.
인프라는 ECS Fargate, Aurora RDS, CloudFront, ALB 등을 포함하며, 특히 **Sidecar 패턴을 통한 보안 접속**과 **VPC Endpoint를 통한 내부 통신 최적화**에 중점을 둔다.

## 2. 기술 스택 (Tech Stack)

* **Infrastructure as Code (IaC):** AWS CDK v2 (**TypeScript**)
* 인프라 리소스 정의, 스택 구성, 배포 파이프라인은 TypeScript를 주력으로 사용한다.


* **Runtime Logic:** **Python 3.x**
* AWS Lambda 함수(Custom Resource, Log Processing, 운영 자동화 스크립트 등) 구현 시 Python을 사용한다.


* **Target Region:** `ap-northeast-1` (Tokyo)

---

## 3. 상세 구현 요구사항 (Detailed Requirements)

### 3.1. 네트워크 (VPC & Networking)

* **VPC 구성:**
* CIDR Block은 `10.0.0.0/16`을 사용한다.
* 가용 영역(AZ)은 2개(`ap-northeast-1a`, `ap-northeast-1c` 등)를 사용하여 Multi-AZ로 구성한다.


* **서브넷 (Subnets):**
* **Public Subnet:** ALB, NAT Gateway 용도. `/24` (256 IPs) 할당.
* **Private App Subnet:** ECS Fargate 워크로드 용도. 확장성을 고려하여 **`/23` (512 IPs)** 할당.
* **Private DB Subnet:** Aurora RDS 용도. `/24` (256 IPs) 할당.


* **게이트웨이 (Gateways):**
* Internet Gateway (IGW) 1개.
* NAT Gateway는 고가용성을 위해 **각 AZ별로 1개씩(총 2개)** 생성한다.


* **VPC Endpoints (Interface & Gateway):**
* NAT 비용 절감 및 보안 강화를 위해 다음 서비스에 대한 Endpoint를 구성한다.
* Systems Manager (`ssm`, `ssmmessages`, `ec2messages`)
* ECR (`ecr.api`, `ecr.dkr`)
* CloudWatch Logs (`logs`)
* S3 (`Gateway Endpoint` 사용)





### 3.2. 컴퓨팅 (ECS Fargate)

* **Cluster:** Fargate 전용 ECS 클러스터를 생성한다. `Container Insights`를 활성화한다.
* **Task Definition:**
* CPU/Memory는 워크로드에 맞게 설정한다 (예: 1 vCPU, 2GB).
* **Sidecar 패턴 구현 (핵심):** 하나의 Task 안에 다음 컨테이너들을 정의한다.
1. **App Container:** 실제 애플리케이션 (Frontend/Backend 분리 배포 시 각각 별도 서비스로 구성).
2. **Bastion/Sidecar Container:** `Alpine` 등의 경량 이미지를 사용하며, `sleep infinity` 명령어로 대기 상태를 유지한다. `socat` 등의 툴을 설치하여 포트 포워딩 중계 역할을 수행한다.




* **IAM Role:**
* Task Role에 `AmazonSSMManagedInstanceCore` 권한을 부여하여 SSM Session Manager 접속을 허용한다.


* **Service:**
* `enableExecuteCommand: true` 설정을 통해 ECS Exec 기능을 활성화한다.
* Desired Count는 2 이상으로 설정하여 고가용성을 유지한다.



### 3.3. 데이터베이스 (Aurora RDS)

* **Engine:** Amazon Aurora MySQL (Serverless v2 또는 Provisioned)을 사용한다.
* **Network:** Private DB Subnet에 배치한다.
* **Security Group:**
* 외부(인터넷)에서의 직접 접근을 차단한다.
* Inbound 규칙: 오직 **ECS Fargate Security Group**으로부터의 3306 포트 접근만 허용한다.


* **Storage:** 암호화(Storage Encryption)를 활성화한다.

### 3.4. 보안 및 로드밸런싱 (Security & Load Balancing)

* **Application Load Balancer (ALB):**
* Public Subnet에 배치하며, Internet-facing으로 설정한다.
* HTTP(80) 요청은 HTTPS(443)로 리다이렉트한다.


* **CloudFront + S3:**
* 정적 리소스(이미지 등) 및 Sorry Page 제공을 위한 S3 버킷을 생성한다.
* **OAC (Origin Access Control)**를 구성하여, S3 버킷이 CloudFront를 통해서만 접근 가능하도록 제한한다 (Bucket Policy 수정).


* **WAF (Web Application Firewall):**
* CloudFront 또는 ALB에 연결한다.
* AWS Managed Rules (Common RuleSet, SQL Injection 등)를 적용한다.



### 3.5. 모니터링 및 운영 (Monitoring & Ops)

* **CloudWatch Logs:** ECS, RDS, VPC Flow Log 등의 로그를 수집한다.
* **Log Retention (수명주기):**
* Dev 환경: 1~3일
* Prod 환경: 15~30일 후 S3 Glacier로 이관하거나 삭제한다.


* **AWS Chatbot & Lambda:**
* CloudWatch Alarm 발생 시 Slack 채널로 알림을 전송한다.
* 필요한 경우 **Python 기반의 Lambda 함수**를 작성하여 커스텀 알림이나 로그 후처리를 수행한다.



---

## 4. 구현 단계 (Implementation Steps)

1. **Init Project:** `cdk init app --language typescript` 로 프로젝트 초기화.
* `lambda/` 디렉토리를 생성하여 Python 코드를 별도 관리.


2. **VPC Stack:** 네트워크 계층(VPC, Subnet, IGW, NAT, Endpoints) 배포.
3. **Security Stack:** Security Group, IAM Role 배포.
4. **Database Stack:** Aurora RDS 배포 및 Secret 생성.
5. **Application Stack:** ALB, ECS Cluster, Task Definition(Sidecar 포함), Service 배포.
6. **Distribution & Ops Stack:** S3, CloudFront, WAF, Chatbot 및 **Python Lambda Functions** 배포.

---

### 💡 하이브리드 구조 팁

TypeScript CDK 프로젝트 안에 Python Lambda를 포함할 때는 보통 다음과 같은 폴더 구조를 추천합니다:

```text
my-project/
├── bin/               # CDK App 진입점 (TS)
├── lib/               # CDK Stacks 정의 (TS)
├── lambda/            # Lambda 함수 코드 (Python)
│   ├── log_processor/
│   │   └── index.py
│   └── custom_resource/
│       └── index.py
├── cdk.json
├── package.json
└── ...

```
