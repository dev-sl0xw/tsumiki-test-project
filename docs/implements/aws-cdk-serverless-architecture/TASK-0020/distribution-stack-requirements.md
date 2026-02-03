# TASK-0020: Distribution Stack 統合 - TDD 要件定義書

**タスクID**: TASK-0020
**機能名**: Distribution Stack 統合
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-03
**フェーズ**: Phase 4 - 配信・運用
**信頼性レベル**: 🔵 (96% 青信号)

---

## 1. 機能の概要

### 1.1 概要説明 🔵

**何をする機能か**:
S3 バケット、CloudFront Distribution、WAF を統合した CDK Stack を作成する。コンテンツ配信レイヤーを一つの Stack としてまとめ、Application Stack からの依存関係を適切に管理する。

**どのような問題を解決するか**:
- 静的コンテンツと動的コンテンツの統合配信
- OAC 経由の S3 アクセスによるセキュリティ確保
- WAF による Web アプリケーション保護
- Stack 間の依存関係の適切な管理

**想定されるユーザー**:
- インフラ担当者 (CDK Stack 構築)
- 運用担当者 (キャッシュ無効化、動作確認)

**システム内での位置づけ**:
```
VPC Stack → Security Stack → Database Stack → Application Stack
                                                     ↓
                               Distribution Stack ← ─┴─ → Ops Stack
                                    ↓
                              CloudFront
                               ├── S3 Origin (OAC)
                               ├── ALB Origin
                               └── WAF 連携
```

**参照した EARS 要件**: REQ-031, REQ-032, REQ-033, REQ-034, REQ-043
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` (Stack 構成セクション)

---

## 2. 入力・出力の仕様

### 2.1 入力パラメータ (Props) 🔵

#### 必須パラメータ

| パラメータ名 | 型 | 説明 | 制約 | 信頼性 |
|-------------|-----|------|------|--------|
| `alb` | `elb.IApplicationLoadBalancer` | Application Stack の ALB | TASK-0017 で作成 | 🔵 |
| `albSecurityGroup` | `ec2.ISecurityGroup` | ALB 用 Security Group | Security Stack で作成 | 🔵 |
| `config` | `EnvironmentConfig` | 環境設定 | envName 含む | 🔵 |

#### オプションパラメータ

| パラメータ名 | 型 | デフォルト値 | 説明 | 信頼性 |
|-------------|-----|--------------|------|--------|
| `enableWaf` | `boolean` | `true` | WAF 有効化フラグ | 🟡 |
| `priceClass` | `cloudfront.PriceClass` | `PRICE_CLASS_200` | CloudFront 価格クラス | 🔵 |
| `enableErrorPages` | `boolean` | `true` | エラーページ有効化 | 🔵 |

### 2.2 出力プロパティ 🔵

| プロパティ名 | 型 | 説明 | 用途 | 信頼性 |
|-------------|-----|------|------|--------|
| `distribution` | `cloudfront.IDistribution` | CloudFront Distribution | 参照 | 🔵 |
| `distributionDomainName` | `string` | Distribution ドメイン名 | アクセス URL | 🔵 |
| `distributionId` | `string` | Distribution ID | キャッシュ無効化 | 🔵 |
| `bucket` | `s3.IBucket` | S3 バケット | 静的コンテンツアップロード | 🔵 |
| `bucketArn` | `string` | S3 バケット ARN | IAM ポリシー | 🔵 |
| `webAcl` | `wafv2.CfnWebACL \| undefined` | WAF WebACL | 条件付き (enableWaf) | 🔵 |

### 2.3 データフロー 🔵

```
Distribution Stack 作成フロー:

1. S3BucketConstruct 作成
   ├── S3 バケット (静的コンテンツ + Sorry Page)
   └── OAC (Origin Access Control)
          ↓
2. CloudFrontConstruct 作成
   ├── S3 Origin (OAC 経由)
   ├── ALB Origin (Application Stack から参照)
   └── パスベースルーティング設定
          ↓
3. S3BucketConstruct.addCloudFrontBucketPolicy() 呼び出し
   └── 循環参照解決
          ↓
4. WafConstruct 作成 (enableWaf: true の場合)
   ├── スコープ: CLOUDFRONT
   └── AWS Managed Rules 適用
          ↓
5. WAF と CloudFront の関連付け
   └── WebACL を Distribution に接続
          ↓
6. CfnOutput 生成
   ├── Distribution Domain Name
   ├── Distribution ID
   └── S3 Bucket Name
