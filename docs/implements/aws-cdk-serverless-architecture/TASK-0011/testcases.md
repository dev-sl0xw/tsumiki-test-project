# TASK-0011: WAF Construct TDD テストケース一覧

**作成日**: 2026-01-22
**タスクID**: TASK-0011
**機能名**: WAF Construct（AWS WAF WebACL 管理）
**要件名**: aws-cdk-serverless-architecture
**テストファイル**: `infra/test/construct/security/waf-construct.test.ts`

---

## 1. 開発言語・フレームワーク

- **プログラミング言語**: TypeScript ~5.6.3
  - **言語選択の理由**: プロジェクト全体で TypeScript を使用、型安全性の確保
  - **テストに適した機能**: 型推論、インターフェース定義、コンパイル時チェック
- **テストフレームワーク**: Jest ^29.7.0 + aws-cdk-lib/assertions
  - **フレームワーク選択の理由**: CDK 標準のテストユーティリティ、Template.fromStack での CloudFormation 検証
  - **テスト実行環境**: Node.js、`npm test` コマンド
- 🔵 信頼性: note.md 技術スタックセクション、package.json より

---

## 2. 正常系テストケース（基本的な動作）

### TC-WAF-001: WebACL リソース作成確認 🔵

- **テスト名**: WebACL リソースが正しく作成されること
  - **何をテストするか**: WafConstruct インスタンス化時に AWS::WAFv2::WebACL リソースが作成されること
  - **期待される動作**: CloudFormation テンプレートに WebACL リソースが含まれる
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: 最小構成での WAF Construct 作成
- **期待される結果**: `AWS::WAFv2::WebACL` リソースが 1 つ作成される
  - **期待結果の理由**: TASK-0011.md の完了条件「WAF WebACL が正常に作成される」より
- **テストの目的**: WAF Construct の基本機能確認
  - **確認ポイント**: リソースの存在確認
- 🔵 信頼性: REQ-033、TASK-0011.md 完了条件より

### TC-WAF-002: WebACL スコープ設定確認（REGIONAL） 🔵

