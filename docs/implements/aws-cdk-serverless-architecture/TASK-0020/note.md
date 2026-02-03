# TASK-0020: Distribution Stack 統合 - TDD 開発ノート

**タスクID**: TASK-0020
**機能名**: Distribution Stack 統合
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-03
**フェーズ**: Phase 4 - 配信・運用

---

## 1. 技術スタック

### 使用技術・フレームワーク

| 技術 | バージョン | 用途 |
|------|-----------|------|
| AWS CDK | v2 | インフラストラクチャ定義 |
| TypeScript | 5.x | 開発言語 |
| Jest | 29.x | テストフレームワーク |
| Node.js | 20.x | ランタイム |

### 主要 AWS サービス

| サービス | 用途 | 関連 Construct |
|---------|------|----------------|
| CloudFront | コンテンツ配信 | CloudFrontConstruct (TASK-0019) |
| S3 | 静的コンテンツ保存 | S3BucketConstruct (TASK-0018) |
| WAF | Web アプリケーション保護 | WafConstruct (TASK-0011) |

### アーキテクチャパターン

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

**参照元**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 2. 開発ルール

### プロジェクト固有ルール

1. **TDD サイクル遵守**
   - Red → Green → Refactor の順序を厳守
   - テストコード先行、実装コードは後から

2. **Construct 設計パターン**
   - Props インターフェースは `readonly` プロパティ
   - 公開プロパティはインターフェース型 (例: `s3.IBucket`)
   - バリデーションは constructor 内で実施

3. **信頼性レベル表記**
   - 🔵 青信号: 要件定義書・設計文書に基づく
   - 🟡 黄信号: タスクノート・推測に基づく
   - 🔴 赤信号: 未確認・仮実装

4. **命名規則**
   - Stack: `{Feature}Stack` (例: `DistributionStack`)
   - Construct: `{Feature}Construct` (例: `CloudFrontConstruct`)
   - テスト: `{feature}.test.ts`

5. **envName バリデーション**
   - 必須パラメータ
   - 1-20 文字
   - 小文字英数字とハイフンのみ

**参照元**:
- `docs/rule/tdd/`
- `AGENTS.md`

---

## 3. 関連実装

### 依存 Construct

#### S3BucketConstruct (TASK-0018)

**ファイル**: `infra/lib/construct/storage/s3-bucket-construct.ts`

**Props**:
```typescript
interface S3BucketConstructProps {
  readonly envName: string;
  readonly bucketNameSuffix?: string;    // default: 'static-content'
  readonly versioned?: boolean;           // default: true
  readonly removalPolicy?: cdk.RemovalPolicy;
  readonly autoDeleteObjects?: boolean;
}
```

**公開プロパティ**:
- `bucket: s3.IBucket` - S3 バケット
- `bucketArn: string` - バケット ARN
- `bucketDomainName: string` - バケットドメイン名
- `bucketName: string` - バケット名
- `originAccessControl: cloudfront.CfnOriginAccessControl` - OAC
- `originAccessControlId: string` - OAC ID

**重要メソッド**:
- `addCloudFrontBucketPolicy(distributionArn: string): void` - 循環参照解決用

#### CloudFrontConstruct (TASK-0019)

**ファイル**: `infra/lib/construct/distribution/cloudfront-construct.ts`

**Props**:
```typescript
interface CloudFrontConstructProps {
  readonly envName: string;
  readonly s3Bucket: s3.IBucket;
  readonly originAccessControl: cloudfront.CfnOriginAccessControl;
  readonly alb: elb.IApplicationLoadBalancer;
  readonly priceClass?: cloudfront.PriceClass;      // default: PRICE_CLASS_200
  readonly defaultRootObject?: string;               // default: 'index.html'
  readonly httpVersion?: cloudfront.HttpVersion;     // default: HTTP2_AND_3
  readonly enableErrorPages?: boolean;               // default: true
  readonly errorPagePath?: string;                   // default: '/error.html'
  readonly staticAssetPaths?: string[];              // default: ['/static/*', '/assets/*']
  readonly apiPaths?: string[];                      // default: ['/api/*']
}
```

**公開プロパティ**:
- `distribution: cloudfront.IDistribution` - Distribution
- `distributionArn: string` - Distribution ARN
- `distributionDomainName: string` - ドメイン名
- `distributionId: string` - Distribution ID

#### WafConstruct (TASK-0011)

**ファイル**: `infra/lib/construct/security/waf-construct.ts`

**重要設定**:
- `scope: 'REGIONAL' | 'CLOUDFRONT'` - WAF スコープ
  - CloudFront 用は `'CLOUDFRONT'` を指定
- AWS Managed Rules (Common + SQLi) 適用
- CloudWatch Logs によるログ記録

### 参考 Stack 実装

#### ApplicationStack (TASK-0017)

**ファイル**: `infra/lib/stack/application-stack.ts`

**参考ポイント**:
- Stack Props の設計パターン
- Construct の組み合わせ方
- CfnOutput の定義方法
- 公開プロパティの型定義

**参照元**:
- `infra/lib/construct/storage/s3-bucket-construct.ts`
- `infra/lib/construct/distribution/cloudfront-construct.ts`
- `infra/lib/construct/security/waf-construct.ts`
- `infra/lib/stack/application-stack.ts`

---

## 4. 設計文書

### 要件定義

| 要件ID | 内容 | 対応 |
|--------|------|------|
| REQ-031 | 静的リソース及び Sorry Page 提供用 S3 バケット | S3BucketConstruct |
| REQ-032 | OAC を構成し S3 が CloudFront 経由のみアクセス可能 | CloudFrontConstruct |
| REQ-033 | WAF を CloudFront に接続 | WafConstruct 統合 |
| REQ-043 | CloudFront/ALB のデフォルトドメインを使用 | カスタムドメイン不使用 |
| NFR-104 | OAC を使用して S3 バケットへの直接アクセスを防止 | OAC 設定 |
| NFR-105 | HTTPS を強制 | REDIRECT_TO_HTTPS |

