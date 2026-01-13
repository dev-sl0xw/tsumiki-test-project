# AWS CDK サーバーレスWebサービスアーキテクチャ 要件定義書

## 概要

AWS CDK (Cloud Development Kit) を使用して、**高可用性 (High Availability)** と**セキュリティ (Security)** が強化されたサーバーレスWebサービスアーキテクチャを構築する。

ECS Fargate、Aurora MySQL、CloudFront、ALB等を含むインフラ構築を行い、特に**Sidecarパターンを通じたセキュア接続**と**VPC Endpointを通じた内部通信最適化**に重点を置く。

## 関連文書

- **ヒアリング記録**: [💬 interview-record.md](interview-record.md)
- **ユーザストーリー**: [📖 user-stories.md](user-stories.md)
- **受け入れ基準**: [✅ acceptance-criteria.md](acceptance-criteria.md)
- **コンテキストノート**: [📝 note.md](note.md)
- **元要件**: [requirements.md](../../../requirements.md) (韓国語)

## 機能要件（EARS記法）

**【信頼性レベル凡例】**:
- 🔵 **青信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実な要件
- 🟡 **黄信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測による要件
- 🔴 **赤信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングにない推測による要件

---

### 通常要件

#### ネットワーク (VPC & Networking)

- REQ-001: システムは CIDR Block `10.0.0.0/16` の VPC を作成しなければならない 🔵 *requirements.md 3.1節より*
- REQ-002: システムは 2つの可用性ゾーン (ap-northeast-1a, ap-northeast-1c) で Multi-AZ 構成を取らなければならない 🔵 *requirements.md 3.1節より*
- REQ-003: システムは Public Subnet を ALB、NAT Gateway 用途で `/24` (256 IPs) で割り当てなければならない 🔵 *requirements.md 3.1節より*
- REQ-004: システムは Private App Subnet を ECS Fargate ワークロード用途で `/23` (512 IPs) で割り当てなければならない 🔵 *requirements.md 3.1節より*
- REQ-005: システムは Private DB Subnet を Aurora RDS 用途で `/24` (256 IPs) で割り当てなければならない 🔵 *requirements.md 3.1節より*
- REQ-006: システムは Internet Gateway を 1個作成しなければならない 🔵 *requirements.md 3.1節より*
- REQ-007: システムは NAT Gateway を各 AZ に 1個ずつ（計2個）作成しなければならない 🔵 *requirements.md 3.1節より*

#### VPC Endpoints

- REQ-008: システムは Systems Manager (ssm, ssmmessages, ec2messages) 用の VPC Endpoint を作成しなければならない 🔵 *requirements.md 3.1節より*
- REQ-009: システムは ECR (ecr.api, ecr.dkr) 用の VPC Endpoint を作成しなければならない 🔵 *requirements.md 3.1節より*
- REQ-010: システムは CloudWatch Logs (logs) 用の VPC Endpoint を作成しなければならない 🔵 *requirements.md 3.1節より*
- REQ-011: システムは S3 用の Gateway Endpoint を作成しなければならない 🔵 *requirements.md 3.1節より*

#### コンピューティング (ECS Fargate)

- REQ-012: システムは Fargate 専用の ECS クラスターを作成しなければならない 🔵 *requirements.md 3.2節より*
- REQ-013: システムは Container Insights を有効化しなければならない 🔵 *requirements.md 3.2節より*
- REQ-014: システムは Task Definition で 0.5 vCPU / 1GB Memory を設定しなければならない 🔵 *ユーザヒアリングより*
- REQ-015: システムは Sidecar パターンを実装し、App Container と Bastion/Sidecar Container を定義しなければならない 🔵 *requirements.md 3.2節より*
- REQ-016: システムは Bastion/Sidecar Container に Alpine 等の軽量イメージを使用し、`sleep infinity` で待機状態を維持しなければならない 🔵 *requirements.md 3.2節より*
- REQ-017: システムは Bastion/Sidecar Container に socat 等のツールをインストールしてポートフォワーディング中継を行わなければならない 🔵 *requirements.md 3.2節より*
- REQ-018: システムは Task Role に `AmazonSSMManagedInstanceCore` 権限を付与しなければならない 🔵 *requirements.md 3.2節より*
- REQ-019: システムは Service で `enableExecuteCommand: true` を設定して ECS Exec を有効化しなければならない 🔵 *requirements.md 3.2節より*
- REQ-020: システムは Service の Desired Count を 2 以上に設定しなければならない 🔵 *requirements.md 3.2節より*
- REQ-021: システムは Frontend と Backend を別々の ECS Service として構成しなければならない 🔵 *ユーザヒアリングより*