- **テスト名**: WebACL スコープが REGIONAL に設定されること
  - **何をテストするか**: デフォルトスコープが REGIONAL であること
  - **期待される動作**: WebACL の Scope プロパティが REGIONAL
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    scope: 'REGIONAL'
  }
  ```
  - **入力データの意味**: ALB 用のリージョナル WebACL
- **期待される結果**: `Scope: 'REGIONAL'` が設定される
  - **期待結果の理由**: note.md 技術的制約「REGIONAL: ALB、API Gateway 等に適用」より
- **テストの目的**: スコープ設定の正確性確認
  - **確認ポイント**: Scope プロパティ値の検証
- 🔵 信頼性: note.md 技術的制約、REQ-033 より

### TC-WAF-003: WebACL デフォルトアクション設定確認 🔵

- **テスト名**: WebACL デフォルトアクションが Allow に設定されること
  - **何をテストするか**: マッチしないリクエストが許可されること
  - **期待される動作**: DefaultAction が Allow 設定
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: 標準構成での WAF 作成
- **期待される結果**: `DefaultAction: { Allow: {} }` が設定される
  - **期待結果の理由**: note.md セキュリティ考慮事項「デフォルトアクション: Allow（ルールでブロック）」より
- **テストの目的**: デフォルトアクションの正確性確認
  - **確認ポイント**: DefaultAction プロパティ値の検証
- 🔵 信頼性: note.md セキュリティ考慮事項、TASK-0011.md より

### TC-WAF-004: WebACL 名に環境名が含まれること 🔵

- **テスト名**: WebACL 名に envName が含まれること
  - **何をテストするか**: リソース命名規則の遵守
  - **期待される動作**: Name プロパティに envName が含まれる
- **入力値**:
  ```typescript
  {
    envName: 'prod'
  }
  ```
  - **入力データの意味**: 本番環境を想定した命名確認
- **期待される結果**: Name に `prod` が含まれる（例: `prod-waf-webacl`）
  - **期待結果の理由**: note.md リソース命名制約「WebACL 名は環境名（envName）を含める」より
- **テストの目的**: 命名規則の遵守確認
  - **確認ポイント**: Name プロパティ値の検証
- 🔵 信頼性: note.md リソース命名制約、コーディング規約より

### TC-WAF-005: VisibilityConfig 設定確認 🔵

- **テスト名**: VisibilityConfig が正しく設定されること
  - **何をテストするか**: メトリクス・サンプリング設定の確認
  - **期待される動作**: CloudWatch メトリクスとサンプリングが有効
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: 標準構成での設定確認
- **期待される結果**:
  ```typescript
  {
    SampledRequestsEnabled: true,
    CloudWatchMetricsEnabled: true,
    MetricName: Match.stringLikeRegexp('.*')
  }
  ```
  - **期待結果の理由**: note.md セキュリティ考慮事項「サンプリングリクエストを有効化、CloudWatch メトリクスを有効化」より
- **テストの目的**: 可視性設定の正確性確認
  - **確認ポイント**: VisibilityConfig の各プロパティ
- 🔵 信頼性: note.md セキュリティ考慮事項、運用要件より

---

## 3. AWS Managed Rules テストケース

### TC-WAF-006: AWSManagedRulesCommonRuleSet 適用確認 🔵

- **テスト名**: AWSManagedRulesCommonRuleSet が適用されていること
  - **何をテストするか**: Common Rule Set による一般的な脆弱性保護
  - **期待される動作**: Rules 配列に Common RuleSet が含まれる
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: デフォルト設定での Managed Rules 確認
- **期待される結果**:
  ```typescript
  {
    Name: 'AWSManagedRulesCommonRuleSet',
    Statement: {
      ManagedRuleGroupStatement: {
        VendorName: 'AWS',
        Name: 'AWSManagedRulesCommonRuleSet'
      }
    }
  }
  ```
  - **期待結果の理由**: REQ-034「AWS Managed Rules (Common RuleSet) を適用」より
- **テストの目的**: Common RuleSet の適用確認
  - **確認ポイント**: ManagedRuleGroupStatement の VendorName と Name
- 🔵 信頼性: REQ-034、TASK-0011.md 完了条件より

### TC-WAF-007: AWSManagedRulesSQLiRuleSet 適用確認 🔵

- **テスト名**: AWSManagedRulesSQLiRuleSet が適用されていること
  - **何をテストするか**: SQL Injection Rule Set による SQLi 保護
  - **期待される動作**: Rules 配列に SQLi RuleSet が含まれる
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: デフォルト設定での SQLi ルール確認
- **期待される結果**:
  ```typescript
  {
    Name: 'AWSManagedRulesSQLiRuleSet',
    Statement: {
      ManagedRuleGroupStatement: {
        VendorName: 'AWS',
        Name: 'AWSManagedRulesSQLiRuleSet'
      }
    }
  }
  ```
  - **期待結果の理由**: REQ-034「AWS Managed Rules (SQL Injection 等) を適用」より
- **テストの目的**: SQLi RuleSet の適用確認
  - **確認ポイント**: ManagedRuleGroupStatement の VendorName と Name
- 🔵 信頼性: REQ-034、TASK-0011.md 完了条件より

### TC-WAF-008: Common RuleSet 優先度確認（Priority: 1） 🔵

- **テスト名**: Common RuleSet の優先度が 1 であること
  - **何をテストするか**: ルール評価順序の正確性
  - **期待される動作**: Common RuleSet が最初に評価される
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: デフォルト優先度設定の確認
- **期待される結果**: `Priority: 1` が設定される
  - **期待結果の理由**: note.md セキュリティ考慮事項「Common Rule Set: 優先度 1（最初に評価）」より
- **テストの目的**: 優先度設定の正確性確認
  - **確認ポイント**: Priority プロパティ値
- 🔵 信頼性: note.md セキュリティ考慮事項、設計文書より

### TC-WAF-009: SQLi RuleSet 優先度確認（Priority: 2） 🔵

- **テスト名**: SQLi RuleSet の優先度が 2 であること
  - **何をテストするか**: ルール評価順序の正確性
  - **期待される動作**: SQLi RuleSet が 2 番目に評価される
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: デフォルト優先度設定の確認
- **期待される結果**: `Priority: 2` が設定される
  - **期待結果の理由**: note.md セキュリティ考慮事項「SQL Injection Rule Set: 優先度 2」より
- **テストの目的**: 優先度設定の正確性確認
  - **確認ポイント**: Priority プロパティ値
- 🔵 信頼性: note.md セキュリティ考慮事項、設計文書より

### TC-WAF-010: Managed Rules OverrideAction 設定確認 🔵

- **テスト名**: Managed Rules の OverrideAction が none であること
  - **何をテストするか**: マネージドルールのアクションがオーバーライドされないこと
  - **期待される動作**: OverrideAction が `{ None: {} }` 設定
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: 標準構成での OverrideAction 確認
- **期待される結果**: `OverrideAction: { None: {} }` が設定される
  - **期待結果の理由**: TASK-0011.md 設計「overrideAction: { none: {} }」より
- **テストの目的**: OverrideAction 設定の正確性確認
  - **確認ポイント**: OverrideAction プロパティ値
- 🔵 信頼性: TASK-0011.md、note.md 設計仕様より

### TC-WAF-011: 各ルールの VisibilityConfig 設定確認 🔵

- **テスト名**: 各 Managed Rule に VisibilityConfig が設定されていること
  - **何をテストするか**: ルール単位のメトリクス・サンプリング設定
  - **期待される動作**: 各ルールに VisibilityConfig が含まれる
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: 標準構成での確認
- **期待される結果**: 各ルールに以下が設定される
  ```typescript
  {
    SampledRequestsEnabled: true,
    CloudWatchMetricsEnabled: true,
    MetricName: Match.stringLikeRegexp('.*Metric.*')
  }
  ```
  - **期待結果の理由**: TASK-0011.md 設計「visibilityConfig: { sampledRequestsEnabled: true, ... }」より
- **テストの目的**: ルール単位の可視性設定確認
  - **確認ポイント**: 各ルールの VisibilityConfig
- 🔵 信頼性: TASK-0011.md 設計仕様、note.md より

---

## 4. ログ設定テストケース

### TC-WAF-012: CloudWatch Logs ロググループ作成確認 🔵

- **テスト名**: CloudWatch Logs ロググループが作成されること
  - **何をテストするか**: WAF ログ出力先のロググループ作成
  - **期待される動作**: AWS::Logs::LogGroup リソースが作成される
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    enableLogging: true
  }
  ```
  - **入力データの意味**: ログ記録有効化での確認
