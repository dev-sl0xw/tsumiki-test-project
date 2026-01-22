# TASK-0011: WAF Construct 実装 - TDD開発ノート

**作成日**: 2026-01-22
**タスクID**: TASK-0011
**タスクタイプ**: TDD
**推定工数**: 6時間
**フェーズ**: Phase 2 - セキュリティ・データベース

---

## 1. 技術スタック

### 使用技術・フレームワーク

| 技術 | バージョン | 用途 |
|------|----------|------|
| AWS CDK | v2.213.0 | IaC フレームワーク |
| TypeScript | ~5.6.3 | 実装言語 |
| Jest | ^29.7.0 | テストフレームワーク |
| aws-cdk-lib/assertions | 2.213.0 | CDK テストユーティリティ |
| Constructs | ^10.0.0 | CDK Construct ライブラリ |

### アーキテクチャパターン

- **パターン**: CDK Construct Pattern
- **設計原則**: 最小権限の原則、リソースの分離
- **テスト方式**: TDD (Red-Green-Refactor)
- **CDK テスト手法**: Template.fromStack + Match アサーション

### 参照元
- `infra/package.json`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 2. 開発ルール

### プロジェクト固有のルール

#### ファイル配置規則
- **Construct 実装**: `infra/lib/construct/security/waf-construct.ts`
- **テストファイル**: `infra/test/construct/security/waf-construct.test.ts`
- **Index エクスポート**: `infra/lib/construct/security/index.ts`（存在する場合）

#### コーディング規約
1. **JSDoc コメント**: 全ての公開クラス、メソッド、プロパティに必須
2. **信頼性レベル表記**: コード内に `🔵` `🟡` `🔴` で信頼性を明示
3. **セクション区切り**: `// ========` 形式でコードセクションを区切る
4. **定数抽出**: マジックナンバーは定数として定義
5. **Props インターフェース**: `readonly` 修飾子を使用

#### テストコード規約
1. **describe ブロック**: テストケースIDを含める（例: `TC-WAF-01`）
2. **beforeEach**: 各テストで独立した Stack を作成
3. **テスト目的コメント**: 各テストに目的・内容・期待動作を記載
4. **Match ユーティリティ**: `Match.objectLike`, `Match.arrayWith` を活用

### 参照元
- `infra/lib/construct/security/security-group-construct.ts`
- `infra/test/construct/security/security-group-construct.test.ts`

---

## 3. 関連実装

### 類似機能の実装例

#### SecurityGroupConstruct（最も類似度が高い）

```typescript
// infra/lib/construct/security/security-group-construct.ts

export interface SecurityGroupConstructProps {
  readonly vpc: ec2.IVpc;
  readonly containerPort?: number;
}

export class SecurityGroupConstruct extends Construct {
  public readonly albSecurityGroup: ec2.ISecurityGroup;
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;
  public readonly auroraSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupConstructProps) {
    super(scope, id);
    // 実装...
  }
}
```

#### SecurityStack（WAF Construct の統合先）

```typescript
// infra/lib/stack/security-stack.ts

export interface SecurityStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly config: EnvironmentConfig;
}

export class SecurityStack extends cdk.Stack {
  public readonly albSecurityGroup: ec2.ISecurityGroup;
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;
  public readonly auroraSecurityGroup: ec2.ISecurityGroup;
  public readonly ecsTaskRole: iam.IRole;
  public readonly ecsTaskExecutionRole: iam.IRole;
  // WAF Construct を追加予定
}
```

### 参考パターン

#### テストパターン（SecurityGroupConstruct より）

```typescript
// infra/test/construct/security/security-group-construct.test.ts

describe('TC-SG-01: ALB Security Group 作成確認', () => {
  beforeEach(() => {
    securityGroupConstruct = new SecurityGroupConstruct(stack, 'TestSecurityGroups', {
      vpc,
    });
    template = Template.fromStack(stack);
  });

  test('ALB Security Group が作成されること', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: Match.stringLikeRegexp('.*ALB.*'),
    });
  });
});
```

