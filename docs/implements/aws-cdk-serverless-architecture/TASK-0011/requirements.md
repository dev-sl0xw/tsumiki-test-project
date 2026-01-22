# TASK-0011: WAF Construct TDD 要件定義書

**作成日**: 2026-01-22
**タスクID**: TASK-0011
**機能名**: WAF Construct（AWS WAF WebACL 管理）
**要件名**: aws-cdk-serverless-architecture
**信頼性評価**: 🔵 高品質

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 機能概要 🔵

AWS WAF WebACL を構築する CDK Construct を実装します。AWS Managed Rules（Common Rule Set、SQL Injection）の適用、ALB との関連付け、ログ設定を含むエンタープライズグレードの Web アプリケーションファイアウォールを構成します。

- **参照したEARS要件**: REQ-033, REQ-034, NFR-103
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` (セキュリティ・配信層)

### 1.2 解決する問題 🔵

- Web アプリケーションに対するサイバー攻撃（XSS、SQL Injection、LFI、RFI 等）からの保護
- AWS Managed Rules による自動化された脅威検出と防御
- アプリケーションレベルのセキュリティ強化

- **参照したEARS要件**: NFR-103 (WAF による Web アプリケーション保護)
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` (セキュリティ要件)

### 1.3 想定されるユーザー 🔵

| ユーザー種別 | 用途 |
|-------------|------|
| インフラエンジニア | WAF リソースの構築・設定 |
| セキュリティエンジニア | WAF ルールの管理・監視 |
| 運用チーム | WAF ログの確認・インシデント対応 |

- **参照したユーザストーリー**: US-007 (セキュリティエンジニアとして)
- **参照した設計文書**: `docs/spec/aws-cdk-serverless-architecture/user-stories.md`

### 1.4 システム内での位置づけ 🔵

```
┌──────────────────────────────────────────────────────────────────┐
│                    Security Stack                                │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ SecurityGroup      │  │ IAMRole Construct  │                 │
│  │ Construct          │  │                    │                 │
│  └────────────────────┘  └────────────────────┘                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  WAF Construct (TASK-0011)                 │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │   WebACL     │  │ Managed      │  │  CloudWatch      │ │ │
│  │  │              │  │ Rules        │  │  Logs            │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │            WebACL Association (ALB)                  │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` (CDK Stack 構成)

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力インターフェース（Props） 🔵

```typescript
/**
 * WAF Construct の Props インターフェース
 * @description WAF WebACL を構築するための設定パラメータ
 */
export interface WafConstructProps {
  /**
   * 環境名 🔵
   * @description リソース命名に使用（例: "dev", "prod"）
   * @required
   */
  readonly envName: string;

  /**
   * WAF スコープ 🔵
   * @description REGIONAL: ALB/API Gateway用、CLOUDFRONT: CloudFront用
   * @default "REGIONAL"
   */
  readonly scope?: 'REGIONAL' | 'CLOUDFRONT';

  /**
   * ログ記録の有効化 🔵
   * @description CloudWatch Logs へのログ出力設定
   * @default true
   */
  readonly enableLogging?: boolean;

  /**
   * ログ保持期間（日数） 🟡
   * @description CloudWatch Logs のログ保持期間
   * @default 30 (prod) / 3 (dev)
   */
  readonly logRetentionDays?: number;

  /**
   * カスタム Managed Rules 🟡
   * @description デフォルト以外の Managed Rules を使用する場合に指定
   * @default DEFAULT_WAF_RULES (Common RuleSet + SQLi RuleSet)
   */
  readonly managedRules?: WafManagedRule[];
}
```

- **参照したEARS要件**: REQ-033, REQ-034
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts` (WafConfig)

### 2.2 出力インターフェース（公開プロパティ） 🔵

```typescript
/**
 * WAF Construct の公開プロパティ
 */
export class WafConstruct extends Construct {
  /**
   * WAF WebACL リソース 🔵
   * @description 作成された WebACL インスタンス
   */
  public readonly webAcl: wafv2.CfnWebACL;