- **期待される結果**: `AWS::Logs::LogGroup` リソースが作成される
  - **期待結果の理由**: TASK-0011.md 完了条件「CloudWatch Logs へのログ出力が設定されている」より
- **テストの目的**: ログ基盤の作成確認
  - **確認ポイント**: LogGroup リソースの存在
- 🔵 信頼性: TASK-0011.md 完了条件、note.md ログ設定より

### TC-WAF-013: ロググループ名プレフィックス確認 🔵

- **テスト名**: ロググループ名が `aws-waf-logs-` プレフィックスで始まること
  - **何をテストするか**: AWS WAF ログ設定の必須プレフィックス
  - **期待される動作**: LogGroupName が `aws-waf-logs-` で始まる
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    enableLogging: true
  }
  ```
  - **入力データの意味**: ログ記録有効化での命名確認
- **期待される結果**: LogGroupName が `aws-waf-logs-` プレフィックスを持つ
  - **期待結果の理由**: note.md 技術的制約「ロググループ名は `aws-waf-logs-` プレフィックスで始まる必要がある」より
- **テストの目的**: AWS 仕様準拠の確認
  - **確認ポイント**: LogGroupName プロパティ値のプレフィックス
- 🔵 信頼性: note.md 技術的制約、AWS ドキュメントより

### TC-WAF-014: ログ保持期間設定確認 🔵

- **テスト名**: ログ保持期間が設定されていること
  - **何をテストするか**: RetentionInDays プロパティの設定
  - **期待される動作**: ログ保持期間が数値で設定される
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    enableLogging: true,
    logRetentionDays: 30
  }
  ```
  - **入力データの意味**: 保持期間を明示的に指定
- **期待される結果**: `RetentionInDays: 30` が設定される
  - **期待結果の理由**: requirements.md「ログ保持期間（日数）」プロパティ定義より
- **テストの目的**: ログ保持設定の正確性確認
  - **確認ポイント**: RetentionInDays プロパティ値
- 🔵 信頼性: requirements.md Props インターフェース、note.md より

### TC-WAF-015: WAF LoggingConfiguration 作成確認 🔵

