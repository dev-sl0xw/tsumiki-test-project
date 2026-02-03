# TASK-0020: Distribution Stack 統合 - TDD Red Phase 完了メモ

**タスクID**: TASK-0020
**機能名**: Distribution Stack 統合
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-04
**フェーズ**: TDD Red Phase - 失敗するテストケースの作成
**ステータス**: ✅ 完了

---

## 1. Red Phase サマリー

### テスト実行結果

```
FAIL test/distribution-stack.test.ts

test/distribution-stack.test.ts:29:35 - error TS2307: Cannot find module
'../lib/stack/distribution-stack' or its corresponding type declarations.

Test Suites: 1 failed, 1 total
Tests:       0 total
```

### 失敗理由

- `DistributionStack` がまだ実装されていないため、import でコンパイルエラー発生
- これは TDD Red Phase の正常な結果（実装前にテストを書く）

---

## 2. 作成したテストファイル

### ファイル情報

| 項目 | パス |
|------|------|
| **テストファイル** | `infra/test/distribution-stack.test.ts` |
| **実装予定ファイル** | `infra/lib/stack/distribution-stack.ts` |

### テストケース数

| カテゴリ | テストケースID | テスト数 |
|----------|---------------|----------|
| スナップショット | TC-DS-01〜02 | 2 |
| リソース存在確認 | TC-DS-03〜08 | 6 |
| Construct 統合 | TC-DS-09〜14 | 6 |
| 公開プロパティ | TC-DS-15〜20 | 6 |
| CfnOutput | TC-DS-21〜24 | 4 |
| 依存関係 | TC-DS-25〜27 | 3 |
| セキュリティ | TC-DS-28〜30 | 3 |
| オプション設定 | TC-DS-31〜33 | 3 |
| 異常系 | TC-DS-34〜36 | 3 |
| 環境別設定 | - | 1 |
| **合計** | | **37** |

---

## 3. テストケース詳細

### 3.1 スナップショットテスト (TC-DS-01〜02)

| ID | テスト名 | 信頼性 |
|----|---------|--------|
| TC-DS-01 | CloudFormation テンプレートのスナップショットテスト（Dev環境） | 🔵 |
| TC-DS-02 | CloudFormation テンプレートのスナップショットテスト（WAF無効） | 🟡 |

### 3.2 リソース存在確認テスト (TC-DS-03〜08)

| ID | テスト名 | 検証対象 | 信頼性 |
|----|---------|----------|--------|
| TC-DS-03 | S3 Bucket が 1 つ作成されること | `AWS::S3::Bucket` | 🔵 |
| TC-DS-04 | S3 Bucket Policy が作成されること | `AWS::S3::BucketPolicy` | 🔵 |
| TC-DS-05 | Origin Access Control が 1 つ作成されること | `AWS::CloudFront::OriginAccessControl` | 🔵 |
| TC-DS-06 | CloudFront Distribution が 1 つ作成されること | `AWS::CloudFront::Distribution` | 🔵 |
| TC-DS-07 | WAF WebACL が 1 つ作成されること（enableWaf: true） | `AWS::WAFv2::WebACL` | 🔵 |
| TC-DS-08 | WAF WebACL が作成されないこと（enableWaf: false） | `AWS::WAFv2::WebACL` count=0 | 🟡 |

### 3.3 Construct 統合テスト (TC-DS-09〜14)

| ID | テスト名 | 検証内容 | 信頼性 |
|----|---------|----------|--------|
| TC-DS-09 | S3 バケットにパブリックアクセスブロックが設定される | BLOCK_ALL | 🔵 |
| TC-DS-10 | CloudFront で HTTPS リダイレクトが設定される | redirect-to-https | 🔵 |
| TC-DS-11 | Distribution の Origins に S3 バケットが含まれる | S3Origin 存在 | 🔵 |
| TC-DS-12 | Distribution の Origins に ALB が含まれる | ALB Origin https-only | 🔵 |
| TC-DS-13 | WAF WebACL に AWS Managed Rules が設定される | AWSManagedRulesCommonRuleSet | 🔵 |
| TC-DS-14 | WAF WebACL のスコープが CLOUDFRONT | Scope: CLOUDFRONT | 🔵 |

### 3.4 公開プロパティ確認テスト (TC-DS-15〜20)

| ID | プロパティ | 信頼性 |
|----|-----------|--------|
| TC-DS-15 | `distribution: IDistribution` | 🔵 |
| TC-DS-16 | `distributionDomainName: string` | 🔵 |
| TC-DS-17 | `distributionId: string` | 🔵 |
| TC-DS-18 | `bucket: IBucket` | 🔵 |
| TC-DS-19 | `bucketArn: string` | 🔵 |
| TC-DS-20 | `webAcl?: CfnWebACL` (条件付き) | 🟡 |

### 3.5 CfnOutput 確認テスト (TC-DS-21〜24)

