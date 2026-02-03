# TASK-0019: CloudFront Construct 実装 - TDD 要件定義書

**タスクID**: TASK-0019
**機能名**: CloudFront Construct
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-03
**フェーズ**: Phase 4 - 配信・運用
**信頼性レベル**: 🔵 (100% 青信号)

---

## 1. 機能の概要

### 1.1 概要説明 🔵

**何をする機能か**:
CloudFront Distribution を作成し、S3 Origin (OAC 経由) と ALB Origin を構成する CDK Construct。
高性能なコンテンツ配信とキャッシング機能を提供し、HTTPS 強制によるセキュアな通信を実現する。

**どのような問題を解決するか**:
- 静的コンテンツ (S3) と動的コンテンツ (ALB/ECS) の統合配信
- グローバルエッジロケーションによるレイテンシ最適化
- Origin への直接アクセス防止によるセキュリティ向上
- エラー発生時の Sorry Page 表示

**想定されるユーザー**:
- インフラ担当者 (CDK Stack 構築)
- 運用担当者 (キャッシュ無効化、動作確認)

**システム内での位置づけ**:
```
VPC Stack → Security Stack → Application Stack → Distribution Stack
                                                     ↓
                                              CloudFrontConstruct ← 本 Construct
                                                 ├── S3 Origin (OAC)
                                                 └── ALB Origin
```

**参照した EARS 要件**: REQ-032, REQ-043, NFR-104, NFR-105
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` (CloudFront セクション)

---

## 2. 入力・出力の仕様

### 2.1 入力パラメータ (Props) 🔵

#### 必須パラメータ

| パラメータ名 | 型 | 説明 | 制約 | 信頼性 |
|-------------|-----|------|------|--------|
| `s3Bucket` | `s3.IBucket` | 静的コンテンツ用 S3 バケット | TASK-0018 で作成 | 🔵 |
| `originAccessControl` | `cloudfront.CfnOriginAccessControl` | S3 OAC | TASK-0018 で作成 | 🔵 |
| `alb` | `elb.IApplicationLoadBalancer` | ALB | TASK-0016 で作成 | 🔵 |
| `envName` | `string` | 環境名 | 1-20文字、小文字英数字とハイフン | 🔵 |

#### オプションパラメータ

| パラメータ名 | 型 | デフォルト値 | 説明 | 信頼性 |
|-------------|-----|--------------|------|--------|
| `priceClass` | `cloudfront.PriceClass` | `PRICE_CLASS_200` | 価格クラス (日本含む) | 🔵 |
| `defaultRootObject` | `string` | `'index.html'` | デフォルトルートオブジェクト | 🟡 |
| `httpVersion` | `cloudfront.HttpVersion` | `HTTP2_AND_3` | HTTP バージョン | 🟡 |
| `enableErrorPages` | `boolean` | `true` | エラーページ有効化 | 🔵 |
| `errorPagePath` | `string` | `'/error.html'` | エラーページパス | 🟡 |
| `staticAssetPaths` | `string[]` | `['/static/*', '/assets/*']` | 静的アセットパス | 🟡 |
| `apiPaths` | `string[]` | `['/api/*']` | API パス | 🟡 |

### 2.2 出力プロパティ 🔵

| プロパティ名 | 型 | 説明 | 用途 | 信頼性 |
|-------------|-----|------|------|--------|
| `distribution` | `cloudfront.IDistribution` | CloudFront Distribution | 参照 | 🔵 |
| `distributionArn` | `string` | Distribution ARN | S3 バケットポリシー設定 | 🔵 |
| `distributionDomainName` | `string` | Distribution ドメイン名 | アクセス URL | 🔵 |
| `distributionId` | `string` | Distribution ID | キャッシュ無効化 | 🔵 |

### 2.3 データフロー 🔵

```
ユーザーリクエスト
    ↓