### 参照元
- `infra/lib/construct/security/security-group-construct.ts`
- `infra/lib/construct/security/iam-role-construct.ts`
- `infra/lib/stack/security-stack.ts`
- `infra/test/construct/security/security-group-construct.test.ts`

---

## 4. 設計文書

### WAF 設計仕様

#### タスク概要（TASK-0011.md より）

AWS WAF WebACL を構築する CDK Construct を実装します。AWS Managed Rules（Common Rule Set、SQL Injection）の適用、ALB との関連付け、ログ設定を含むエンタープライズグレードの Web アプリケーションファイアウォールを構成します。

#### Props インターフェース設計

```typescript
export interface WafConstructProps {
  envName: string;
  scope: 'REGIONAL' | 'CLOUDFRONT';
  enableLogging?: boolean;  // default: true
}
```

#### 公開プロパティ設計

```typescript
export class WafConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly webAclArn: string;
}
```

### AWS Managed Rules 設計

#### Common Rule Set（REQ-034）

```typescript
{
  name: 'AWSManagedRulesCommonRuleSet',
  priority: 1,
  overrideAction: { none: {} },
  statement: {
    managedRuleGroupStatement: {
      vendorName: 'AWS',
      name: 'AWSManagedRulesCommonRuleSet',
    },
  },
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: 'AWSManagedRulesCommonRuleSetMetric',
  },
}
```

#### SQL Injection Rule Set（REQ-034）

```typescript
{
  name: 'AWSManagedRulesSQLiRuleSet',
  priority: 2,
  overrideAction: { none: {} },
  statement: {
    managedRuleGroupStatement: {
      vendorName: 'AWS',
      name: 'AWSManagedRulesSQLiRuleSet',
    },
  },
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: 'AWSManagedRulesSQLiRuleSetMetric',
  },
}
```

### ALB 関連付け機能設計

```typescript
public associateWithAlb(albArn: string): void {
  new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
    resourceArn: albArn,
    webAclArn: this.webAcl.attrArn,
  });
}
```

### 型定義（interfaces.ts より）

```typescript
export interface WafConfig {
  readonly enabled: boolean;
  readonly managedRules: WafManagedRule[];
}

export interface WafManagedRule {
  readonly name: string;
  readonly vendorName: 'AWS';
  readonly priority: number;
}

export const DEFAULT_WAF_RULES: WafManagedRule[] = [
  {
    name: 'AWSManagedRulesCommonRuleSet',
    vendorName: 'AWS',
    priority: 1,
  },
  {
    name: 'AWSManagedRulesSQLiRuleSet',
    vendorName: 'AWS',
    priority: 2,
  },
];
```

### 参照元
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0011.md`
- `docs/design/aws-cdk-serverless-architecture/architecture.md`
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

---

## 5. 要件定義

### 関連要件（requirements.md より）

#### REQ-033: WAF CloudFront 接続 🔵
> システムは WAF を CloudFront に接続しなければならない

**実装方針**:
- スコープ: `CLOUDFRONT` を選択可能に
- グローバルリージョン（us-east-1）での作成考慮

#### REQ-034: AWS Managed Rules 🔵
> システムは WAF で AWS Managed Rules (Common RuleSet, SQL Injection 等) を適用しなければならない

**実装方針**:
- AWSManagedRulesCommonRuleSet: 一般的な脆弱性保護（XSS、LFI、RFI 等）
- AWSManagedRulesSQLiRuleSet: SQL インジェクション攻撃保護

### 非機能要件

#### NFR-103: WAF 適用 🔵
> システムは WAF を適用して Web アプリケーションを保護しなければならない

### 参照元
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

---

## 6. テスト要件

### 基本的なテスト要件（TASK-0011.md より）

#### WebACL 作成テスト 🔵
- WAF WebACL リソースが作成されること
- スコープが正しく設定されていること（REGIONAL）
- デフォルトアクションが設定されていること

#### Managed Rules テスト 🔵
- AWSManagedRulesCommonRuleSet が適用されていること
- AWSManagedRulesSQLiRuleSet が適用されていること
- ルールの優先度が正しく設定されていること

#### ログ設定テスト 🔵
- CloudWatch Logs ロググループが作成されること
- ログ保持期間が設定されていること

#### ALB 関連付けテスト 🔵
- WebACLAssociation リソースが作成可能であること
- 正しい ARN が参照されていること

### テストケースID命名規則
- `TC-WAF-XX` 形式を使用
- 例: `TC-WAF-01`, `TC-WAF-02`, ...

### 参照元
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0011.md`

