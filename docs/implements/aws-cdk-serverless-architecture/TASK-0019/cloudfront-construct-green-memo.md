# TASK-0019: CloudFront Construct - TDD Green Phase 完了メモ

**タスクID**: TASK-0019
**フェーズ**: TDD Green Phase
**作成日**: 2026-02-03
**ステータス**: ✅ 完了

---

## 1. 実装サマリー

### テスト結果

```
✅ Test Suites: 1 passed, 1 total
✅ Tests:       36 passed, 36 total
✅ Snapshots:   1 passed, 1 total
```

### 作成ファイル

| ファイル | 説明 |
|----------|------|
| `infra/lib/construct/distribution/cloudfront-construct.ts` | CloudFront Construct 実装 |
| `infra/test/construct/distribution/cloudfront-construct.test.ts` | テストケース (36件) |

---

## 2. 実装内容

### 2.1 CloudFrontConstruct 主要機能

1. **Multi-Origin Distribution**: S3 (OAC 経由) + ALB の 2 つの Origin を構成
2. **パスベースルーティング**:
   - `/static/*`, `/assets/*` → S3 Origin
   - `/api/*`, Default → ALB Origin
3. **HTTPS 強制**: `ViewerProtocolPolicy.REDIRECT_TO_HTTPS`
4. **カスタムエラーレスポンス**: 403, 404, 500, 502, 503, 504 → /error.html

### 2.2 Props インターフェース

```typescript
interface CloudFrontConstructProps {
  // 必須パラメータ
  envName: string;
  s3Bucket: s3.IBucket;
  originAccessControl: cloudfront.CfnOriginAccessControl;
  alb: elb.IApplicationLoadBalancer;

  // オプションパラメータ
  priceClass?: cloudfront.PriceClass;           // デフォルト: PRICE_CLASS_200
  defaultRootObject?: string;                   // デフォルト: 'index.html'
  httpVersion?: cloudfront.HttpVersion;         // デフォルト: HTTP2_AND_3
  enableErrorPages?: boolean;                   // デフォルト: true
  errorPagePath?: string;                       // デフォルト: '/error.html'
  staticAssetPaths?: string[];                  // デフォルト: ['/static/*', '/assets/*']
  apiPaths?: string[];                          // デフォルト: ['/api/*']
}
```

### 2.3 公開プロパティ

| プロパティ | 型 | 用途 |
|------------|-----|------|
| `distribution` | `cloudfront.IDistribution` | Distribution 参照 |
| `distributionArn` | `string` | S3 バケットポリシー設定 |
| `distributionDomainName` | `string` | アクセス URL |
| `distributionId` | `string` | キャッシュ無効化 |

---

## 3. 技術的な詳細

### 3.1 OAC 設定 (L1 レベル)

CDK の L2 レベルでは OAC を完全にサポートしていないため、L1 レベルで `addPropertyOverride` を使用して設定:

```typescript
const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;

cfnDistribution.addPropertyOverride(
  'DistributionConfig.Origins.0.OriginAccessControlId',
  props.originAccessControl.attrId
);
cfnDistribution.addPropertyOverride(
  'DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity',
  '' // OAC 使用時は空
);
```

### 3.2 S3Origin の使用 (Deprecated Warning)

`S3BucketOrigin` は abstract class のため直接インスタンス化できず、`S3Origin` を使用。
これは deprecated だが、OAC と組み合わせる現時点での最善策。

### 3.3 テストの修正

CDK Assertions の制限により、`Match.anyValue()` は `Match.arrayWith()` 内部で使用不可。
代わりに `Match.stringLikeRegexp()` を使用:

```typescript
// 修正前 (エラー)
Match.arrayWith([Match.anyValue(), 'RegionalDomainName'])

// 修正後 (動作)
[Match.stringLikeRegexp('.*S3Bucket.*'), 'RegionalDomainName']
```

---

## 4. テストカバレッジ詳細

### カテゴリ別テスト数

| カテゴリ | テスト数 |
|----------|----------|
| Distribution 作成 | 6 |
| S3 Origin (OAC) | 5 |
| ALB Origin | 4 |
| Cache Behavior | 5 |
| エラーページ | 4 |
| プロパティ | 4 |
| オプション設定 | 3 |
| バリデーション | 4 |
| スナップショット | 1 |
| **合計** | **36** |

---

## 5. 使用例

```typescript
// S3BucketConstruct (TASK-0018) からの参照
const s3Construct = new S3BucketConstruct(this, 'S3Bucket', {
  envName: 'dev',
});

// AlbConstruct (TASK-0016) からの参照
const albConstruct = new AlbConstruct(this, 'Alb', {
  vpc: vpcConstruct.vpc,
  securityGroup: securityGroupConstruct.albSecurityGroup,
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

---

## 6. 次のステップ

- [ ] TASK-0020: Distribution Stack 統合
- [ ] Refactor Phase の実施（必要に応じて）

---

## 7. 参照ドキュメント

| ドキュメント | パス |
|-------------|------|
| 要件定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0019/cloudfront-construct-requirements.md` |
| テストケース | `docs/implements/aws-cdk-serverless-architecture/TASK-0019/cloudfront-construct-testcases.md` |
| 開発ノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0019/note.md` |

---

*このメモは TDD Green Phase 完了時に作成されました*