- **テスト名**: WAF LoggingConfiguration が作成されること
  - **何をテストするか**: WebACL とロググループの関連付け
  - **期待される動作**: AWS::WAFv2::LoggingConfiguration リソースが作成される
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    enableLogging: true
  }
  ```
  - **入力データの意味**: ログ記録有効化での関連付け確認
- **期待される結果**: `AWS::WAFv2::LoggingConfiguration` リソースが作成される
  - **期待結果の理由**: WAF ログ設定には LoggingConfiguration リソースが必要
- **テストの目的**: ログ設定リソースの作成確認
  - **確認ポイント**: LoggingConfiguration リソースの存在
- 🔵 信頼性: AWS WAF ドキュメント、TASK-0011.md より

### TC-WAF-016: enableLogging: false 時のロググループ不在確認 🔵

- **テスト名**: enableLogging: false の場合、ロググループが作成されないこと
  - **何をテストするか**: ログ記録無効化時の動作
  - **期待される動作**: LogGroup リソースが作成されない
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    enableLogging: false
  }
  ```
  - **入力データの意味**: ログ記録を明示的に無効化
- **期待される結果**: WAF 関連の LogGroup が作成されない
  - **期待結果の理由**: オプション設定が正しく反映されること
- **テストの目的**: オプション機能の無効化確認
  - **確認ポイント**: LogGroup リソースの不在
- 🔵 信頼性: requirements.md Props インターフェース「enableLogging?: boolean」より

---

## 5. ALB 関連付けテストケース

### TC-WAF-017: associateWithAlb メソッドで WebACLAssociation が作成されること 🔵

- **テスト名**: associateWithAlb 呼び出しで WebACLAssociation が作成されること
  - **何をテストするか**: ALB との関連付け機能
  - **期待される動作**: AWS::WAFv2::WebACLAssociation リソースが作成される
- **入力値**:
  ```typescript
  const wafConstruct = new WafConstruct(stack, 'Waf', { envName: 'dev' });
  wafConstruct.associateWithAlb('arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/my-alb/1234567890');
  ```
  - **入力データの意味**: ALB ARN を指定した関連付け
- **期待される結果**: `AWS::WAFv2::WebACLAssociation` リソースが作成される
  - **期待結果の理由**: TASK-0011.md 完了条件「ALB との関連付けが可能な設計になっている」より
- **テストの目的**: ALB 関連付け機能の確認
  - **確認ポイント**: WebACLAssociation リソースの存在
- 🔵 信頼性: TASK-0011.md 完了条件、ALB 関連付け機能設計より

### TC-WAF-018: WebACLAssociation ResourceArn 設定確認 🔵

- **テスト名**: WebACLAssociation の ResourceArn が正しく設定されること
  - **何をテストするか**: 関連付け先の ARN 設定
  - **期待される動作**: ResourceArn に ALB ARN が設定される
- **入力値**:
  ```typescript
  const albArn = 'arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/my-alb/1234567890';
  wafConstruct.associateWithAlb(albArn);
  ```
  - **入力データの意味**: 有効な ALB ARN 形式
- **期待される結果**: `ResourceArn: albArn` が設定される
  - **期待結果の理由**: TASK-0011.md 設計「resourceArn: albArn」より
- **テストの目的**: ARN 参照の正確性確認
  - **確認ポイント**: ResourceArn プロパティ値
- 🔵 信頼性: TASK-0011.md 設計、requirements.md より

### TC-WAF-019: WebACLAssociation WebAclArn 設定確認 🔵

- **テスト名**: WebACLAssociation の WebAclArn が正しく設定されること
  - **何をテストするか**: WebACL ARN の参照設定
  - **期待される動作**: WebAclArn に WebACL の ARN が設定される
- **入力値**:
  ```typescript
  wafConstruct.associateWithAlb(albArn);
  ```
  - **入力データの意味**: 関連付けメソッド呼び出し
- **期待される結果**: `WebAclArn` が WebACL の `Fn::GetAtt` 参照になる
  - **期待結果の理由**: TASK-0011.md 設計「webAclArn: this.webAcl.attrArn」より
- **テストの目的**: WebACL 参照の正確性確認
  - **確認ポイント**: WebAclArn プロパティ値（GetAtt 参照）
- 🔵 信頼性: TASK-0011.md 設計、CDK パターンより

---

## 6. 公開プロパティテストケース

### TC-WAF-020: webAcl プロパティが定義されていること 🔵

- **テスト名**: webAcl プロパティが定義されていること
  - **何をテストするか**: 公開プロパティの存在確認
  - **期待される動作**: webAcl プロパティが undefined でないこと