---

## 7. 完了条件

TASK-0011.md より:

- [ ] WAF WebACL が正常に作成される
- [ ] AWS Managed Rules - Common Rule Set が適用されている
- [ ] AWS Managed Rules - SQL Injection が適用されている
- [ ] CloudWatch Logs へのログ出力が設定されている
- [ ] ALB との関連付けが可能な設計になっている
- [ ] すべてのユニットテストが通過している

---

## 8. 依存関係

### 前提タスク
- **TASK-0007**: Security Stack 統合（完了済み）

### 後続タスク
- **Phase 3**: アプリケーション層タスク（ALB との統合）
- **TASK-0016**: ALB Construct 実装（WAF 関連付け先）
- **TASK-0019**: CloudFront Construct 実装（WAF 関連付け先）

### 参照元
- `docs/tasks/aws-cdk-serverless-architecture/overview.md`
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0011.md`

---

## 9. 注意事項

### 技術的制約

1. **WAF スコープ制約**
   - `REGIONAL`: ALB、API Gateway 等に適用（ap-northeast-1 で作成可能）
   - `CLOUDFRONT`: CloudFront に適用（us-east-1 でのみ作成可能）
   - 本タスクでは `REGIONAL` をデフォルトとし、将来的に `CLOUDFRONT` 対応を検討

2. **ログ設定制約**
   - WAF ログはロググループ名が `aws-waf-logs-` プレフィックスで始まる必要がある
   - CloudWatch Logs の保持期間は環境に応じて設定（Dev: 3日、Prod: 30日）

3. **リソース命名制約**
   - WebACL 名は環境名（envName）を含める
   - メトリクス名は一意であること

### セキュリティ考慮事項

1. **ルール優先度**
   - Common Rule Set: 優先度 1（最初に評価）
   - SQL Injection Rule Set: 優先度 2

2. **デフォルトアクション**
   - `Allow`: マッチしないリクエストは許可
   - ルールでマッチしたリクエストのみブロック

3. **ログ記録**
   - サンプリングリクエストを有効化
   - CloudWatch メトリクスを有効化

### パフォーマンス要件

- WAF ルールの評価順序を考慮（優先度の低い数字から評価）
- 必要最小限のルールセットを適用（過剰なルールはレイテンシに影響）

### 参照元
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`
- `docs/design/aws-cdk-serverless-architecture/dataflow.md`

---

## 10. 実装手順（TDD）

### TDD サイクル

1. `/tsumiki:tdd-requirements TASK-0011` - 詳細要件定義
2. `/tsumiki:tdd-testcases` - テストケース作成
3. `/tsumiki:tdd-red` - テスト実装（失敗）
4. `/tsumiki:tdd-green` - 最小実装
5. `/tsumiki:tdd-refactor` - リファクタリング
6. `/tsumiki:tdd-verify-complete` - 品質確認

### 実装ファイル

| ファイル | 用途 |
|---------|------|
| `infra/lib/construct/security/waf-construct.ts` | WAF Construct 実装 |
| `infra/test/construct/security/waf-construct.test.ts` | テストコード |

---

## 11. 信頼性レベルサマリー

- **総項目数**: 9項目
- 🔵 **青信号**: 9項目 (100%)
- 🟡 **黄信号**: 0項目 (0%)
- 🔴 **赤信号**: 0項目 (0%)

**品質評価**: 高品質

---

## 12. コマンドリファレンス

```bash
# テスト実行
cd infra && npm test

# 特定テストファイル実行
cd infra && npm test -- waf-construct.test.ts

# テスト（watch モード）
cd infra && npm test -- --watch

# ビルド
cd infra && npm run build

# CDK synth（テンプレート確認）
cd infra && npm run cdk synth
```
