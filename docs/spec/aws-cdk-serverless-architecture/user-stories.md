# AWS CDK サーバーレスWebサービスアーキテクチャ ユーザストーリー

**作成日**: 2026-01-12
**関連要件定義**: [requirements.md](requirements.md)
**ヒアリング記録**: [interview-record.md](interview-record.md)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実なストーリー
- 🟡 **黄信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測によるストーリー
- 🔴 **赤信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングにない推測によるストーリー

---

## エピック1: ネットワーク基盤構築

### ストーリー 1.1: VPC 環境の構築 🔵

**信頼性**: 🔵 *requirements.md 3.1節・ユーザヒアリングより*

**私は** インフラエンジニア **として**
**セキュアで拡張性のある VPC 環境を構築したい**
**そうすることで** アプリケーションを安全にホストし、将来の拡張に対応できる

**関連要件**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005

**詳細シナリオ**:
1. CIDR Block `10.0.0.0/16` で VPC を作成する
2. 2つの AZ (ap-northeast-1a, ap-northeast-1c) を使用する
3. Public Subnet、Private App Subnet、Private DB Subnet を各 AZ に作成する
4. 適切なルートテーブルを設定する

**前提条件**:
- AWS アカウントが利用可能であること
- ap-northeast-1 リージョンが利用可能であること

**制約事項**:
- CIDR Block は `10.0.0.0/16` 固定
- Multi-AZ 構成必須

**優先度**: Must Have

---

### ストーリー 1.2: インターネット接続の構築 🔵

**信頼性**: 🔵 *requirements.md 3.1節より*

**私は** インフラエンジニア **として**
**VPC からインターネットへの接続を構築したい**
**そうすることで** パブリックサブネットから外部にアクセスし、プライベートサブネットからも NAT 経由で外部通信できる

**関連要件**: REQ-006, REQ-007

**詳細シナリオ**:
1. Internet Gateway を作成して VPC にアタッチする
2. 各 AZ に NAT Gateway を作成する（計2個）
3. Public Subnet のルートテーブルに IGW へのルートを追加する
4. Private Subnet のルートテーブルに NAT Gateway へのルートを追加する

**前提条件**:
- VPC が作成済みであること
- Elastic IP が NAT Gateway 用に確保できること

**優先度**: Must Have

---

### ストーリー 1.3: VPC Endpoints の構築 🔵

**信頼性**: 🔵 *requirements.md 3.1節より*

**私は** インフラエンジニア **として**
**AWS サービスへの VPC Endpoints を構築したい**
**そうすることで** NAT 費用を削減し、AWS サービスへの通信をセキュアに保てる

**関連要件**: REQ-008, REQ-009, REQ-010, REQ-011, NFR-101, NFR-201

**詳細シナリオ**:
1. Systems Manager 用 Interface Endpoints (ssm, ssmmessages, ec2messages) を作成する
2. ECR 用 Interface Endpoints (ecr.api, ecr.dkr) を作成する
3. CloudWatch Logs 用 Interface Endpoint を作成する
4. S3 用 Gateway Endpoint を作成する
5. 各 Endpoint のセキュリティグループを設定する

**前提条件**:
- VPC とサブネットが作成済みであること

**優先度**: Must Have

---

## エピック2: コンピューティング基盤構築

### ストーリー 2.1: ECS クラスターの構築 🔵

**信頼性**: 🔵 *requirements.md 3.2節より*

**私は** インフラエンジニア **として**
**ECS Fargate クラスターを構築したい**
**そうすることで** コンテナ化されたアプリケーションをサーバーレスで運用できる

**関連要件**: REQ-012, REQ-013

**詳細シナリオ**:
1. Fargate 専用の ECS クラスターを作成する
2. Container Insights を有効化する
3. クラスターの IAM ロールを設定する

**前提条件**:
- VPC が作成済みであること

**優先度**: Must Have

---

### ストーリー 2.2: ECS タスク定義（Sidecar パターン）の作成 🔵

**信頼性**: 🔵 *requirements.md 3.2節・ユーザヒアリングより*

**私は** インフラエンジニア **として**
**Sidecar パターンを使用した ECS タスク定義を作成したい**
**そうすることで** セキュアな DB 接続とデバッグ機能を実現できる

**関連要件**: REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, NFR-302, NFR-303

**詳細シナリオ**:
1. App Container を定義する（アプリケーションコード）
2. Bastion/Sidecar Container を定義する（Alpine イメージ、socat インストール）
3. CPU 0.5 vCPU、Memory 1GB を設定する
4. Task Role に `AmazonSSMManagedInstanceCore` 権限を付与する
5. ログドライバーを CloudWatch Logs に設定する

**前提条件**:
- ECS クラスターが作成済みであること
- ECR にコンテナイメージが Push 済みであること

**制約事項**:
- CPU: 0.5 vCPU
- Memory: 1GB

**優先度**: Must Have

---

### ストーリー 2.3: Frontend ECS Service の作成 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