- **入力値**:
  ```typescript
  const wafConstruct = new WafConstruct(stack, 'Waf', { envName: 'dev' });
  ```
  - **入力データの意味**: 標準構成での作成
- **期待される結果**: `wafConstruct.webAcl` が定義される
  - **期待結果の理由**: requirements.md 出力インターフェース「public readonly webAcl: wafv2.CfnWebACL」より
- **テストの目的**: 公開 API の正確性確認
  - **確認ポイント**: プロパティの存在
- 🔵 信頼性: requirements.md 出力インターフェース、note.md 型定義より

### TC-WAF-021: webAclArn プロパティが定義されていること 🔵

- **テスト名**: webAclArn プロパティが定義されていること
  - **何をテストするか**: ARN 公開プロパティの存在確認
  - **期待される動作**: webAclArn プロパティが undefined でないこと
- **入力値**:
  ```typescript
  const wafConstruct = new WafConstruct(stack, 'Waf', { envName: 'dev' });
  ```
  - **入力データの意味**: 標準構成での作成
- **期待される結果**: `wafConstruct.webAclArn` が定義される（ARN 形式の文字列またはトークン）
  - **期待結果の理由**: requirements.md 出力インターフェース「public readonly webAclArn: string」より
- **テストの目的**: 公開 API の正確性確認
  - **確認ポイント**: プロパティの存在
- 🔵 信頼性: requirements.md 出力インターフェース、note.md 型定義より

### TC-WAF-022: logGroup プロパティの条件付き存在確認 🔵

- **テスト名**: enableLogging: true の場合に logGroup プロパティが定義されていること
  - **何をテストするか**: 条件付き公開プロパティの存在確認
  - **期待される動作**: ログ有効時に logGroup が定義される
- **入力値**:
  ```typescript
  const wafConstruct = new WafConstruct(stack, 'Waf', {
    envName: 'dev',
    enableLogging: true
  });
  ```
  - **入力データの意味**: ログ記録有効化
- **期待される結果**: `wafConstruct.logGroup` が定義される
  - **期待結果の理由**: requirements.md 出力インターフェース「public readonly logGroup?: logs.ILogGroup」より
- **テストの目的**: 条件付きプロパティの正確性確認
  - **確認ポイント**: プロパティの存在
- 🔵 信頼性: requirements.md 出力インターフェースより

---

## 7. エッジケース・境界値テストケース

### TC-WAF-023: デフォルト設定での正常動作確認 🔵

- **テスト名**: 最小構成（envName のみ）で正常に作成されること
  - **境界値の意味**: 必須パラメータのみでの動作確認
  - **境界値での動作保証**: オプションパラメータのデフォルト値適用
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **境界値選択の根拠**: Props インターフェースの必須/オプション定義
  - **実際の使用場面**: 開発環境での簡易セットアップ
- **期待される結果**:
  - WebACL が作成される
  - scope が 'REGIONAL'（デフォルト）
  - enableLogging が true（デフォルト）
  - デフォルト Managed Rules が適用される
  - **境界での正確性**: デフォルト値が正しく適用される
  - **一貫した動作**: 省略パラメータでも安定動作
- **テストの目的**: デフォルト値の適用確認
  - **堅牢性の確認**: 最小構成での安定動作
- 🔵 信頼性: requirements.md Props インターフェース、note.md より

### TC-WAF-024: scope: 'CLOUDFRONT' 設定確認 🟡

- **テスト名**: scope: 'CLOUDFRONT' が正しく設定されること
  - **境界値の意味**: スコープの選択肢（REGIONAL vs CLOUDFRONT）
  - **境界値での動作保証**: 両スコープ値が正しく処理される
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    scope: 'CLOUDFRONT'
  }
  ```
  - **境界値選択の根拠**: union 型の 2 つの選択肢
  - **実際の使用場面**: CloudFront 用 WAF 設定
- **期待される結果**: `Scope: 'CLOUDFRONT'` が設定される
  - **境界での正確性**: スコープ値が正確に反映
  - **一貫した動作**: 両値で正常動作
- **テストの目的**: スコープ選択の網羅性確認
  - **堅牢性の確認**: 全選択肢での動作確認
- 🟡 信頼性: requirements.md Props インターフェース、note.md 技術的制約（将来対応）より

### TC-WAF-025: カスタム managedRules 指定確認 🟡

- **テスト名**: カスタム managedRules を指定した場合に正しく適用されること
  - **境界値の意味**: デフォルトルール vs カスタムルール
  - **境界値での動作保証**: カスタム設定が優先される
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    managedRules: [
      { name: 'AWSManagedRulesCommonRuleSet', vendorName: 'AWS', priority: 1 },
      { name: 'AWSManagedRulesKnownBadInputsRuleSet', vendorName: 'AWS', priority: 2 }
    ]
  }
  ```
  - **境界値選択の根拠**: デフォルト以外のルール構成
  - **実際の使用場面**: 追加のルールセット適用