CloudFront Distribution
    ├── /static/*, /assets/* → S3 Origin (OAC) → S3 Bucket
    ├── /api/* → ALB Origin → ALB → ECS Service
    └── Default → ALB Origin → ALB → ECS Service
    ↓
エラー発生時 → Custom Error Response → S3 Bucket (error.html)
```

**参照した EARS 要件**: REQ-032, REQ-031
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 3. 制約条件

### 3.1 パフォーマンス要件 🔵

| 要件 | 設定値 | 根拠 | 信頼性 |
|------|--------|------|--------|
| HTTP Version | HTTP/2 and HTTP/3 | パフォーマンス最適化 | 🟡 |
| Price Class | PRICE_CLASS_200 | 日本を含むリージョン | 🔵 |
| S3 Cache Policy | CACHING_OPTIMIZED | 静的コンテンツ最適化 | 🔵 |
| ALB Cache Policy | CACHING_DISABLED | 動的コンテンツ | 🔵 |

**参照した EARS 要件**: NFR-002

### 3.2 セキュリティ要件 🔵

| 要件 | 設定値 | 根拠 | 信頼性 |
|------|--------|------|--------|
| Viewer Protocol Policy | REDIRECT_TO_HTTPS | HTTPS 強制 | 🔵 |
| S3 Origin Access | OAC (Origin Access Control) | 直接アクセス防止 | 🔵 |
| ALB Origin Protocol | HTTPS | セキュア通信 | 🔵 |

**参照した EARS 要件**: NFR-104, NFR-105

### 3.3 アーキテクチャ制約 🔵

| 制約 | 内容 | 根拠 | 信頼性 |
|------|------|------|--------|
| カスタムドメイン | 不使用 | REQ-043 | 🔵 |
| WAF 連携 | Distribution Stack で適用 | REQ-033 | 🔵 |
| OAC 署名 | sigv4、always | REQ-032 | 🔵 |
| リージョン | グローバル (us-east-1 不要) | CloudFront 仕様 | 🔵 |

**参照した EARS 要件**: REQ-032, REQ-033, REQ-043

### 3.4 Props バリデーション 🟡

| パラメータ | バリデーション | エラーメッセージ |
|-----------|---------------|------------------|
| `envName` | 空文字チェック | `envName は必須です。空文字列は指定できません。` |
| `envName` | 長さチェック (≤20) | `envName は 20 文字以下である必要があります。` |
| `envName` | 形式チェック | `envName は小文字英数字とハイフンのみで構成されます。` |
| `s3Bucket` | null チェック | `s3Bucket は必須です。` |
| `originAccessControl` | null チェック | `originAccessControl は必須です。` |
| `alb` | null チェック | `alb は必須です。` |

**参照した設計文書**: `infra/lib/construct/storage/s3-bucket-construct.ts` (バリデーションパターン)

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン 🔵

```typescript
// S3BucketConstruct (TASK-0018) からの参照
const s3Construct = new S3BucketConstruct(this, 'S3Bucket', {
  envName: 'dev',
});

// AlbConstruct (TASK-0016) からの参照
const albConstruct = new AlbConstruct(this, 'Alb', {
  vpc: vpcConstruct.vpc,
  securityGroup: securityGroupConstruct.albSecurityGroup,
  certificateArn: 'arn:aws:acm:...',
});

// CloudFrontConstruct の作成
const cloudfrontConstruct = new CloudFrontConstruct(this, 'CloudFront', {
  envName: 'dev',
  s3Bucket: s3Construct.bucket,
  originAccessControl: s3Construct.originAccessControl,
  alb: albConstruct.loadBalancer,
});

// S3 バケットポリシーの追加（循環参照解決）
s3Construct.addCloudFrontBucketPolicy(cloudfrontConstruct.distributionArn);
```

**参照した EARS 要件**: REQ-032

### 4.2 カスタム設定パターン 🟡

```typescript
const cloudfrontConstruct = new CloudFrontConstruct(this, 'CloudFront', {
  envName: 'prod',
  s3Bucket: s3Construct.bucket,
  originAccessControl: s3Construct.originAccessControl,
  alb: albConstruct.loadBalancer,
  // カスタム設定
  priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
  staticAssetPaths: ['/static/*', '/assets/*', '/images/*'],
  apiPaths: ['/api/*', '/graphql/*'],
  errorPagePath: '/sorry.html',
});
```

### 4.3 エッジケース 🔵

| ケース | 期待動作 | 信頼性 |
|--------|----------|--------|
| S3 Origin 403 エラー | error.html を返却 (HTTP 200) | 🔵 |
| S3 Origin 404 エラー | error.html を返却 (HTTP 200) | 🔵 |
| ALB Origin 500 エラー | error.html を返却 (HTTP 200) | 🔵 |
| ALB Origin 502 エラー | error.html を返却 (HTTP 200) | 🔵 |
| ALB Origin 503 エラー | error.html を返却 (HTTP 200) | 🔵 |
| ALB Origin 504 エラー | error.html を返却 (HTTP 200) | 🔵 |

**参照した EARS 要件**: REQ-031, EDGE-001

### 4.4 エラーケース 🟡

| ケース | 期待動作 |
|--------|----------|
| `envName` が空 | `Error: envName は必須です。` |
| `s3Bucket` が null | `Error: s3Bucket は必須です。` |
| `originAccessControl` が null | `Error: originAccessControl は必須です。` |
| `alb` が null | `Error: alb は必須です。` |

---

## 5. EARS 要件・設計文書との対応関係

### 5.1 参照した機能要件 🔵

| 要件ID | 内容 | 対応 |
|--------|------|------|
| REQ-031 | 静的リソース及び Sorry Page 提供用 S3 バケット | エラーページ設定 |
| REQ-032 | OAC を構成し S3 が CloudFront 経由のみアクセス可能 | S3 Origin (OAC) 設定 |
| REQ-033 | WAF を CloudFront に接続 | Distribution Stack で対応 |
| REQ-043 | CloudFront/ALB のデフォルトドメインを使用 | カスタムドメイン不使用 |

### 5.2 参照した非機能要件 🔵

| 要件ID | 内容 | 対応 |
|--------|------|------|
| NFR-002 | VPC Endpoint 使用によりレイテンシを最適化 | ALB Origin 設定 |
| NFR-104 | OAC を使用して S3 バケットへの直接アクセスを防止 | OAC 経由の S3 Origin |
| NFR-105 | HTTPS を強制 | viewerProtocolPolicy: REDIRECT_TO_HTTPS |

### 5.3 参照した Edge ケース 🔵

| 要件ID | 内容 | 対応 |
|--------|------|------|
| EDGE-001 | NAT Gateway 障害時フェイルオーバー | CloudFront エッジキャッシュ |
| EDGE-002 | ECS タスク失敗時の自動起動 | ALB ヘルスチェック連携 |

### 5.4 参照した設計文書 🔵

| 文書 | セクション | 内容 |
|------|-----------|------|
| `architecture.md` | CloudFront セクション | Origin 設定、Price Class |
| `dataflow.md` | リクエストフロー | S3/ALB へのルーティング |
| `requirements.md` | REQ-031, 032, 043 | 機能要件 |
| `TASK-0019.md` | 主要実装項目 | 設定詳細 |

---

## 6. CloudFormation リソース仕様

### 6.1 作成されるリソース 🔵

| リソースタイプ | 数 | 説明 |
|---------------|-----|------|
| `AWS::CloudFront::Distribution` | 1 | CloudFront Distribution |

### 6.2 Distribution 設定詳細 🔵

```yaml
AWS::CloudFront::Distribution:
  DistributionConfig:
    Enabled: true
    DefaultRootObject: index.html
    PriceClass: PriceClass.PRICE_CLASS_200
    HttpVersion: http2and3
    Origins:
      - Id: S3Origin
        DomainName: {s3Bucket.bucketRegionalDomainName}
        OriginAccessControlId: {originAccessControl.attrId}
        S3OriginConfig:
          OriginAccessIdentity: '' # OAC 使用時は空
      - Id: ALBOrigin
        DomainName: {alb.loadBalancerDnsName}
        CustomOriginConfig:
          HTTPSPort: 443
          OriginProtocolPolicy: https-only
    DefaultCacheBehavior:
      TargetOriginId: ALBOrigin
      ViewerProtocolPolicy: redirect-to-https
      CachePolicyId: {CACHING_DISABLED}
    CacheBehaviors:
      - PathPattern: /static/*
        TargetOriginId: S3Origin
        ViewerProtocolPolicy: redirect-to-https
        CachePolicyId: {CACHING_OPTIMIZED}
      - PathPattern: /assets/*
        TargetOriginId: S3Origin
        ViewerProtocolPolicy: redirect-to-https
        CachePolicyId: {CACHING_OPTIMIZED}
      - PathPattern: /api/*
        TargetOriginId: ALBOrigin
        ViewerProtocolPolicy: redirect-to-https
        CachePolicyId: {CACHING_DISABLED}
    CustomErrorResponses:
      - ErrorCode: 403
        ResponseCode: 200
        ResponsePagePath: /error.html
        ErrorCachingMinTTL: 10
      - ErrorCode: 404
        ResponseCode: 200
        ResponsePagePath: /error.html
        ErrorCachingMinTTL: 10
      - ErrorCode: 500
        ResponseCode: 200
        ResponsePagePath: /error.html
        ErrorCachingMinTTL: 0
      - ErrorCode: 502
        ResponseCode: 200
        ResponsePagePath: /error.html
        ErrorCachingMinTTL: 0
      - ErrorCode: 503
        ResponseCode: 200
        ResponsePagePath: /error.html
        ErrorCachingMinTTL: 0
      - ErrorCode: 504
        ResponseCode: 200
        ResponsePagePath: /error.html
        ErrorCachingMinTTL: 0
```

---

## 7. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 45 | 90% |
| 🟡 黄信号 | 5 | 10% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質 - 要件の大部分が EARS 要件定義書・設計文書により確認済み

---

## 8. 実装ファイル

| ファイル | 説明 |
|----------|------|
| `infra/lib/construct/distribution/cloudfront-construct.ts` | CloudFront Construct 実装 |
| `infra/test/construct/distribution/cloudfront-construct.test.ts` | テストケース |

---

*この要件定義書は TDD Red Phase のテストケース作成に使用されます*