```

**参照した EARS 要件**: REQ-031, REQ-032, REQ-033
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
| S3 Public Access | BLOCK_ALL | パブリックアクセス禁止 | 🔵 |
| ALB Origin Protocol | HTTPS | セキュア通信 | 🔵 |
| WAF | AWS Managed Rules | Web アプリケーション保護 | 🔵 |

**参照した EARS 要件**: NFR-103, NFR-104, NFR-105

### 3.3 アーキテクチャ制約 🔵

| 制約 | 内容 | 根拠 | 信頼性 |
|------|------|------|--------|
| カスタムドメイン | 不使用 | REQ-043 | 🔵 |
| WAF スコープ | CLOUDFRONT | CloudFront 用 WAF | 🔵 |
| OAC 署名 | sigv4、always | REQ-032 | 🔵 |
| Stack 依存関係 | Application Stack → Distribution Stack | architecture.md | 🔵 |

**参照した EARS 要件**: REQ-032, REQ-033, REQ-043
**参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

### 3.4 Props バリデーション 🟡

| パラメータ | バリデーション | エラーメッセージ |
|-----------|---------------|------------------|
| `config.envName` | 空文字チェック | `envName は必須です。空文字列は指定できません。` |
| `config.envName` | 長さチェック (≤20) | `envName は 20 文字以下である必要があります。` |
| `config.envName` | 形式チェック | `envName は小文字英数字とハイフンのみで構成されます。` |
| `alb` | null チェック | `alb は必須です。` |

**参照した設計文書**: `infra/lib/construct/storage/s3-bucket-construct.ts` (バリデーションパターン)

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン 🔵

```typescript
// Application Stack からの ALB 参照
const applicationStack = new ApplicationStack(app, 'ApplicationStack', {
  // ... props
});

// Distribution Stack の作成
const distributionStack = new DistributionStack(app, 'DistributionStack', {
  alb: applicationStack.loadBalancer,
  albSecurityGroup: securityStack.albSecurityGroup,
  config: devConfig,
  env: {
    account: config.account,
    region: config.region,
  },
});

// Stack 依存関係の設定
distributionStack.addDependency(applicationStack);
```

**参照した EARS 要件**: REQ-031, REQ-032, REQ-033

### 4.2 WAF 無効化パターン 🟡

```typescript
// Dev 環境での WAF 無効化
const distributionStack = new DistributionStack(app, 'DistributionStack', {
  alb: applicationStack.loadBalancer,
  albSecurityGroup: securityStack.albSecurityGroup,
  config: devConfig,
  enableWaf: false, // WAF を無効化
});
```

### 4.3 エッジケース 🔵

| ケース | 期待動作 | 信頼性 |
|--------|----------|--------|
| S3 Origin 403 エラー | error.html を返却 (HTTP 200) | 🔵 |
| S3 Origin 404 エラー | error.html を返却 (HTTP 200) | 🔵 |
| ALB Origin 5xx エラー | error.html を返却 (HTTP 200) | 🔵 |
| WAF ブロック | 403 エラーを返却 | 🔵 |

**参照した EARS 要件**: REQ-031, EDGE-001

### 4.4 エラーケース 🟡

| ケース | 期待動作 |
|--------|----------|
| `config.envName` が空 | `Error: envName は必須です。` |
| `alb` が null | `Error: alb は必須です。` |
| 依存 Stack 未デプロイ | CloudFormation エラー |

---

## 5. EARS 要件・設計文書との対応関係

### 5.1 参照した機能要件 🔵

| 要件ID | 内容 | 対応 |
|--------|------|------|
| REQ-031 | 静的リソース及び Sorry Page 提供用 S3 バケット | S3BucketConstruct 統合 |
| REQ-032 | OAC を構成し S3 が CloudFront 経由のみアクセス可能 | CloudFrontConstruct 統合 |
| REQ-033 | WAF を CloudFront に接続 | WafConstruct 統合 |
| REQ-034 | AWS Managed Rules 適用 | WafConstruct 設定 |
| REQ-043 | CloudFront/ALB のデフォルトドメインを使用 | カスタムドメイン不使用 |

### 5.2 参照した非機能要件 🔵

| 要件ID | 内容 | 対応 |
|--------|------|------|
| NFR-002 | VPC Endpoint 使用によりレイテンシを最適化 | ALB Origin 設定 |
| NFR-103 | WAF を適用して Web アプリケーションを保護 | WafConstruct 統合 |
| NFR-104 | OAC を使用して S3 バケットへの直接アクセスを防止 | S3BucketConstruct 設定 |
| NFR-105 | HTTPS を強制 | CloudFrontConstruct 設定 |

### 5.3 参照した Edge ケース 🔵

| 要件ID | 内容 | 対応 |
|--------|------|------|
| EDGE-001 | NAT Gateway 障害時フェイルオーバー | CloudFront エッジキャッシュ |

### 5.4 参照した設計文書 🔵

| 文書 | セクション | 内容 |
|------|-----------|------|
| `architecture.md` | Stack 構成 | Distribution Stack の責務 |
| `architecture.md` | Stack 依存関係 | Application → Distribution |
| `architecture.md` | CloudFront セクション | Origin 設定、Price Class |
| `architecture.md` | WAF セクション | CloudFront への WAF 適用 |

---

## 6. CloudFormation リソース仕様

### 6.1 作成されるリソース 🔵

| リソースタイプ | 数 | 説明 | Construct |
|---------------|-----|------|-----------|
| `AWS::S3::Bucket` | 1 | 静的コンテンツバケット | S3BucketConstruct |
| `AWS::S3::BucketPolicy` | 1 | CloudFront アクセス許可 | S3BucketConstruct |
| `AWS::CloudFront::OriginAccessControl` | 1 | OAC | S3BucketConstruct |
| `AWS::CloudFront::Distribution` | 1 | CloudFront Distribution | CloudFrontConstruct |
| `AWS::WAFv2::WebACL` | 0-1 | WAF WebACL (条件付き) | WafConstruct |
| `AWS::Logs::LogGroup` | 0-1 | WAF ログ (条件付き) | WafConstruct |

### 6.2 CfnOutput 設定 🔵

```yaml
Outputs:
  DistributionDomainName:
    Value: !GetAtt Distribution.DomainName
    Description: CloudFront Distribution domain name
    Export:
      Name: !Sub ${envName}-DistributionDomainName

  DistributionId:
    Value: !Ref Distribution
    Description: CloudFront Distribution ID
    Export:
      Name: !Sub ${envName}-DistributionId

  BucketName:
    Value: !Ref Bucket
    Description: S3 Bucket name
    Export:
      Name: !Sub ${envName}-StaticContentBucket

  BucketArn:
    Value: !GetAtt Bucket.Arn
    Description: S3 Bucket ARN
    Export:
      Name: !Sub ${envName}-StaticContentBucketArn
