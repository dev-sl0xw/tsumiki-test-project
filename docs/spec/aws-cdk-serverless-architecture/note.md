# aws-cdk-serverless-architecture 開発コンテキストノート

## 作成日時
2026-01-12

## プロジェクト概要

### プロジェクト名
tsumiki-test-project (AWS CDK Serverless Architecture)

### プロジェクトの目的
AWS CDK (Cloud Development Kit) を使用して、**高可用性 (High Availability)** と**セキュリティ (Security)** が強化されたサーバーレス Web サービスアーキテクチャを構築する。

主な特徴:
- ECS Fargate, Aurora RDS, CloudFront, ALB 等を含むインフラ構築
- **Sidecar パターン**を通じたセキュア接続
- **VPC Endpoint** を通じた内部通信最適化

**参照元**: `README.md`, `requirements.md`

## 技術スタック

### 使用技術・フレームワーク
- **IaC**: AWS CDK v2 (TypeScript)
- **ランタイムロジック**: Python 3.x (Lambda関数用)
- **ターゲットリージョン**: ap-northeast-1 (Tokyo)

### アーキテクチャパターン
- **アーキテクチャスタイル**: サーバーレス / コンテナベース (ECS Fargate)
- **設計パターン**: Sidecar パターン、Multi-AZ 構成
- **ディレクトリ構造** (推奨):
  ```
  my-project/
  ├── bin/               # CDK App エントリーポイント (TS)
  ├── lib/               # CDK Stacks 定義 (TS)
  │   ├── construct/     # 再利用可能なコンストラクト
  │   └── stack/         # スタック定義
  ├── lambda/            # Lambda関数コード (Python)
  │   ├── log_processor/
  │   │   └── index.py
  │   └── custom_resource/
  │       └── index.py
  ├── test/              # テスト
  ├── parameter.ts       # 環境別パラメータ
  ├── cdk.json
  └── package.json
  ```

**参照元**: `requirements.md`

## 開発ルール

### プロジェクト固有のルール
- インフラリソース定義、スタック構成、デプロイパイプラインは TypeScript を使用
- Lambda関数 (Custom Resource, Log Processing, 運用自動化スクリプト等) は Python を使用
- CLAUDE.md の AWS CDK ワークスペースガイドラインに従う

### コーディング規約
- **命名規則**: ケバブケース (kebab-case) でリソース名を定義
- **型チェック**: TypeScript strict mode 推奨
- **フォーマット**: ESLint, Prettier 使用推奨
- **コメント**: 日本語または英語で機能説明を記載

### テスト要件
- **テストフレームワーク**: Jest (スナップショットテスト)
- **テストパターン**: CDK スナップショットテスト
- **テスト実行**: `npm test`、変更時は `npm test -- -u` でスナップショット更新

**参照元**: ワークスペース CLAUDE.md

## 既存の要件定義

### 要件定義書
`requirements.md` に詳細な要件が定義されている。

**参照元**: `requirements.md`

### 主要な機能要件

#### 3.1. ネットワーク (VPC & Networking)
- **VPC構成**: CIDR Block `10.0.0.0/16`
- **Multi-AZ**: 2つの可用性ゾーン (ap-northeast-1a, ap-northeast-1c)
- **サブネット**:
  - Public Subnet: ALB, NAT Gateway 用 (`/24` - 256 IPs)
  - Private App Subnet: ECS Fargate ワークロード用 (`/23` - 512 IPs)
  - Private DB Subnet: Aurora RDS 用 (`/24` - 256 IPs)
- **ゲートウェイ**:
  - Internet Gateway 1個
  - NAT Gateway 各AZ 1個ずつ (計2個)
- **VPC Endpoints**:
  - Systems Manager (ssm, ssmmessages, ec2messages)
  - ECR (ecr.api, ecr.dkr)
  - CloudWatch Logs (logs)
  - S3 (Gateway Endpoint)

#### 3.2. コンピューティング (ECS Fargate)
- **Cluster**: Fargate専用、Container Insights 有効化
- **Task Definition**:
  - CPU/Memory: ワークロードに応じて設定 (例: 1 vCPU, 2GB)
  - **Sidecar パターン実装**:
    1. App Container: アプリケーション
    2. Bastion/Sidecar Container: Alpine軽量イメージ、socat でポートフォワーディング
- **IAM Role**: Task Role に `AmazonSSMManagedInstanceCore` 権限付与
- **Service**: `enableExecuteCommand: true`、Desired Count 2以上