**私は** インフラエンジニア **として**
**Frontend 用の ECS Service を作成したい**
**そうすることで** フロントエンドアプリケーションを高可用性でホストできる

**関連要件**: REQ-020, REQ-021

**詳細シナリオ**:
1. Frontend 用 Task Definition を作成する
2. ECS Service を作成する（Desired Count: 2）
3. `enableExecuteCommand: true` を設定する
4. ALB との連携を設定する

**前提条件**:
- ECS クラスターが作成済みであること
- ALB が作成済みであること

**優先度**: Must Have

---

### ストーリー 2.4: Backend ECS Service の作成 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

**私は** インフラエンジニア **として**
**Backend 用の ECS Service を作成したい**
**そうすることで** バックエンド API を高可用性でホストできる

**関連要件**: REQ-020, REQ-021

**詳細シナリオ**:
1. Backend 用 Task Definition を作成する
2. ECS Service を作成する（Desired Count: 2）
3. `enableExecuteCommand: true` を設定する
4. ALB との連携を設定する
5. Aurora への接続設定を行う

**前提条件**:
- ECS クラスターが作成済みであること
- ALB が作成済みであること
- Aurora が作成済みであること

**優先度**: Must Have

---

## エピック3: データベース構築

### ストーリー 3.1: Aurora MySQL Serverless v2 の構築 🔵

**信頼性**: 🔵 *requirements.md 3.3節・ユーザヒアリングより*

**私は** インフラエンジニア **として**
**Aurora MySQL Serverless v2 を構築したい**
**そうすることで** スケーラブルでコスト効率の良いデータベースを利用できる

**関連要件**: REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027

**詳細シナリオ**:
1. Aurora MySQL Serverless v2 クラスターを作成する
2. Private DB Subnet に配置する
3. Security Group を作成し、ECS からの 3306 ポートのみ許可する
4. Storage Encryption を有効化する
5. 自動バックアップを設定する
6. Secrets Manager でクレデンシャルを管理する

**前提条件**:
- VPC と DB Subnet が作成済みであること
- Secrets Manager が利用可能であること

**制約事項**:
- 外部からの直接アクセス禁止
- 暗号化必須

**優先度**: Must Have

---

## エピック4: セキュリティ・ロードバランシング

### ストーリー 4.1: ALB の構築 🔵

**信頼性**: 🔵 *requirements.md 3.4節より*

**私は** インフラエンジニア **として**
**Application Load Balancer を構築したい**
**そうすることで** 複数の ECS タスクに負荷分散し、HTTPS を強制できる

**関連要件**: REQ-028, REQ-029, REQ-030, NFR-105

**詳細シナリオ**:
1. Public Subnet に Internet-facing ALB を作成する
2. HTTP (80) から HTTPS (443) へのリダイレクトを設定する
3. ACM で SSL 証明書を設定する
4. ターゲットグループを作成して ECS Service と連携する

**前提条件**:
- VPC と Public Subnet が作成済みであること
- ACM で証明書が発行済みであること

**優先度**: Must Have

---

### ストーリー 4.2: CloudFront + S3 の構築 🔵

**信頼性**: 🔵 *requirements.md 3.4節より*

**私は** インフラエンジニア **として**
**CloudFront と S3 を構築したい**
**そうすることで** 静的コンテンツを高速に配信し、Sorry Page を提供できる

**関連要件**: REQ-031, REQ-032, NFR-104

**詳細シナリオ**:
1. 静的リソース用 S3 バケットを作成する
2. CloudFront ディストリビューションを作成する
3. OAC (Origin Access Control) を設定する
4. S3 バケットポリシーを設定して CloudFront からのみアクセス可能にする
5. Sorry Page を設定する

**前提条件**:
- なし

**優先度**: Must Have

---

### ストーリー 4.3: WAF の構築 🔵

**信頼性**: 🔵 *requirements.md 3.4節・ユーザヒアリングより*

**私は** インフラエンジニア **として**
**WAF を構築したい**
**そうすることで** Web アプリケーションを一般的な攻撃から保護できる

**関連要件**: REQ-033, REQ-034, NFR-103

**詳細シナリオ**:
1. WAF Web ACL を作成する
2. AWS Managed Rules (Common RuleSet) を適用する
3. SQL Injection 対策ルールを適用する
4. CloudFront に WAF を関連付ける

**前提条件**:
- CloudFront ディストリビューションが作成済みであること

**優先度**: Should Have

---

## エピック5: モニタリング・運用

### ストーリー 5.1: CloudWatch Logs の構築 🔵

**信頼性**: 🔵 *requirements.md 3.5節・ユーザヒアリングより*

**私は** 運用エンジニア **として**
**CloudWatch Logs を構築したい**
**そうすることで** システムのログを一元管理し、トラブルシューティングできる

**関連要件**: REQ-035, REQ-036, REQ-037, REQ-038, REQ-101, REQ-102