#### データベース (Aurora RDS)

- REQ-022: システムは Amazon Aurora MySQL Serverless v2 を使用しなければならない 🔵 *ユーザヒアリングより*
- REQ-023: システムは Aurora を Private DB Subnet に配置しなければならない 🔵 *requirements.md 3.3節より*
- REQ-024: システムは Aurora の Security Group で外部（インターネット）からの直接アクセスを遮断しなければならない 🔵 *requirements.md 3.3節より*
- REQ-025: システムは Aurora の Security Group で ECS Fargate Security Group からの 3306 ポートアクセスのみ許可しなければならない 🔵 *requirements.md 3.3節より*
- REQ-026: システムは Aurora の Storage Encryption を有効化しなければならない 🔵 *requirements.md 3.3節より*
- REQ-027: システムは Aurora の自動バックアップ機能を使用しなければならない 🔵 *ユーザヒアリングより*

#### セキュリティ & ロードバランシング

- REQ-028: システムは ALB を Public Subnet に配置し、Internet-facing で設定しなければならない 🔵 *requirements.md 3.4節より*
- REQ-029: システムは ALB で HTTP(80) リクエストを HTTPS(443) にリダイレクトしなければならない 🔵 *requirements.md 3.4節より*
- REQ-030: システムは ACM (AWS Certificate Manager) で SSL 証明書を管理しなければならない 🔵 *ユーザヒアリングより*
- REQ-031: システムは 静的リソース及び Sorry Page 提供用の S3 バケットを作成しなければならない 🔵 *requirements.md 3.4節より*
- REQ-032: システムは OAC (Origin Access Control) を構成し、S3 バケットが CloudFront を通じてのみアクセス可能にしなければならない 🔵 *requirements.md 3.4節より*
- REQ-033: システムは WAF を CloudFront に接続しなければならない 🔵 *ユーザヒアリングより*
- REQ-034: システムは WAF で AWS Managed Rules (Common RuleSet, SQL Injection 等) を適用しなければならない 🔵 *requirements.md 3.4節より*

#### モニタリング & 運用

- REQ-035: システムは ECS、RDS、VPC Flow Log 等のログを CloudWatch Logs に収集しなければならない 🔵 *requirements.md 3.5節より*
- REQ-036: システムは Dev 環境でログ保持期間を 1-3 日に設定しなければならない 🔵 *requirements.md 3.5節より*
- REQ-037: システムは Prod 環境でログ保持期間を 15-30 日に設定しなければならない 🔵 *requirements.md 3.5節より*
- REQ-038: システムは Prod 環境でログを S3 Glacier に長期保存しなければならない 🔵 *ユーザヒアリングより*
- REQ-039: システムは CloudWatch Alarm 発生時に AWS Chatbot を通じて Slack に通知しなければならない 🔵 *requirements.md 3.5節より*

#### CI/CD

- REQ-040: システムは CI/CD パイプラインを構築しなければならない 🔵 *ユーザヒアリングより*
- REQ-041: システムは CodePipeline / CodeBuild を使用して自動デプロイを実現しなければならない 🟡 *requirements.md・ユーザヒアリングから妥当な推測*

#### 環境構成

- REQ-042: システムは Dev 環境と Prod 環境の 2 環境を構成しなければならない 🔵 *ユーザヒアリングより*
- REQ-043: システムは CloudFront/ALB のデフォルトドメインを使用しなければならない（カスタムドメイン不使用） 🔵 *ユーザヒアリングより*

---

### 条件付き要件

- REQ-101: Prod 環境の場合、システムはログを 30 日後に S3 Glacier へ移管しなければならない 🔵 *ユーザヒアリングより*
- REQ-102: Dev 環境の場合、システムはログを 3 日後に削除しなければならない 🔵 *requirements.md 3.5節より*
- REQ-103: CloudWatch Alarm が発生した場合、システムは Slack に通知を送信しなければならない 🔵 *requirements.md 3.5節より*

---

### 状態要件

- REQ-201: ECS Service が起動している状態の場合、システムは Desired Count を維持しなければならない 🟡 *requirements.md 3.2節から妥当な推測*
- REQ-202: Aurora が停止している状態の場合、システムは自動的に再起動しなければならない 🟡 *高可用性要件から妥当な推測*

