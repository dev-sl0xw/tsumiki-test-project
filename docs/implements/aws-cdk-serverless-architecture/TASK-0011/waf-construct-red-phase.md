# TASK-0011: WAF Construct TDD Red Phase 記録

**作成日**: 2026-01-22
**タスクID**: TASK-0011
**機能名**: WAF Construct（AWS WAF WebACL 管理）
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Red Phase（失敗テスト作成）

---

## 1. 作成したテストケース一覧

| テストケースID | テスト名 | 信頼性 | 状態 |
|---------------|---------|--------|------|
| TC-WAF-001 | WebACL リソース作成確認 | 🔵 | FAIL |
| TC-WAF-002 | WebACL スコープ設定確認（REGIONAL） | 🔵 | FAIL |
| TC-WAF-003 | WebACL デフォルトアクション設定確認 | 🔵 | FAIL |
| TC-WAF-004 | WebACL 名に環境名が含まれること | 🔵 | FAIL |
| TC-WAF-005 | VisibilityConfig 設定確認 | 🔵 | FAIL |
| TC-WAF-006 | AWSManagedRulesCommonRuleSet 適用確認 | 🔵 | FAIL |
| TC-WAF-007 | AWSManagedRulesSQLiRuleSet 適用確認 | 🔵 | FAIL |
| TC-WAF-008 | Common RuleSet 優先度確認（Priority: 1） | 🔵 | FAIL |
| TC-WAF-009 | SQLi RuleSet 優先度確認（Priority: 2） | 🔵 | FAIL |
| TC-WAF-010 | Managed Rules OverrideAction 設定確認 | 🔵 | FAIL |
| TC-WAF-011 | 各ルールの VisibilityConfig 設定確認 | 🔵 | FAIL |
| TC-WAF-012 | CloudWatch Logs ロググループ作成確認 | 🔵 | FAIL |
| TC-WAF-013 | ロググループ名プレフィックス確認 | 🔵 | FAIL |
| TC-WAF-014 | ログ保持期間設定確認 | 🔵 | FAIL |
| TC-WAF-015 | WAF LoggingConfiguration 作成確認 | 🔵 | FAIL |
| TC-WAF-016 | enableLogging: false 時のロググループ不在確認 | 🔵 | PASS* |
| TC-WAF-017 | associateWithAlb メソッドで WebACLAssociation が作成されること | 🔵 | FAIL |
| TC-WAF-018 | WebACLAssociation ResourceArn 設定確認 | 🔵 | FAIL |
| TC-WAF-019 | WebACLAssociation WebAclArn 設定確認 | 🔵 | FAIL |
| TC-WAF-020 | webAcl プロパティが定義されていること | 🔵 | FAIL |
| TC-WAF-021 | webAclArn プロパティが定義されていること | 🔵 | FAIL |
| TC-WAF-022 | logGroup プロパティの条件付き存在確認 | 🔵 | FAIL |
| TC-WAF-023 | デフォルト設定での正常動作確認 | 🔵 | FAIL |
| TC-WAF-024 | scope: 'CLOUDFRONT' 設定確認 | 🟡 | FAIL |
| TC-WAF-025 | カスタム managedRules 指定確認 | 🟡 | FAIL |
| TC-WAF-026 | 空の managedRules 配列時のデフォルトフォールバック | 🟡 | FAIL |
| TC-WAF-027 | 複数回の associateWithAlb 呼び出し確認 | 🟡 | FAIL |
| TC-WAF-028 | 作成されるリソース総数確認 | 🔵 | FAIL |
| TC-WAF-029 | WebACL に Rules が 2 つ存在すること（デフォルト設定） | 🔵 | FAIL |
| TC-WAF-030 | 危険なルール（過剰に許可するルール）が含まれていないこと | 🔵 | FAIL |

> *TC-WAF-016 はスタブ実装でも通過（ログ未作成のため）

---

## 2. テストファイル

### ファイルパス

`infra/test/construct/security/waf-construct.test.ts`

### テスト実行コマンド

```bash
cd infra && npm test -- waf-construct.test.ts
```

### テスト実行結果