#### 3.3. データベース (Aurora RDS)
- **Engine**: Amazon Aurora MySQL (Serverless v2 または Provisioned)
- **Network**: Private DB Subnet に配置
- **Security Group**: ECS Fargate SG からの 3306 ポートのみ許可
- **暗号化**: Storage Encryption 有効化

#### 3.4. セキュリティ & ロードバランシング
- **ALB**: Public Subnet、Internet-facing、HTTP→HTTPS リダイレクト
- **CloudFront + S3**: 静的リソース配信、OAC 構成
- **WAF**: CloudFront または ALB に接続、AWS Managed Rules 適用

#### 3.5. モニタリング & 運用
- **CloudWatch Logs**: ECS, RDS, VPC Flow Log 収集
- **Log Retention**: Dev 1-3日、Prod 15-30日後 Glacier/削除
- **AWS Chatbot & Lambda**: Slack アラート通知

### 主要な非機能要件
- NFR-001: 高可用性 - Multi-AZ 構成、Desired Count 2以上
- NFR-002: セキュリティ - VPC Endpoint 使用、Storage Encryption、WAF 適用
- NFR-003: コスト最適化 - VPC Endpoint によるNAT費用削減

## 既存の設計文書

### アーキテクチャ設計
現時点で設計文書は未作成。

### 実装ステップ (要件定義書より)
1. **Init Project**: `cdk init app --language typescript`、`lambda/` ディレクトリ作成
2. **VPC Stack**: ネットワーク層 (VPC, Subnet, IGW, NAT, Endpoints)
3. **Security Stack**: Security Group, IAM Role
4. **Database Stack**: Aurora RDS、Secret 生成
5. **Application Stack**: ALB, ECS Cluster, Task Definition (Sidecar含む), Service
6. **Distribution & Ops Stack**: S3, CloudFront, WAF, Chatbot, Python Lambda Functions

## 関連実装

### 類似機能の実装例
- ワークスペース内の `baseline-environment-on-aws` (BLEA) プロジェクトを参照可能
- `blea-guest-ecs-app-sample`: ECS/Fargate Web App サンプル
- `blea-guest-serverless-api-sample`: Serverless API サンプル

### 共通モジュール・ユーティリティ
- BLEA の共通パターンを参考にできる
- Parameter パターン: `parameter.ts` で環境設定を管理

## 技術的制約

### パフォーマンス制約
- ECS Fargate のスケーリング設定
- Aurora Serverless v2 のスケーリング設定

### セキュリティ制約
- 外部からの DB 直接アクセス禁止
- VPC Endpoint 経由での AWS サービスアクセス
- WAF による Web アプリケーション保護
- Storage Encryption 必須

### 互換性制約
- AWS CDK v2 使用
- ap-northeast-1 リージョン限定

### データ制約
- CloudWatch Logs の保持期間制限 (環境別)

## 注意事項

### 開発時の注意点
- CDK コマンドは `npx` を使用してワークスペースローカルバージョンを確保
- `parameter.ts` を編集してから デプロイ（認証情報をハードコードしない）
- スナップショットテストの更新を忘れずに

### デプロイ・運用時の注意点
- Bootstrap は アカウント/リージョン ごとに1回実行
- AWS Chatbot 設定前に Slack ワークスペース・チャンネル設定が必要
- プライベートチャンネルでは @AWS bot の招待が必要

### セキュリティ上の注意点
- ルートユーザーの MFA 有効化 (CRITICAL)
- IMDSv2 設定
- Security Hub findings の手動修正が必要な場合あり

### パフォーマンス上の注意点
- NAT Gateway は AZ ごとに配置（高可用性のため）
- VPC Endpoint でコスト・レイテンシ最適化

## Git情報

### 現在のブランチ
main

### 最近のコミット
```
a3f064d delete: reset
d3d9142 feat: requirements
b7aff45 Initial commit
```

### 開発状況
- クリーンな状態（requirements.md は未コミット）
- 新規プロジェクト、CDK 初期化前

## 収集したファイル一覧

### プロジェクト基本情報
- `README.md` - プロジェクト概要
- `requirements.md` - 詳細要件定義

### 追加ルール
- ワークスペース `CLAUDE.md` - AWS CDK 開発ガイドライン

### 要件定義・仕様書
- `requirements.md` - 統合要件定義書

### 設計文書
- （未作成）

### 関連実装（参考）
- `baseline-environment-on-aws/usecases/blea-guest-ecs-app-sample/`
- `baseline-environment-on-aws/usecases/blea-guest-serverless-api-sample/`

---

**注意**: すべてのファイルパスはプロジェクトルートからの相対パスで記載しています。