---

### オプション要件

- REQ-301: システムは Python Lambda 関数でカスタムアラートやログ後処理を行ってもよい 🔵 *requirements.md 3.5節より*
- REQ-302: システムは ECS Auto Scaling を設定してもよい 🟡 *高可用性要件から妥当な推測*

---

### 制約要件

- REQ-401: システムは AWS CDK v2 (TypeScript) を使用しなければならない 🔵 *requirements.md 2節より*
- REQ-402: システムは Lambda 関数に Python 3.x を使用しなければならない 🔵 *requirements.md 2節より*
- REQ-403: システムは ap-northeast-1 (Tokyo) リージョンにデプロイしなければならない 🔵 *requirements.md 2節より*
- REQ-404: システムは外部から Aurora への直接アクセスを禁止しなければならない 🔵 *requirements.md 3.3節より*
- REQ-405: システムは VPC Endpoint 経由で AWS サービスにアクセスしなければならない 🔵 *requirements.md 3.1節より*

---

## 非機能要件

### パフォーマンス

- NFR-001: システムは Multi-AZ 構成により高可用性を維持しなければならない 🔵 *requirements.md 3.1節より*
- NFR-002: システムは VPC Endpoint 使用によりレイテンシを最適化しなければならない 🔵 *requirements.md 3.1節より*
- NFR-003: システムは NAT Gateway を各 AZ に配置して可用性を確保しなければならない 🔵 *requirements.md 3.1節より*
- NFR-004: システムは ECS Service の Desired Count 2 以上で可用性を確保しなければならない 🔵 *requirements.md 3.2節より*

### セキュリティ

- NFR-101: システムは VPC Endpoint を使用してトラフィックを AWS ネットワーク内に閉じなければならない 🔵 *requirements.md 3.1節より*
- NFR-102: システムは Storage Encryption を有効化してデータを暗号化しなければならない 🔵 *requirements.md 3.3節より*
- NFR-103: システムは WAF を適用して Web アプリケーションを保護しなければならない 🔵 *requirements.md 3.4節より*
- NFR-104: システムは OAC を使用して S3 バケットへの直接アクセスを防止しなければならない 🔵 *requirements.md 3.4節より*
- NFR-105: システムは HTTPS を強制しなければならない 🔵 *requirements.md 3.4節より*

### コスト最適化

- NFR-201: システムは VPC Endpoint を使用して NAT Gateway 費用を削減しなければならない 🔵 *requirements.md 3.1節より*
- NFR-202: システムは Aurora Serverless v2 を使用してコスト効率を最適化しなければならない 🔵 *ユーザヒアリングより*

### 運用性

- NFR-301: システムは Container Insights を有効化してモニタリング可能にしなければならない 🔵 *requirements.md 3.2節より*
- NFR-302: システムは ECS Exec を有効化して運用操作を可能にしなければならない 🔵 *requirements.md 3.2節より*
- NFR-303: システムは Sidecar パターンを使用してセキュアな DB 接続を可能にしなければならない 🔵 *requirements.md 3.2節より*

---

## Edge ケース

### エラー処理

- EDGE-001: NAT Gateway が障害した場合、他の AZ の NAT Gateway にフェイルオーバーしなければならない 🟡 *Multi-AZ構成から妥当な推測*
- EDGE-002: ECS タスクが失敗した場合、自動的に新しいタスクを起動しなければならない 🟡 *ECS Service特性から妥当な推測*
- EDGE-003: Aurora ライターインスタンスが障害した場合、自動フェイルオーバーしなければならない 🟡 *Aurora Multi-AZ特性から妥当な推測*

### 境界値

- EDGE-101: VPC CIDR の IP アドレスが枯渇した場合の対応を検討しなければならない 🔴 *推測による要件*
- EDGE-102: ECS タスクのメモリ使用量が上限に達した場合の動作を定義しなければならない 🔴 *推測による要件*
- EDGE-103: CloudWatch Logs の保持期間を超えたログの扱いを定義しなければならない 🔵 *requirements.md 3.5節より*

---

## 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 52 | 88% |
| 🟡 黄信号 | 5 | 9% |
| 🔴 赤信号 | 2 | 3% |

**品質評価**: ✅ 高品質 - 要件の大部分が元要件書・ユーザヒアリングにより確認済み