```
FAIL test/construct/security/waf-construct.test.ts
  WafConstruct
    TC-WAF-001: WebACL リソース作成確認
      ✕ WebACL リソースが作成されること
    TC-WAF-002: WebACL スコープ設定確認（REGIONAL）
      ✕ WebACL スコープが REGIONAL に設定されること
    TC-WAF-003: WebACL デフォルトアクション設定確認
      ✕ WebACL デフォルトアクションが Allow に設定されること
    ... (29 tests failed, 1 passed)

Test Suites: 1 failed, 1 total
Tests:       29 failed, 1 passed, 30 total
```

---

## 3. スタブ実装ファイル

### ファイルパス

`infra/lib/construct/security/waf-construct.ts`

### 実装内容

スタブ実装は以下の内容を含みます：

1. **型定義**:
   - `WafManagedRule` インターフェース
   - `DEFAULT_WAF_RULES` 定数
   - `WafConstructProps` インターフェース

2. **WafConstruct クラス**:
   - `webAcl` プロパティ（未定義）
   - `webAclArn` プロパティ（未定義）
   - `logGroup` プロパティ（未定義）
   - `associateWithAlb()` メソッド（何もしない）
   - `associateWithApiGateway()` メソッド（何もしない）

---

## 4. 期待される失敗内容

### 4.1 WebACL リソースの不在

```
Message:
  Expected 1 resources of type AWS::WAFv2::WebACL but found 0
```

### 4.2 プロパティの未定義

```
Expected: defined
Received: undefined
```

### 4.3 ログリソースの不在

```
Message:
  Expected 1 resources of type AWS::Logs::LogGroup but found 0
```

### 4.4 WebACLAssociation の不在

```
Message:
  Expected 1 resources of type AWS::WAFv2::WebACLAssociation but found 0
```

---

## 5. Green フェーズで実装すべき内容

### 5.1 必須実装項目

1. **WebACL リソース作成**
   - `wafv2.CfnWebACL` を作成
   - Scope を 'REGIONAL' または 'CLOUDFRONT' に設定
   - DefaultAction を Allow に設定
   - Name に envName を含める
   - VisibilityConfig を設定

2. **Managed Rules 適用**
   - AWSManagedRulesCommonRuleSet（Priority: 1）
   - AWSManagedRulesSQLiRuleSet（Priority: 2）
   - OverrideAction: None
   - 各ルールに VisibilityConfig を設定

3. **ログ設定（enableLogging: true の場合）**
   - `logs.LogGroup` を作成
   - LogGroupName に `aws-waf-logs-` プレフィックスを付与
   - RetentionInDays を設定
   - `wafv2.CfnLoggingConfiguration` を作成

4. **公開プロパティの設定**
   - `webAcl` プロパティに CfnWebACL を設定
   - `webAclArn` プロパティに WebACL の ARN を設定
   - `logGroup` プロパティに LogGroup を設定（ログ有効時のみ）

5. **ALB 関連付けメソッド**
   - `associateWithAlb()` で `wafv2.CfnWebACLAssociation` を作成
   - ResourceArn に ALB ARN を設定
   - WebACLArn に WebACL の ARN を設定

### 5.2 エッジケース対応

1. **scope: 'CLOUDFRONT'** のサポート
2. **カスタム managedRules** の適用
3. **空の managedRules** 配列時のデフォルトフォールバック
4. **複数回の associateWithAlb** 呼び出し対応

---

## 6. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 26 | 87% | 要件定義書・設計文書を参考にしてほぼ推測していない |
| 🟡 黄信号 | 4 | 13% | 要件定義書・設計文書から妥当な推測 |
| 🔴 赤信号 | 0 | 0% | 要件定義書・設計文書にない推測 |

---

## 7. 品質判定結果

```
✅ 高品質:
- テスト実行: 成功（29 tests failed, 1 passed - 期待通り）
- 期待値: 明確で具体的
- アサーション: CDK assertions (Template, Match) を適切に使用
- 実装方針: 明確（全30テストケースを網羅）
- 信頼性レベル: 🔵（青信号）が87%

⚠️ 注意事項:
- TC-WAF-016 はスタブ実装でも通過（意図的）
- Green フェーズで全テストを通過させる必要あり
```

---

## 8. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-green` で Green フェーズ（最小実装）を開始します。