```

---

## 7. 内部 Construct 統合仕様

### 7.1 S3BucketConstruct 統合 🔵

**ファイル**: `infra/lib/construct/storage/s3-bucket-construct.ts`

**統合方法**:
```typescript
const s3Construct = new S3BucketConstruct(this, 'S3Bucket', {
  envName: props.config.envName,
  // デフォルト設定を使用
});
```

**使用プロパティ**:
- `bucket` → CloudFrontConstruct の s3Bucket
- `originAccessControl` → CloudFrontConstruct の originAccessControl
- `addCloudFrontBucketPolicy()` → 循環参照解決

### 7.2 CloudFrontConstruct 統合 🔵

**ファイル**: `infra/lib/construct/distribution/cloudfront-construct.ts`

**統合方法**:
```typescript
const cloudFrontConstruct = new CloudFrontConstruct(this, 'CloudFront', {
  envName: props.config.envName,
  s3Bucket: s3Construct.bucket,
  originAccessControl: s3Construct.originAccessControl,
  alb: props.alb,
  priceClass: props.priceClass,
  enableErrorPages: props.enableErrorPages,
});

// 循環参照解決
s3Construct.addCloudFrontBucketPolicy(cloudFrontConstruct.distributionArn);
```

### 7.3 WafConstruct 統合 🔵

**ファイル**: `infra/lib/construct/security/waf-construct.ts`

**統合方法**:
```typescript
if (props.enableWaf !== false) {
  const wafConstruct = new WafConstruct(this, 'Waf', {
    envName: props.config.envName,
    scope: 'CLOUDFRONT', // CloudFront 用
    enableLogging: true,
  });

  // CloudFront と WAF の関連付け
  // CfnWebACLAssociation を使用
}
```

**WAF-CloudFront 関連付け**:
- `wafv2.CfnWebACL` の `attrArn` を使用
- CloudFront Distribution の `webAclId` プロパティに設定

---

## 8. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 48 | 96% |
| 🟡 黄信号 | 2 | 4% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質 - 要件の大部分が EARS 要件定義書・設計文書により確認済み

---

## 9. 実装ファイル

| ファイル | 説明 |
|----------|------|
| `infra/lib/stack/distribution-stack.ts` | Distribution Stack 実装 |
| `infra/test/stack/distribution-stack.test.ts` | テストケース |

---

## 10. 参照ファイル一覧

| カテゴリ | ファイルパス |
|----------|-------------|
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0020/note.md` |
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0020.md` |
| EARS 要件定義 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| アーキテクチャ設計 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| S3 Construct | `infra/lib/construct/storage/s3-bucket-construct.ts` |
| CloudFront Construct | `infra/lib/construct/distribution/cloudfront-construct.ts` |
| WAF Construct | `infra/lib/construct/security/waf-construct.ts` |
| Application Stack | `infra/lib/stack/application-stack.ts` |

---

*この要件定義書は TDD Red Phase のテストケース作成に使用されます*