- **期待される結果**: 指定した managedRules のみが適用される
  - **境界での正確性**: カスタム設定が正確に反映
  - **一貫した動作**: デフォルトとカスタム両方で正常動作
- **テストの目的**: カスタマイズ機能の確認
  - **堅牢性の確認**: カスタム設定での安定動作
- 🟡 信頼性: requirements.md Props インターフェース「managedRules?: WafManagedRule[]」より

### TC-WAF-026: 空の managedRules 配列時のデフォルトフォールバック 🟡

- **テスト名**: managedRules: [] の場合、デフォルトルールが適用されること
  - **エッジケースの概要**: 空配列指定時の動作
  - **エラー処理の重要性**: 意図しない無防備状態の防止
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    managedRules: []
  }
  ```
  - **不正な理由**: ルールなしは意図しない可能性が高い
  - **実際の発生シナリオ**: 設定ミスによる空配列
- **期待される結果**: デフォルト Managed Rules（Common + SQLi）が適用される
  - **エラーメッセージの内容**: なし（自動フォールバック）
  - **システムの安全性**: 無防備状態を防止
- **テストの目的**: エッジケースでの安全動作確認
  - **品質保証の観点**: セキュリティホールの防止
- 🟡 信頼性: requirements.md エッジケース EDGE-WAF-04「空の Managed Rules」より

### TC-WAF-027: 複数回の associateWithAlb 呼び出し確認 🟡

- **テスト名**: 複数の ALB に関連付けできること
  - **エッジケースの概要**: 同一 WebACL の複数リソース関連付け
  - **エラー処理の重要性**: 複数環境での共有利用
- **入力値**:
  ```typescript
  wafConstruct.associateWithAlb(albArn1);
  wafConstruct.associateWithAlb(albArn2);
  ```
  - **不正な理由**: 不正ではない（正常ケース）
  - **実際の発生シナリオ**: 複数 ALB での WAF 共有
- **期待される結果**: 2 つの WebACLAssociation が作成される
  - **エラーメッセージの内容**: なし
  - **システムの安全性**: 正常動作
- **テストの目的**: 複数関連付けの動作確認
  - **品質保証の観点**: 実運用シナリオへの対応
- 🟡 信頼性: requirements.md 公開メソッド設計、実運用想定より

---

## 8. 異常系テストケース

### TC-WAF-028: 作成されるリソース総数確認 🔵

- **テスト名**: WafConstruct で作成されるリソースが適切な数であること
  - **何をテストするか**: 不要リソースの作成防止
  - **期待される動作**: 必要最小限のリソースのみ作成
- **入力値**:
  ```typescript
  {
    envName: 'dev',
    enableLogging: true
  }
  ```
  - **入力データの意味**: 標準構成での確認
- **期待される結果**:
  - AWS::WAFv2::WebACL: 1
  - AWS::Logs::LogGroup: 1
  - AWS::WAFv2::LoggingConfiguration: 1
  - **期待結果の理由**: 設計で定義されたリソースのみ作成
- **テストの目的**: リソース数の正確性確認
  - **確認ポイント**: 各リソースタイプの数
- 🔵 信頼性: TASK-0011.md 設計、note.md より

### TC-WAF-029: WebACL に Rules が 2 つ存在すること（デフォルト設定） 🔵

- **テスト名**: デフォルト設定で 2 つの Managed Rules が適用されること
  - **何をテストするか**: デフォルト Managed Rules の適用数
  - **期待される動作**: Common + SQLi の 2 ルール
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: デフォルト設定での確認
- **期待される結果**: Rules 配列に 2 つのルールが含まれる
  - **期待結果の理由**: DEFAULT_WAF_RULES の定義より
- **テストの目的**: デフォルトルール数の確認
  - **確認ポイント**: Rules 配列の長さ
- 🔵 信頼性: requirements.md DEFAULT_WAF_RULES 定義より

---

## 9. セキュリティテストケース

### TC-WAF-030: 危険なルール（過剰に許可するルール）が含まれていないこと 🔵

- **テスト名**: 全トラフィックを許可するルールが含まれていないこと
  - **何をテストするか**: セキュリティホールとなるルールの不在
  - **期待される動作**: 明示的な Allow ルールが Rules 配列に含まれない
- **入力値**:
  ```typescript
  {
    envName: 'dev'
  }
  ```
  - **入力データの意味**: 標準構成での確認
- **期待される結果**: 全トラフィックを許可するカスタムルールが含まれない
  - **期待結果の理由**: セキュリティベストプラクティス
- **テストの目的**: セキュリティ設定の正確性確認
  - **確認ポイント**: Rules 配列の内容検証
- 🔵 信頼性: セキュリティベストプラクティス、note.md セキュリティ考慮事項より

---

## 10. 要件定義との対応関係

### 10.1 参照した機能概要

- **TASK-0011.md**: タスク概要、完了条件、主要実装項目
- **note.md**: 技術スタック、開発ルール、関連実装、設計文書、注意事項

### 10.2 参照した入力・出力仕様

- **requirements.md セクション 2**: Props インターフェース、公開プロパティ、公開メソッド、型定義

### 10.3 参照した制約条件

- **requirements.md セクション 3**: 技術的制約、セキュリティ制約、パフォーマンス制約、コーディング規約制約
- **note.md セクション 9**: 技術的制約、セキュリティ考慮事項、パフォーマンス要件

### 10.4 参照した使用例

- **requirements.md セクション 4**: 基本的な使用パターン、エッジケース、エラーケース

### 10.5 参照した EARS 要件

| 要件ID | 要件内容 | 対応テストケース |
|--------|---------|-----------------|
| REQ-033 | WAF を CloudFront/ALB に接続 | TC-WAF-001, TC-WAF-002, TC-WAF-024 |
| REQ-034 | AWS Managed Rules 適用 | TC-WAF-006〜TC-WAF-011 |
| NFR-103 | WAF による Web アプリケーション保護 | TC-WAF-001〜TC-WAF-030 |

---

## 11. テストケースサマリー

### 11.1 テストケース統計

| カテゴリ | テストケース数 | 信頼性 |
|---------|--------------|--------|
| 正常系（WebACL 作成） | 5 | 🔵 100% |
| AWS Managed Rules | 6 | 🔵 100% |
| ログ設定 | 5 | 🔵 100% |
| ALB 関連付け | 3 | 🔵 100% |
| 公開プロパティ | 3 | 🔵 100% |
| エッジケース・境界値 | 5 | 🟡 80% |
| 異常系 | 2 | 🔵 100% |
| セキュリティ | 1 | 🔵 100% |
| **合計** | **30** | - |

### 11.2 信頼性レベル分布

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 26 | 87% | 要件定義書・設計文書を参考にしてほぼ推測していない |
| 🟡 黄信号 | 4 | 13% | 要件定義書・設計文書から妥当な推測 |
| 🔴 赤信号 | 0 | 0% | 要件定義書・設計文書にない推測 |

### 11.3 テスト優先度

| 優先度 | テストケース | 理由 |
|--------|-------------|------|
| P0（必須） | TC-WAF-001〜TC-WAF-011 | 完了条件に直結 |
| P1（重要） | TC-WAF-012〜TC-WAF-022 | 運用要件に関連 |
| P2（推奨） | TC-WAF-023〜TC-WAF-030 | エッジケース・品質向上 |

---

## 12. 品質判定結果

```
✅ 高品質:
- テストケース分類: 正常系・異常系・境界値が網羅されている
- 期待値定義: 各テストケースの期待値が明確
- 技術選択: TypeScript + Jest + CDK assertions で確定
- 実装可能性: 既存テストパターン（security-group-construct.test.ts）を参考に実現可能
- 信頼性レベル: 🔵（青信号）が87%

⚠️ 改善検討項目:
- TC-WAF-024（CLOUDFRONT スコープ）は将来対応として検討
- TC-WAF-025〜TC-WAF-027 はカスタマイズ機能の詳細仕様確認が必要
```

---

## 13. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-red aws-cdk-serverless-architecture TASK-0011` で Red フェーズ（失敗テスト作成）を開始します。
