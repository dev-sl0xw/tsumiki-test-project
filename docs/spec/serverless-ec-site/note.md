# Kairo Context Note: serverless-ec-site

## 要件名

外部からHTTP/HTTPS通信を許可するOSI Layer 7階層のServerless基盤のECサイト

## プロジェクト概要

- **プロジェクトタイプ**: Tsumikiフレームワークを使用したAWSアーキテクチャテスト用プロジェクト
- **現状**: 新規プロジェクト（コードベースはまだなし）
- **リポジトリ**: `/Volumes/data/aws-workspace/tsumiki-test-project`
- **ブランチ**: main

---

## 有効化されているMCPサーバー

| MCPサーバー | 説明 |
|------------|------|
| `awslabs.core-mcp-server` | AWS CDK コアガイダンス |
| `awslabs.cdk-mcp-server` | CDK Solutions Constructs、CDK Nag、GenAI構築支援 |
| `awslabs.frontend-mcp-server` | フロントエンド（React）開発支援 |

---

## 技術スタック

### インフラストラクチャ

| カテゴリ | 技術 | 備考 |
|---------|------|------|
| IaC | AWS CDK (TypeScript) | CLAUDE.mdより |
| 言語 | TypeScript | CDKプロジェクト標準 |
| ランタイム | Node.js | Lambda実行環境 |

### サーバーレス基盤（推定）

| レイヤー | AWSサービス | 用途 |
|---------|------------|------|
| CDN | Amazon CloudFront | HTTPSエンドポイント、静的コンテンツ配信 |
| WAF | AWS WAF | Layer 7セキュリティ、DDoS対策 |
| API | Amazon API Gateway | REST API、HTTPSエンドポイント |
| 認証 | Amazon Cognito | ユーザー認証・認可 |
| コンピュート | AWS Lambda | ビジネスロジック実行 |
| データベース | Amazon DynamoDB | 商品・注文データ管理 |
| ストレージ | Amazon S3 | 静的アセット、商品画像 |

### フロントエンド（推定）

| カテゴリ | 技術 | 備考 |
|---------|------|------|
| フレームワーク | React | frontend-mcp-serverより |
| ホスティング | CloudFront + S3 | SPA配信 |

---

## 利用可能なAWS Solutions Constructs

### ECサイト向け推奨パターン

#### フロントエンド配信

| パターン名 | サービス構成 | 用途 |
|-----------|-------------|------|
| `aws-cloudfront-s3` | CloudFront + S3 (OAC) | SPAホスティング |
| `aws-wafwebacl-cloudfront` | WAF + CloudFront | セキュリティ強化 |

#### API層

| パターン名 | サービス構成 | 用途 |
|-----------|-------------|------|
| `aws-cloudfront-apigateway-lambda` | CloudFront + API Gateway + Lambda | APIエンドポイント |
| `aws-cognito-apigateway-lambda` | Cognito + API Gateway + Lambda | 認証付きAPI |
| `aws-wafwebacl-apigateway` | WAF + API Gateway | API保護 |

#### データ層

| パターン名 | サービス構成 | 用途 |
|-----------|-------------|------|
| `aws-lambda-dynamodb` | Lambda + DynamoDB | 商品・注文データ操作 |
| `aws-dynamodbstreams-lambda` | DynamoDB Streams + Lambda | イベント駆動処理 |
| `aws-lambda-s3` | Lambda + S3 | 画像処理・ファイル操作 |

---

## アーキテクチャ概要図

```
                    Internet
                        |
                   [AWS WAF]
                        |
                 [CloudFront]
                   /        \
                  /          \
           [S3 Bucket]    [API Gateway]
           (静的サイト)        |
                         [Cognito]
                              |
                         [Lambda]
                          /    \
                         /      \
                  [DynamoDB]  [S3 Bucket]
                  (データ)    (アセット)
```

---

## ECサイト機能要件（推定）

### 基本機能

- 商品一覧表示
- 商品詳細表示
- 商品検索
- カート機能
- 注文処理
- ユーザー認証

### OSI Layer 7 (アプリケーション層) 対応

- HTTP/HTTPSプロトコル対応
- RESTful API設計
- WAFによるアプリケーション層保護
  - SQLインジェクション対策
  - XSS対策
  - レートリミット
- SSL/TLS終端（CloudFront）

---

## CDK Nag セキュリティ考慮事項

### 重要なルールカテゴリ

| カテゴリ | 対象 |
|---------|------|
| AwsSolutions-IAM | Lambda実行ロールの最小権限 |
| AwsSolutions-S3 | S3バケットの暗号化・アクセス制御 |
| AwsSolutions-DDB | DynamoDBの暗号化・バックアップ |
| AwsSolutions-APIG | API Gatewayの認証・ログ設定 |
| AwsSolutions-CFR | CloudFrontのセキュリティヘッダー |
| AwsSolutions-COG | Cognitoのパスワードポリシー |

---

## 開発コマンド（CLAUDE.mdより）

```bash
# プロジェクト初期化
cdk init app --language typescript

# 依存関係インストール
npm install

# CloudFormation合成（検証）
cdk synth

# デプロイ
cdk deploy --profile <aws-profile>

# 差分確認
cdk diff

# 削除
cdk destroy
```

---

## 参考リソース

### AWS Solutions Constructs ドキュメント

- `aws-solutions-constructs://aws-cloudfront-s3`
- `aws-solutions-constructs://aws-cloudfront-apigateway-lambda`
- `aws-solutions-constructs://aws-cognito-apigateway-lambda`
- `aws-solutions-constructs://aws-lambda-dynamodb`
- `aws-solutions-constructs://aws-wafwebacl-cloudfront`
- `aws-solutions-constructs://aws-wafwebacl-apigateway`

### CDK関連

- CDK General Guidance: `mcp__awslabs_cdk-mcp-server__CDKGeneralGuidance`
- Lambda Powertools: `lambda-powertools://cdk`
- CDK Nag: `mcp__awslabs_cdk-mcp-server__ExplainCDKNagRule`

### フロントエンド

- React Essential Knowledge: `mcp__awslabs_frontend-mcp-server__GetReactDocsByTopic(topic="essential-knowledge")`
- React Troubleshooting: `mcp__awslabs_frontend-mcp-server__GetReactDocsByTopic(topic="troubleshooting")`

---

## 次のステップ

1. **要件定義**: `/tsumiki:kairo-requirements` で詳細な要件定義書を作成
2. **技術設計**: `/tsumiki:kairo-design` で技術設計書を作成
3. **タスク分割**: `/tsumiki:kairo-tasks` で実装タスクを分割
4. **実装**: `/tsumiki:kairo-implement` でTDD駆動開発を実施

---

## 作成情報

- **作成日**: 2026-01-11
- **作成者**: Claude Code (Kairo Tasknote)
- **バージョン**: 1.0