  /**
   * WebACL ARN 🔵
   * @description WebACL の Amazon Resource Name
   */
  public readonly webAclArn: string;

  /**
   * WebACL ID 🟡
   * @description WebACL の ID（メトリクス参照用）
   */
  public readonly webAclId: string;

  /**
   * ログ出力先ロググループ 🔵
   * @description WAF ログの出力先（enableLogging: true の場合のみ）
   */
  public readonly logGroup?: logs.ILogGroup;
}
```

- **参照したEARS要件**: REQ-033
- **参照した設計文書**: `docs/tasks/aws-cdk-serverless-architecture/TASK-0011.md`

### 2.3 公開メソッド 🔵

```typescript
/**
 * ALB との関連付け
 * @param albArn ALB の ARN
 * @returns 作成された WebACLAssociation リソース
 */
public associateWithAlb(albArn: string): wafv2.CfnWebACLAssociation;

/**
 * API Gateway との関連付け 🟡
 * @param apiGatewayArn API Gateway Stage の ARN
 * @returns 作成された WebACLAssociation リソース
 */
public associateWithApiGateway(apiGatewayArn: string): wafv2.CfnWebACLAssociation;
```

- **参照したEARS要件**: REQ-033
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` (ALB)

### 2.4 型定義 🔵

```typescript
/**
 * WAF Managed Rule 設定
 */
export interface WafManagedRule {
  /** ルール名（AWS Managed Rules 名称） */
  readonly name: string;
  /** ベンダー名（'AWS' 固定） */
  readonly vendorName: 'AWS';
  /** 優先度（低い数値が先に評価） */
  readonly priority: number;
}

/**
 * デフォルト WAF ルール 🔵
 */
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

- **参照したEARS要件**: REQ-034
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts` (WafManagedRule, DEFAULT_WAF_RULES)

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 技術的制約 🔵

| 制約項目 | 制約内容 | 根拠 |
|---------|---------|------|
| スコープ | REGIONAL がデフォルト | REQ-033（ALB用） |
| リージョン | CLOUDFRONT スコープの場合は us-east-1 のみ | AWS 仕様 |
| ログ命名 | ロググループ名は `aws-waf-logs-` プレフィックス必須 | AWS 仕様 |
| ルール数 | WebACL あたり最大 1,500 WCU | AWS クォータ |

- **参照したEARS要件**: REQ-033, REQ-403
- **参照した設計文書**: `docs/implements/aws-cdk-serverless-architecture/TASK-0011/note.md` (技術的制約)

### 3.2 セキュリティ制約 🔵

| 制約項目 | 制約内容 | 根拠 |
|---------|---------|------|
| デフォルトアクション | Allow（ルールでブロック） | セキュリティベストプラクティス |
| Managed Rules | Common RuleSet + SQLi RuleSet 必須 | REQ-034 |
| ログ記録 | 本番環境では有効化必須 | 監査要件 |
| メトリクス | CloudWatch メトリクス有効化必須 | 運用要件 |

- **参照したEARS要件**: REQ-034, NFR-103
- **参照した設計文書**: `docs/spec/aws-cdk-serverless-architecture/requirements.md`

### 3.3 パフォーマンス制約 🔵

| 制約項目 | 制約内容 | 根拠 |
|---------|---------|------|
| ルール優先度 | Common RuleSet: 1、SQLi: 2 | 評価順序の最適化 |
| 過剰ルール禁止 | 必要最小限のルールセット | レイテンシ影響 |
| サンプリング | リクエストサンプリング有効化推奨 | 分析用 |

- **参照したEARS要件**: NFR-103
- **参照した設計文書**: `docs/implements/aws-cdk-serverless-architecture/TASK-0011/note.md` (パフォーマンス要件)

### 3.4 コーディング規約制約 🔵