| ID | Output 名 | Export 名パターン | 信頼性 |
|----|-----------|-------------------|--------|
| TC-DS-21 | DistributionDomainName | `${envName}-DistributionDomainName` | 🔵 |
| TC-DS-22 | DistributionId | `${envName}-DistributionId` | 🔵 |
| TC-DS-23 | StaticContentBucket | `${envName}-StaticContentBucket` | 🔵 |
| TC-DS-24 | StaticContentBucketArn | `${envName}-StaticContentBucketArn` | 🔵 |

### 3.6 依存関係テスト (TC-DS-25〜27)

| ID | テスト名 | 信頼性 |
|----|---------|--------|
| TC-DS-25 | バケットポリシーに aws:SourceArn 条件が設定されている | 🔵 |
| TC-DS-26 | CloudFront Origin に ALB DNS 名への参照が含まれる | 🔵 |
| TC-DS-27 | Stack が正常に作成されること | 🟡 |

### 3.7 セキュリティテスト (TC-DS-28〜30)

| ID | テスト名 | 検証内容 | 信頼性 |
|----|---------|----------|--------|
| TC-DS-28 | S3 バケットに S3 マネージド暗号化が設定される | AES256 | 🔵 |
| TC-DS-29 | OAC の署名設定が適切に構成される | sigv4, always | 🔵 |
| TC-DS-30 | ALB Origin が HTTPS-only で設定される | https-only | 🔵 |

### 3.8 オプション設定テスト (TC-DS-31〜33)

| ID | テスト名 | 信頼性 |
|----|---------|--------|
| TC-DS-31 | enableWaf を省略した場合 WAF が有効になる | 🟡 |
| TC-DS-32 | priceClass をカスタム値で設定できる | 🟡 |
| TC-DS-33 | enableErrorPages: false でエラーレスポンス設定が含まれない | 🟡 |

### 3.9 異常系・バリデーションテスト (TC-DS-34〜36)

| ID | テスト名 | 期待動作 | 信頼性 |
|----|---------|----------|--------|
| TC-DS-34 | envName が空文字の場合エラーが発生する | throw | 🟡 |
| TC-DS-35 | envName が 20 文字を超える場合エラーが発生する | throw | 🟡 |
| TC-DS-36 | envName に不正な文字が含まれる場合エラーが発生する | throw | 🟡 |

---

## 4. テストヘルパー関数

| 関数名 | 用途 |
|--------|------|
| `createTestVpc()` | テスト用 VPC 作成（3層サブネット） |
| `createTestAlb()` | テスト用 ALB 作成（Internet-facing） |
| `createTestAlbSecurityGroup()` | テスト用 ALB Security Group 作成 |
| `createTestConfig()` | カスタマイズされた EnvironmentConfig 作成 |

---

## 5. 実装に必要な Props インターフェース（推定）

```typescript
interface DistributionStackProps extends cdk.StackProps {
  // 必須パラメータ
  readonly alb: elb.IApplicationLoadBalancer;
  readonly albSecurityGroup: ec2.ISecurityGroup;
  readonly config: EnvironmentConfig;

  // オプションパラメータ
  readonly enableWaf?: boolean;        // default: true
  readonly priceClass?: string;        // default: PriceClass_200
  readonly enableErrorPages?: boolean; // default: true
}
```

---

## 6. 実装に必要な公開プロパティ

```typescript
class DistributionStack extends cdk.Stack {
  public readonly distribution: cloudfront.IDistribution;
  public readonly distributionDomainName: string;
  public readonly distributionId: string;
  public readonly bucket: s3.IBucket;
  public readonly bucketArn: string;
  public readonly webAcl?: wafv2.CfnWebACL;  // 条件付き
}
```

---

## 7. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 28 | 76% |
| 🟡 黄信号 | 9 | 24% |
| 🔴 赤信号 | 0 | 0% |

---

## 8. 次のステップ

### Green Phase で実装すべき内容

1. **DistributionStack クラス作成**
   - `infra/lib/stack/distribution-stack.ts` ファイル作成
   - Props インターフェース定義
   - envName バリデーション実装

2. **Construct 統合**
   - S3BucketConstruct 作成
   - CloudFrontConstruct 作成（S3 + OAC + ALB）
   - WafConstruct 作成（条件付き、scope: CLOUDFRONT）
   - 循環参照解決（addCloudFrontBucketPolicy 呼び出し）

3. **CfnOutput 定義**
   - DistributionDomainName
   - DistributionId
   - StaticContentBucket
   - StaticContentBucketArn

### 実行コマンド

```bash
# Green Phase 開始
/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0020

# または手動テスト実行
cd infra && npx jest distribution-stack.test.ts
```

---

## 9. 参照ドキュメント

| ドキュメント | パス |
|-------------|------|
| 開発ノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0020/note.md` |
| 要件定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0020/distribution-stack-requirements.md` |
| テストケース定義 | `docs/implements/aws-cdk-serverless-architecture/TASK-0020/distribution-stack-testcases.md` |
| S3 Construct | `infra/lib/construct/storage/s3-bucket-construct.ts` |
| CloudFront Construct | `infra/lib/construct/distribution/cloudfront-construct.ts` |
| WAF Construct | `infra/lib/construct/security/waf-construct.ts` |

---

*このメモは TDD Red Phase 完了時に作成されました*
