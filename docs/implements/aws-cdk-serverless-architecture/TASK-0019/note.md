# TASK-0019: CloudFront Construct 実装 - TDD 開発ノート

**タスクID**: TASK-0019
**タスクタイプ**: TDD
**作成日**: 2026-02-03
**フェーズ**: Phase 4 - 配信・運用

---

## 1. 技術スタック

### 使用技術・フレームワーク

| カテゴリ | 技術 | バージョン |
|----------|------|------------|
| IaC | AWS CDK | v2 (TypeScript) |
| クラウド | AWS CloudFront | - |
| テスト | Jest + aws-cdk-lib/assertions | - |
| 言語 | TypeScript | - |

### アーキテクチャパターン

- **パターン**: Multi-Origin CloudFront Distribution
- **Origin 構成**:
  - S3 Origin: 静的コンテンツ (OAC 経由) - TASK-0018 で作成
  - ALB Origin: 動的コンテンツ (API) - TASK-0016 で作成

### 参照元

- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

---

## 2. 開発ルール

### プロジェクト固有のルール

1. **TDD サイクル**: Red → Green → Refactor の順序を厳守
2. **信頼性レベル表示**: コメントに 🔵/🟡/🔴 で信頼性を明示
3. **定数定義**: マジックナンバーは定数として抽出
4. **Props バリデーション**: 入力パラメータの検証を実施

### コーディング規約

- ファイルヘッダーにタスクID、フェーズ、機能概要を記載
- 各セクションに `========` 区切りコメントを追加
- JSDoc 形式でドキュメントを記述

### 参照元

- `infra/lib/construct/storage/s3-bucket-construct.ts` (実装パターン参照)
- `infra/lib/construct/alb/alb-construct.ts` (実装パターン参照)
- `infra/test/construct/storage/s3-bucket-construct.test.ts` (テストパターン参照)

---

## 3. 関連実装

### 依存タスク

| タスク | 説明 | 状態 | 関連ファイル |
|--------|------|------|--------------|
| TASK-0018 | S3 + OAC Construct | ✅ 完了 | `infra/lib/construct/storage/s3-bucket-construct.ts` |
| TASK-0016 | ALB Construct | ✅ 完了 | `infra/lib/construct/alb/alb-construct.ts` |
| TASK-0011 | WAF Construct | ✅ 完了 | `infra/lib/construct/security/waf-construct.ts` |

### 類似機能の実装パターン

#### S3BucketConstruct (参考パターン)

```typescript
// 構成パターン:
// 1. 定数定義 (デフォルト値、エラーメッセージ)
// 2. Props インターフェース定義
// 3. Construct クラス
//    - 公開プロパティ
//    - コンストラクタ (バリデーション → パラメータ解凍 → リソース作成)
//    - プライベートメソッド (バリデーション、ヘルパー)
```

#### AlbConstruct (参考パターン)

```typescript
// ALB Origin 参照用のプロパティ:
// - loadBalancer: elb.IApplicationLoadBalancer
// - dnsName: string (CloudFront Origin 設定で使用)
```

### 参照元

- `infra/lib/construct/storage/s3-bucket-construct.ts`
- `infra/lib/construct/alb/alb-construct.ts`
- `infra/test/construct/storage/s3-bucket-construct.test.ts`
- `infra/test/construct/alb/alb-construct.test.ts`

---

## 4. 設計文書

### CloudFront 設定仕様

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| priceClass | PriceClass.PRICE_CLASS_200 | 日本を含むリージョン (REQ-032) |
| defaultRootObject | index.html | 静的サイト配信 |
| viewerProtocolPolicy | REDIRECT_TO_HTTPS | HTTPS 強制 (NFR-105) |
| httpVersion | HTTP2_AND_3 | パフォーマンス最適化 |

### Origin 設定仕様