| 制約項目 | 制約内容 | 根拠 |
|---------|---------|------|
| 命名規則 | `${envName}-waf-webacl` 形式 | プロジェクト規約 |
| JSDoc | 全公開メンバーに必須 | コーディング規約 |
| readonly | Props の全プロパティに適用 | TypeScript ベストプラクティス |
| 定数化 | マジックナンバー禁止 | コーディング規約 |

- **参照した設計文書**: `docs/implements/aws-cdk-serverless-architecture/TASK-0011/note.md` (コーディング規約)

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

#### パターン 1: 最小構成（デフォルト設定）

```typescript
// 最小構成での WAF Construct 作成
const wafConstruct = new WafConstruct(this, 'Waf', {
  envName: 'dev',
});

// ALB との関連付け
wafConstruct.associateWithAlb(alb.loadBalancerArn);
```

#### パターン 2: 本番環境向け構成

```typescript
// 本番環境向け構成
const wafConstruct = new WafConstruct(this, 'Waf', {
  envName: 'prod',
  scope: 'REGIONAL',
  enableLogging: true,
  logRetentionDays: 30,
});

// ALB との関連付け
wafConstruct.associateWithAlb(alb.loadBalancerArn);
```

#### パターン 3: カスタムルール構成 🟡

```typescript
// カスタムルールを追加した構成
const wafConstruct = new WafConstruct(this, 'Waf', {
  envName: 'prod',
  managedRules: [
    ...DEFAULT_WAF_RULES,
    {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      vendorName: 'AWS',
      priority: 3,
    },
  ],
});
```

- **参照したEARS要件**: REQ-033, REQ-034
- **参照した設計文書**: `docs/tasks/aws-cdk-serverless-architecture/TASK-0011.md` (Props インターフェース設計)

### 4.2 エッジケース 🔵

#### EDGE-WAF-01: スコープ不一致 🔵

| 項目 | 内容 |
|------|------|
| シナリオ | CLOUDFRONT スコープの WebACL を ALB に関連付けしようとした |
| 期待動作 | エラーメッセージを出力し、関連付けを拒否 |
| 対応 | スコープに応じた関連付けメソッドの検証 |

#### EDGE-WAF-02: ログ設定不正 🔵

| 項目 | 内容 |
|------|------|
| シナリオ | ロググループ名に `aws-waf-logs-` プレフィックスがない |
| 期待動作 | CloudFormation デプロイエラー |
| 対応 | Construct 内でプレフィックスを自動付与 |

#### EDGE-WAF-03: 重複関連付け 🟡

| 項目 | 内容 |
|------|------|
| シナリオ | 同一リソースに複数の WebACL を関連付け |
| 期待動作 | エラーまたは上書き（AWS の動作に依存） |
| 対応 | 関連付け前の検証または警告出力 |

#### EDGE-WAF-04: 空の Managed Rules 🟡

| 項目 | 内容 |
|------|------|
| シナリオ | `managedRules: []` で空配列を指定 |
| 期待動作 | デフォルトルールを適用 |
| 対応 | 空配列の場合はデフォルトルールにフォールバック |

- **参照したEARS要件**: EDGE-001〜003 のパターンを参考
- **参照した設計文書**: `docs/spec/aws-cdk-serverless-architecture/requirements.md` (Edge ケース)

### 4.3 エラーケース 🔵

#### ERR-WAF-01: 必須パラメータ欠落 🔵

```typescript
// エラーケース: envName が未指定
const wafConstruct = new WafConstruct(this, 'Waf', {
  // envName: undefined - TypeScript コンパイルエラー
});
```

**期待動作**: TypeScript コンパイルエラー

#### ERR-WAF-02: 無効なスコープ値 🔵

```typescript
// エラーケース: 無効なスコープ
const wafConstruct = new WafConstruct(this, 'Waf', {
  envName: 'dev',
  scope: 'INVALID' as any, // TypeScript で防止
});
```

**期待動作**: TypeScript 型チェックエラー（ランタイムでは CloudFormation エラー）

#### ERR-WAF-03: 無効な ALB ARN 🟡