### 機能要件・非機能要件

**参照元**: `docs/spec/aws-cdk-serverless-architecture/requirements.md`

### アーキテクチャ設計

**Distribution Stack 責務**:
- CloudFront Distribution の作成
- S3 Origin (OAC) の構成
- WAF の CloudFront 連携

**Stack 依存関係**:
```
                                  ┌─── Distribution Stack ←──┐
VPC Stack → Security Stack ────┼─── Application Stack ────┤
                                  └─── Database Stack       │
                                                            ↓
                                                     Ops Stack
```

**参照元**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 5. 注意事項

### 技術的制約

1. **循環参照の解決**
   - S3BucketConstruct と CloudFrontConstruct 間の循環参照
   - `addCloudFrontBucketPolicy()` メソッドで解決
   - Distribution 作成後にバケットポリシーを追加

2. **WAF スコープ**
   - CloudFront 用 WAF は `CLOUDFRONT` スコープ
   - us-east-1 リージョンで作成が必要（CDK が自動対応）

3. **OAC 設定**
   - CDK L2 では OAC 完全サポートなし
   - L1 レベルで `addPropertyOverride` 使用
   - CloudFrontConstruct 内で対応済み

### セキュリティ要件

| 項目 | 設定 | 根拠 |
|------|------|------|
| HTTPS 強制 | REDIRECT_TO_HTTPS | NFR-105 |
| OAC | sigv4, always | REQ-032 |
| WAF | AWS Managed Rules | REQ-033, REQ-034 |
| S3 Public Access | BLOCK_ALL | NFR-104 |

### パフォーマンス要件

| 項目 | 設定 | 根拠 |
|------|------|------|
| HTTP Version | HTTP/2 and HTTP/3 | 最適化 |
| Price Class | PRICE_CLASS_200 | 日本含むリージョン |
| S3 Cache Policy | CACHING_OPTIMIZED | 静的コンテンツ |
| ALB Cache Policy | CACHING_DISABLED | 動的コンテンツ |

**参照元**:
- `docs/implements/aws-cdk-serverless-architecture/TASK-0019/cloudfront-construct-requirements.md`
- `docs/implements/aws-cdk-serverless-architecture/TASK-0018/s3-oac-construct-requirements.md`

---

## 6. Distribution Stack 設計案

### Props インターフェース (案)

```typescript
interface DistributionStackProps extends cdk.StackProps {
  // 必須パラメータ
  readonly vpc: ec2.IVpc;
  readonly alb: elb.IApplicationLoadBalancer;
  readonly albSecurityGroup: ec2.ISecurityGroup;
  readonly config: EnvironmentConfig;

  // オプションパラメータ
  readonly enableWaf?: boolean;           // default: true
  readonly wafScope?: 'CLOUDFRONT';       // CloudFront 専用
}
```

### 公開プロパティ (案)

| プロパティ | 型 | 用途 |
|------------|-----|------|
| `distribution` | `cloudfront.IDistribution` | Distribution 参照 |
| `distributionDomainName` | `string` | アクセス URL |
| `distributionId` | `string` | キャッシュ無効化 |
| `bucket` | `s3.IBucket` | S3 バケット参照 |
| `webAcl` | `wafv2.CfnWebACL` | WAF WebACL (条件付き) |

### 処理フロー

```
1. S3BucketConstruct 作成
2. CloudFrontConstruct 作成 (S3, OAC, ALB を渡す)
3. S3BucketConstruct.addCloudFrontBucketPolicy() 呼び出し (循環参照解決)
4. WafConstruct 作成 (scope: 'CLOUDFRONT')
5. WAF と CloudFront の関連付け
6. CfnOutput 生成
```

---

## 7. テストケース概要 (案)

### カテゴリ別

| カテゴリ | テスト項目 |
|----------|-----------|
| Stack 作成 | 正常作成、必須パラメータ検証 |
| S3 統合 | バケット作成、OAC 設定、ポリシー追加 |
| CloudFront 統合 | Distribution 作成、Origin 設定 |
| WAF 統合 | WebACL 作成、CloudFront 関連付け |
| CfnOutput | 各リソースのエクスポート |
| スナップショット | 全体構成の検証 |

---

## 8. 参照ファイル一覧

| カテゴリ | ファイルパス |
|----------|-------------|
| 要件定義 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| アーキテクチャ | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| TODO | `docs/implements/aws-cdk-serverless-architecture/TODO.md` |
| TASK-0018 要件 | `docs/implements/aws-cdk-serverless-architecture/TASK-0018/s3-oac-construct-requirements.md` |
| TASK-0019 要件 | `docs/implements/aws-cdk-serverless-architecture/TASK-0019/cloudfront-construct-requirements.md` |
| TASK-0019 Green メモ | `docs/implements/aws-cdk-serverless-architecture/TASK-0019/cloudfront-construct-green-memo.md` |
| TASK-0019 Refactor メモ | `docs/implements/aws-cdk-serverless-architecture/TASK-0019/cloudfront-construct-refactor-memo.md` |
| S3 Construct | `infra/lib/construct/storage/s3-bucket-construct.ts` |
| CloudFront Construct | `infra/lib/construct/distribution/cloudfront-construct.ts` |
| WAF Construct | `infra/lib/construct/security/waf-construct.ts` |
| Application Stack | `infra/lib/stack/application-stack.ts` |
| 開発ルール | `docs/rule/tdd/` |

---

*このノートは TDD 開発の前準備として作成されました*