| Origin | タイプ | Behavior | Cache Policy |
|--------|--------|----------|--------------|
| S3 | S3BucketOrigin (OAC) | `/static/*`, `/assets/*` | CACHING_OPTIMIZED |
| ALB | HttpOrigin | `/api/*`, Default | CACHING_DISABLED |

### エラーページ設定 (REQ-031)

| HTTP Status | Response Code | Response Page | TTL |
|-------------|---------------|---------------|-----|
| 403 | 200 | /error.html | 10s |
| 404 | 200 | /error.html | 10s |
| 500 | 200 | /error.html | 0s |
| 502 | 200 | /error.html | 0s |
| 503 | 200 | /error.html | 0s |
| 504 | 200 | /error.html | 0s |

### 参照元

- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md` (REQ-032, REQ-043)
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0019.md`

---

## 5. 注意事項

### 技術的制約

1. **OAC 設定**: S3 Origin は必ず OAC (Origin Access Control) 経由でアクセス
2. **カスタムドメイン不使用**: CloudFront デフォルトドメインを使用 (REQ-043)
3. **WAF 連携**: WAF は別途 Distribution Stack で CloudFront に適用

### セキュリティ要件

- **HTTPS 強制**: viewerProtocolPolicy を REDIRECT_TO_HTTPS に設定 (NFR-105)
- **OAC 使用**: S3 バケットへの直接アクセス防止 (NFR-104)

### パフォーマンス要件

- **HTTP/2 and HTTP/3**: httpVersion を HTTP2_AND_3 に設定
- **キャッシュ最適化**: 静的コンテンツは CACHING_OPTIMIZED、API は CACHING_DISABLED

### 循環参照対応

S3BucketConstruct で OAC を作成し、CloudFrontConstruct で Distribution を作成後に、
S3BucketConstruct.addCloudFrontBucketPolicy() でバケットポリシーを追加する。

```
S3BucketConstruct 作成
    ↓
CloudFrontConstruct 作成 (S3 Bucket + OAC を参照)
    ↓
S3BucketConstruct.addCloudFrontBucketPolicy(distribution.distributionArn) 呼び出し
```

### 参照元

- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `infra/lib/construct/storage/s3-bucket-construct.ts` (循環参照対応パターン)

---

## 6. 実装ファイル構成

### 作成予定ファイル

| ファイル | 説明 |
|----------|------|
| `infra/lib/construct/distribution/cloudfront-construct.ts` | CloudFront Construct 実装 |
| `infra/test/construct/distribution/cloudfront-construct.test.ts` | テストケース |

### 公開プロパティ (予定)

| プロパティ | 型 | 用途 |
|------------|-----|------|
| distribution | cloudfront.IDistribution | Distribution 参照 |
| distributionArn | string | S3 バケットポリシー設定 |
| distributionDomainName | string | DNS 設定、動作確認 |
| distributionId | string | キャッシュ無効化 |

---

## 7. テストケース概要

### 予定テストケース

| カテゴリ | テストケース数 | 説明 |
|----------|----------------|------|
| Distribution 作成 | 5 | 基本設定、Price Class、HTTP Version |
| S3 Origin (OAC) | 5 | OAC 設定、Behavior、Cache Policy |
| ALB Origin | 4 | Origin 設定、Behavior、Cache Policy |
| エラーページ | 3 | カスタムエラーレスポンス |
| バリデーション | 4 | Props 検証 |
| プロパティ | 4 | 公開プロパティ確認 |
| スナップショット | 1 | CloudFormation テンプレート |

**予想テスト数**: 約 26 テストケース

---

## 8. TDD 実装手順

1. `/tsumiki:tdd-requirements` - 詳細要件定義
2. `/tsumiki:tdd-testcases` - テストケース作成
3. `/tsumiki:tdd-red` - テスト実装（失敗）
4. `/tsumiki:tdd-green` - 最小実装
5. `/tsumiki:tdd-refactor` - リファクタリング
6. `/tsumiki:tdd-verify-complete` - 品質確認

---

*このノートは TDD 開発の参照資料として使用されます*