```typescript
// エラーケース: 無効な ARN 形式
wafConstruct.associateWithAlb('invalid-arn');
```

**期待動作**: CloudFormation デプロイエラー

- **参照したEARS要件**: REQ-033, REQ-034
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/interfaces.ts`

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー

- **US-007**: セキュリティエンジニアとして、Web アプリケーションを一般的な脅威から保護したい

### 5.2 参照した機能要件

| 要件ID | 要件内容 | 本機能での実現方法 |
|--------|---------|-------------------|
| REQ-033 | WAF を CloudFront に接続 🔵 | `scope: 'CLOUDFRONT'` オプション対応、ALB 用に `scope: 'REGIONAL'` 対応 |
| REQ-034 | AWS Managed Rules 適用 🔵 | DEFAULT_WAF_RULES として Common RuleSet + SQLi RuleSet を実装 |

### 5.3 参照した非機能要件

| 要件ID | 要件内容 | 本機能での実現方法 |
|--------|---------|-------------------|
| NFR-103 | WAF による Web アプリケーション保護 🔵 | WebACL 作成、Managed Rules 適用、ALB 関連付け |

### 5.4 参照したEdgeケース

| 要件ID | 要件内容 | 本機能での対応 |
|--------|---------|---------------|
| EDGE-WAF-01 | スコープ不一致 🔵 | メソッドによる検証 |
| EDGE-WAF-02 | ログ設定不正 🔵 | プレフィックス自動付与 |
| EDGE-WAF-03 | 重複関連付け 🟡 | 警告出力 |
| EDGE-WAF-04 | 空の Managed Rules 🟡 | デフォルトフォールバック |

### 5.5 参照した受け入れ基準

- [ ] WAF WebACL が正常に作成される
- [ ] AWS Managed Rules - Common Rule Set が適用されている
- [ ] AWS Managed Rules - SQL Injection が適用されている
- [ ] CloudWatch Logs へのログ出力が設定されている
- [ ] ALB との関連付けが可能な設計になっている
- [ ] すべてのユニットテストが通過している

### 5.6 参照した設計文書

| 文書種別 | ファイルパス | 該当セクション |
|---------|------------|---------------|
| アーキテクチャ | `docs/design/aws-cdk-serverless-architecture/architecture.md` | セキュリティ・配信層、WAF |
| データフロー | `docs/design/aws-cdk-serverless-architecture/dataflow.md` | CloudFront → ALB フロー |
| 型定義 | `docs/design/aws-cdk-serverless-architecture/interfaces.ts` | WafConfig, WafManagedRule, DEFAULT_WAF_RULES |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0011/note.md` | 全セクション |

---

## 6. テスト要件サマリー

### 6.1 テストケースカテゴリ

| カテゴリ | テストケース数 | 信頼性 |
|---------|--------------|--------|
| WebACL 作成 | 3 | 🔵 |
| Managed Rules 適用 | 3 | 🔵 |
| ログ設定 | 2 | 🔵 |
| ALB 関連付け | 2 | 🔵 |
| エッジケース | 4 | 🟡 |

### 6.2 優先度

| 優先度 | テスト内容 |
|--------|----------|
| P0（必須） | WebACL 作成、Managed Rules 適用 |
| P1（重要） | ログ設定、ALB 関連付け |
| P2（推奨） | エッジケース、エラーケース |

---

## 7. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 28 | 85% | EARS要件定義書・設計文書を参考にしてほぼ推測していない |
| 🟡 黄信号 | 5 | 15% | EARS要件定義書・設計文書から妥当な推測 |
| 🔴 赤信号 | 0 | 0% | EARS要件定義書・設計文書にない推測 |

### 品質判定結果

```
✅ 高品質:
- 要件の曖昧さ: なし
- 入出力定義: 完全
- 制約条件: 明確
- 実装可能性: 確実
- 信頼性レベル: 🔵（青信号）が85%以上
```

---

## 8. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-testcases aws-cdk-serverless-architecture TASK-0011` でテストケースの洗い出しを行います。