**詳細シナリオ**:
1. ECS、RDS、VPC Flow Log 用のロググループを作成する
2. Dev 環境: 保持期間 3 日を設定する
3. Prod 環境: 保持期間 30 日を設定する
4. Prod 環境: S3 Glacier への長期保存を設定する

**前提条件**:
- S3 バケット（Glacier 用）が作成済みであること

**優先度**: Must Have

---

### ストーリー 5.2: CloudWatch アラーム・Chatbot の構築 🔵

**信頼性**: 🔵 *requirements.md 3.5節より*

**私は** 運用エンジニア **として**
**CloudWatch アラームと AWS Chatbot を構築したい**
**そうすることで** 異常発生時に Slack で即座に通知を受けられる

**関連要件**: REQ-039, REQ-103

**詳細シナリオ**:
1. 主要メトリクス用の CloudWatch アラームを作成する
2. SNS トピックを作成する
3. AWS Chatbot を設定して Slack ワークスペースと連携する
4. アラーム発生時の通知フローをテストする

**前提条件**:
- Slack ワークスペースが利用可能であること
- AWS Chatbot の Slack 連携が設定済みであること

**優先度**: Should Have

---

## エピック6: CI/CD パイプライン

### ストーリー 6.1: CI/CD パイプラインの構築 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

**私は** 開発エンジニア **として**
**CI/CD パイプラインを構築したい**
**そうすることで** コード変更を自動的にビルド・デプロイできる

**関連要件**: REQ-040, REQ-041

**詳細シナリオ**:
1. CodePipeline を作成する
2. CodeBuild プロジェクトを作成する
3. ソースステージ（GitHub/CodeCommit）を設定する
4. ビルドステージを設定する
5. デプロイステージ（ECS）を設定する

**前提条件**:
- ソースリポジトリが利用可能であること
- ECS Service が作成済みであること

**優先度**: Should Have

**備考**: 詳細な CI/CD 構成は設計フェーズで決定する

---

## エピック7: 環境構成

### ストーリー 7.1: Dev 環境の構築 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

**私は** 開発エンジニア **として**
**Dev 環境を構築したい**
**そうすることで** 開発・テストを本番と分離して行える

**関連要件**: REQ-042

**詳細シナリオ**:
1. Dev 用の CDK スタックを作成する
2. Dev 用パラメータを設定する
3. Dev 環境にデプロイする

**前提条件**:
- parameter.ts が設定済みであること

**優先度**: Must Have

---

### ストーリー 7.2: Prod 環境の構築 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

**私は** 運用エンジニア **として**
**Prod 環境を構築したい**
**そうすることで** 本番サービスを安全にホストできる

**関連要件**: REQ-042

**詳細シナリオ**:
1. Prod 用の CDK スタックを作成する
2. Prod 用パラメータを設定する
3. Prod 環境にデプロイする

**前提条件**:
- Dev 環境での検証が完了していること
- parameter.ts が設定済みであること

**優先度**: Must Have

---

## ストーリーマップ

```
エピック1: ネットワーク基盤構築
├── ストーリー 1.1 VPC環境の構築 (🔵 Must Have)
├── ストーリー 1.2 インターネット接続の構築 (🔵 Must Have)
└── ストーリー 1.3 VPC Endpointsの構築 (🔵 Must Have)

エピック2: コンピューティング基盤構築
├── ストーリー 2.1 ECSクラスターの構築 (🔵 Must Have)
├── ストーリー 2.2 ECSタスク定義（Sidecar）の作成 (🔵 Must Have)
├── ストーリー 2.3 Frontend ECS Serviceの作成 (🔵 Must Have)
└── ストーリー 2.4 Backend ECS Serviceの作成 (🔵 Must Have)

エピック3: データベース構築
└── ストーリー 3.1 Aurora MySQL Serverless v2の構築 (🔵 Must Have)

エピック4: セキュリティ・ロードバランシング
├── ストーリー 4.1 ALBの構築 (🔵 Must Have)
├── ストーリー 4.2 CloudFront + S3の構築 (🔵 Must Have)
└── ストーリー 4.3 WAFの構築 (🔵 Should Have)

エピック5: モニタリング・運用
├── ストーリー 5.1 CloudWatch Logsの構築 (🔵 Must Have)
└── ストーリー 5.2 CloudWatchアラーム・Chatbotの構築 (🔵 Should Have)

エピック6: CI/CDパイプライン
└── ストーリー 6.1 CI/CDパイプラインの構築 (🔵 Should Have)

エピック7: 環境構成
├── ストーリー 7.1 Dev環境の構築 (🔵 Must Have)
└── ストーリー 7.2 Prod環境の構築 (🔵 Must Have)
```

---

## 信頼性レベルサマリー

- 🔵 青信号: 15件 (100%)
- 🟡 黄信号: 0件 (0%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: ✅ 高品質 - すべてのユーザーストーリーが元要件書・ユーザヒアリングにより確認済み
