/**
 * WAF Construct テスト
 *
 * TASK-0011: WAF Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-WAF-001: WebACL リソース作成確認
 * - TC-WAF-002: WebACL スコープ設定確認（REGIONAL）
 * - TC-WAF-003: WebACL デフォルトアクション設定確認
 * - TC-WAF-004: WebACL 名に環境名が含まれること
 * - TC-WAF-005: VisibilityConfig 設定確認
 * - TC-WAF-006: AWSManagedRulesCommonRuleSet 適用確認
 * - TC-WAF-007: AWSManagedRulesSQLiRuleSet 適用確認
 * - TC-WAF-008: Common RuleSet 優先度確認（Priority: 1）
 * - TC-WAF-009: SQLi RuleSet 優先度確認（Priority: 2）
 * - TC-WAF-010: Managed Rules OverrideAction 設定確認
 * - TC-WAF-011: 各ルールの VisibilityConfig 設定確認
 * - TC-WAF-012: CloudWatch Logs ロググループ作成確認
 * - TC-WAF-013: ロググループ名プレフィックス確認
 * - TC-WAF-014: ログ保持期間設定確認
 * - TC-WAF-015: WAF LoggingConfiguration 作成確認
 * - TC-WAF-016: enableLogging: false 時のロググループ不在確認
 * - TC-WAF-017: associateWithAlb メソッドで WebACLAssociation が作成されること
 * - TC-WAF-018: WebACLAssociation ResourceArn 設定確認
 * - TC-WAF-019: WebACLAssociation WebAclArn 設定確認
 * - TC-WAF-020: webAcl プロパティが定義されていること
 * - TC-WAF-021: webAclArn プロパティが定義されていること
 * - TC-WAF-022: logGroup プロパティの条件付き存在確認
 * - TC-WAF-023: デフォルト設定での正常動作確認
 * - TC-WAF-024: scope: 'CLOUDFRONT' 設定確認
 * - TC-WAF-025: カスタム managedRules 指定確認
 * - TC-WAF-026: 空の managedRules 配列時のデフォルトフォールバック
 * - TC-WAF-027: 複数回の associateWithAlb 呼び出し確認
 * - TC-WAF-028: 作成されるリソース総数確認
 * - TC-WAF-029: WebACL に Rules が 2 つ存在すること（デフォルト設定）
 * - TC-WAF-030: 危険なルール（過剰に許可するルール）が含まれていないこと
 *
 * 🔵 信頼性: 要件定義書 REQ-033, REQ-034, NFR-103 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { WafConstruct, WafConstructProps, WafManagedRule, DEFAULT_WAF_RULES } from '../../../lib/construct/security/waf-construct';

describe('WafConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    // 【初期条件設定】: デフォルト設定で Stack を作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // TC-WAF-001: WebACL リソース作成確認
  // 🔵 信頼性: TASK-0011.md、requirements.md REQ-033 より
  // ============================================================================
  describe('TC-WAF-001: WebACL リソース作成確認', () => {
    // 【テスト目的】: WAF WebACL リソースが正しく作成されることを確認
    // 【テスト内容】: WafConstruct をデフォルト設定でインスタンス化し、WebACL を検証
    // 【期待される動作】: AWS::WAFv2::WebACL リソースが作成される
    // 🔵 信頼性: TASK-0011.md 完了条件「WAF WebACL が正常に作成される」より

    beforeEach(() => {
      // 【テストデータ準備】: 最小構成で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('WebACL リソースが作成されること', () => {
      // 【テスト目的】: WebACL リソースの存在確認
      // 【テスト内容】: AWS::WAFv2::WebACL リソースが CloudFormation テンプレートに含まれる
      // 【期待される動作】: WebACL リソースが 1 つ作成される
      // 🔵 信頼性: TASK-0011.md 完了条件より

      // 【結果検証】: WebACL リソースの存在確認
      // 【期待値確認】: AWS::WAFv2::WebACL が存在する
      template.resourceCountIs('AWS::WAFv2::WebACL', 1); // 【確認内容】: WebACL リソースが 1 つ作成される 🔵
    });
  });

  // ============================================================================
  // TC-WAF-002: WebACL スコープ設定確認（REGIONAL）
  // 🔵 信頼性: note.md 技術的制約、REQ-033 より
  // ============================================================================
  describe('TC-WAF-002: WebACL スコープ設定確認（REGIONAL）', () => {
    // 【テスト目的】: WebACL のスコープが REGIONAL に設定されることを確認
    // 【テスト内容】: デフォルトスコープまたは明示的に REGIONAL を指定した場合の検証
    // 【期待される動作】: Scope プロパティが 'REGIONAL' に設定される
    // 🔵 信頼性: note.md「REGIONAL: ALB、API Gateway 等に適用」より

    beforeEach(() => {
      // 【テストデータ準備】: scope: 'REGIONAL' で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        scope: 'REGIONAL',
      });
      template = Template.fromStack(stack);
    });

    test('WebACL スコープが REGIONAL に設定されること', () => {
      // 【テスト目的】: スコープ設定の正確性確認
      // 【テスト内容】: Scope プロパティ値の検証
      // 【期待される動作】: REGIONAL が設定される
      // 🔵 信頼性: note.md 技術的制約より

      // 【結果検証】: Scope プロパティの確認
      // 【期待値確認】: Scope が 'REGIONAL'
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'REGIONAL',
      }); // 【確認内容】: Scope が REGIONAL に設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-003: WebACL デフォルトアクション設定確認
  // 🔵 信頼性: note.md セキュリティ考慮事項より
  // ============================================================================
  describe('TC-WAF-003: WebACL デフォルトアクション設定確認', () => {
    // 【テスト目的】: WebACL のデフォルトアクションが Allow に設定されることを確認
    // 【テスト内容】: マッチしないリクエストが許可される設定の検証
    // 【期待される動作】: DefaultAction が { Allow: {} } に設定される
    // 🔵 信頼性: note.md「デフォルトアクション: Allow（ルールでブロック）」より

    beforeEach(() => {
      // 【テストデータ準備】: 標準構成で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('WebACL デフォルトアクションが Allow に設定されること', () => {
      // 【テスト目的】: デフォルトアクションの正確性確認
      // 【テスト内容】: DefaultAction プロパティ値の検証
      // 【期待される動作】: Allow が設定される
      // 🔵 信頼性: note.md セキュリティ考慮事項より

      // 【結果検証】: DefaultAction プロパティの確認
      // 【期待値確認】: DefaultAction.Allow が設定される
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        DefaultAction: {
          Allow: {},
        },
      }); // 【確認内容】: DefaultAction が Allow に設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-004: WebACL 名に環境名が含まれること
  // 🔵 信頼性: note.md リソース命名制約より
  // ============================================================================
  describe('TC-WAF-004: WebACL 名に環境名が含まれること', () => {
    // 【テスト目的】: WebACL 名にenvName が含まれることを確認
    // 【テスト内容】: リソース命名規則の遵守検証
    // 【期待される動作】: Name プロパティに envName が含まれる
    // 🔵 信頼性: note.md「WebACL 名は環境名（envName）を含める」より

    beforeEach(() => {
      // 【テストデータ準備】: envName: 'prod' で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'prod',
      });
      template = Template.fromStack(stack);
    });

    test('WebACL 名に envName が含まれること', () => {
      // 【テスト目的】: 命名規則の遵守確認
      // 【テスト内容】: Name プロパティ値の検証
      // 【期待される動作】: Name に 'prod' が含まれる
      // 🔵 信頼性: note.md リソース命名制約より

      // 【結果検証】: Name プロパティの確認
      // 【期待値確認】: Name に 'prod' が含まれる
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Name: Match.stringLikeRegexp('.*prod.*'),
      }); // 【確認内容】: WebACL 名に環境名が含まれている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-005: VisibilityConfig 設定確認
  // 🔵 信頼性: note.md セキュリティ考慮事項、運用要件より
  // ============================================================================
  describe('TC-WAF-005: VisibilityConfig 設定確認', () => {
    // 【テスト目的】: VisibilityConfig が正しく設定されることを確認
    // 【テスト内容】: メトリクス・サンプリング設定の検証
    // 【期待される動作】: CloudWatch メトリクスとサンプリングが有効
    // 🔵 信頼性: note.md「サンプリングリクエストを有効化、CloudWatch メトリクスを有効化」より

    beforeEach(() => {
      // 【テストデータ準備】: 標準構成で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('VisibilityConfig が正しく設定されること', () => {
      // 【テスト目的】: 可視性設定の正確性確認
      // 【テスト内容】: VisibilityConfig の各プロパティ検証
      // 【期待される動作】: サンプリングとメトリクスが有効
      // 🔵 信頼性: note.md セキュリティ考慮事項より

      // 【結果検証】: VisibilityConfig プロパティの確認
      // 【期待値確認】: 各設定が有効
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: Match.anyValue(),
        },
      }); // 【確認内容】: VisibilityConfig が正しく設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-006: AWSManagedRulesCommonRuleSet 適用確認
  // 🔵 信頼性: REQ-034、TASK-0011.md 完了条件より
  // ============================================================================
  describe('TC-WAF-006: AWSManagedRulesCommonRuleSet 適用確認', () => {
    // 【テスト目的】: AWSManagedRulesCommonRuleSet が適用されていることを確認
    // 【テスト内容】: Common Rule Set による一般的な脆弱性保護の検証
    // 【期待される動作】: Rules 配列に Common RuleSet が含まれる
    // 🔵 信頼性: REQ-034「AWS Managed Rules (Common RuleSet) を適用」より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('AWSManagedRulesCommonRuleSet が適用されていること', () => {
      // 【テスト目的】: Common RuleSet の適用確認
      // 【テスト内容】: ManagedRuleGroupStatement の VendorName と Name 検証
      // 【期待される動作】: Common RuleSet が Rules 配列に含まれる
      // 🔵 信頼性: REQ-034、TASK-0011.md 完了条件より

      // 【結果検証】: Rules 配列の確認
      // 【期待値確認】: AWSManagedRulesCommonRuleSet が含まれる
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesCommonRuleSet',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesCommonRuleSet',
              },
            },
          }),
        ]),
      }); // 【確認内容】: AWSManagedRulesCommonRuleSet が適用されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-007: AWSManagedRulesSQLiRuleSet 適用確認
  // 🔵 信頼性: REQ-034、TASK-0011.md 完了条件より
  // ============================================================================
  describe('TC-WAF-007: AWSManagedRulesSQLiRuleSet 適用確認', () => {
    // 【テスト目的】: AWSManagedRulesSQLiRuleSet が適用されていることを確認
    // 【テスト内容】: SQL Injection Rule Set による SQLi 保護の検証
    // 【期待される動作】: Rules 配列に SQLi RuleSet が含まれる
    // 🔵 信頼性: REQ-034「AWS Managed Rules (SQL Injection 等) を適用」より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('AWSManagedRulesSQLiRuleSet が適用されていること', () => {
      // 【テスト目的】: SQLi RuleSet の適用確認
      // 【テスト内容】: ManagedRuleGroupStatement の VendorName と Name 検証
      // 【期待される動作】: SQLi RuleSet が Rules 配列に含まれる
      // 🔵 信頼性: REQ-034、TASK-0011.md 完了条件より

      // 【結果検証】: Rules 配列の確認
      // 【期待値確認】: AWSManagedRulesSQLiRuleSet が含まれる
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesSQLiRuleSet',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesSQLiRuleSet',
              },
            },
          }),
        ]),
      }); // 【確認内容】: AWSManagedRulesSQLiRuleSet が適用されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-008: Common RuleSet 優先度確認（Priority: 1）
  // 🔵 信頼性: note.md セキュリティ考慮事項、設計文書より
  // ============================================================================
  describe('TC-WAF-008: Common RuleSet 優先度確認（Priority: 1）', () => {
    // 【テスト目的】: Common RuleSet の優先度が 1 であることを確認
    // 【テスト内容】: ルール評価順序の正確性検証
    // 【期待される動作】: Common RuleSet が最初に評価される
    // 🔵 信頼性: note.md「Common Rule Set: 優先度 1（最初に評価）」より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('Common RuleSet の優先度が 1 であること', () => {
      // 【テスト目的】: 優先度設定の正確性確認
      // 【テスト内容】: Priority プロパティ値の検証
      // 【期待される動作】: Priority が 1
      // 🔵 信頼性: note.md セキュリティ考慮事項より

      // 【結果検証】: Priority プロパティの確認
      // 【期待値確認】: Common RuleSet の Priority が 1
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesCommonRuleSet',
            Priority: 1,
          }),
        ]),
      }); // 【確認内容】: Common RuleSet の Priority が 1 に設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-009: SQLi RuleSet 優先度確認（Priority: 2）
  // 🔵 信頼性: note.md セキュリティ考慮事項、設計文書より
  // ============================================================================
  describe('TC-WAF-009: SQLi RuleSet 優先度確認（Priority: 2）', () => {
    // 【テスト目的】: SQLi RuleSet の優先度が 2 であることを確認
    // 【テスト内容】: ルール評価順序の正確性検証
    // 【期待される動作】: SQLi RuleSet が 2 番目に評価される
    // 🔵 信頼性: note.md「SQL Injection Rule Set: 優先度 2」より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('SQLi RuleSet の優先度が 2 であること', () => {
      // 【テスト目的】: 優先度設定の正確性確認
      // 【テスト内容】: Priority プロパティ値の検証
      // 【期待される動作】: Priority が 2
      // 🔵 信頼性: note.md セキュリティ考慮事項より

      // 【結果検証】: Priority プロパティの確認
      // 【期待値確認】: SQLi RuleSet の Priority が 2
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesSQLiRuleSet',
            Priority: 2,
          }),
        ]),
      }); // 【確認内容】: SQLi RuleSet の Priority が 2 に設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-010: Managed Rules OverrideAction 設定確認
  // 🔵 信頼性: TASK-0011.md 設計、note.md 設計仕様より
  // ============================================================================
  describe('TC-WAF-010: Managed Rules OverrideAction 設定確認', () => {
    // 【テスト目的】: Managed Rules の OverrideAction が none であることを確認
    // 【テスト内容】: マネージドルールのアクションがオーバーライドされないことの検証
    // 【期待される動作】: OverrideAction が { None: {} } 設定
    // 🔵 信頼性: TASK-0011.md 設計「overrideAction: { none: {} }」より

    beforeEach(() => {
      // 【テストデータ準備】: 標準構成で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('Managed Rules の OverrideAction が none であること', () => {
      // 【テスト目的】: OverrideAction 設定の正確性確認
      // 【テスト内容】: OverrideAction プロパティ値の検証
      // 【期待される動作】: None が設定される
      // 🔵 信頼性: TASK-0011.md 設計仕様より

      // 【結果検証】: OverrideAction プロパティの確認
      // 【期待値確認】: OverrideAction.None が設定される
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            OverrideAction: {
              None: {},
            },
          }),
        ]),
      }); // 【確認内容】: OverrideAction が None に設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-011: 各ルールの VisibilityConfig 設定確認
  // 🔵 信頼性: TASK-0011.md 設計仕様、note.md より
  // ============================================================================
  describe('TC-WAF-011: 各ルールの VisibilityConfig 設定確認', () => {
    // 【テスト目的】: 各 Managed Rule に VisibilityConfig が設定されていることを確認
    // 【テスト内容】: ルール単位のメトリクス・サンプリング設定の検証
    // 【期待される動作】: 各ルールに VisibilityConfig が含まれる
    // 🔵 信頼性: TASK-0011.md 設計「visibilityConfig: { sampledRequestsEnabled: true, ... }」より

    beforeEach(() => {
      // 【テストデータ準備】: 標準構成で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('各 Managed Rule に VisibilityConfig が設定されていること', () => {
      // 【テスト目的】: ルール単位の可視性設定確認
      // 【テスト内容】: 各ルールの VisibilityConfig 検証
      // 【期待される動作】: 全ルールに VisibilityConfig がある
      // 🔵 信頼性: TASK-0011.md 設計仕様より

      // 【結果検証】: ルール内の VisibilityConfig 確認
      // 【期待値確認】: 各ルールに VisibilityConfig が設定される
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            VisibilityConfig: {
              SampledRequestsEnabled: true,
              CloudWatchMetricsEnabled: true,
              MetricName: Match.anyValue(),
            },
          }),
        ]),
      }); // 【確認内容】: 各ルールに VisibilityConfig が設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-012: CloudWatch Logs ロググループ作成確認
  // 🔵 信頼性: TASK-0011.md 完了条件、note.md ログ設定より
  // ============================================================================
  describe('TC-WAF-012: CloudWatch Logs ロググループ作成確認', () => {
    // 【テスト目的】: CloudWatch Logs ロググループが作成されることを確認
    // 【テスト内容】: WAF ログ出力先のロググループ作成検証
    // 【期待される動作】: AWS::Logs::LogGroup リソースが作成される
    // 🔵 信頼性: TASK-0011.md 完了条件「CloudWatch Logs へのログ出力が設定されている」より

    beforeEach(() => {
      // 【テストデータ準備】: enableLogging: true で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        enableLogging: true,
      });
      template = Template.fromStack(stack);
    });

    test('CloudWatch Logs ロググループが作成されること', () => {
      // 【テスト目的】: ログ基盤の作成確認
      // 【テスト内容】: LogGroup リソースの存在検証
      // 【期待される動作】: LogGroup が作成される
      // 🔵 信頼性: TASK-0011.md 完了条件より

      // 【結果検証】: LogGroup リソースの確認
      // 【期待値確認】: AWS::Logs::LogGroup が存在する
      template.resourceCountIs('AWS::Logs::LogGroup', 1); // 【確認内容】: CloudWatch Logs ロググループが作成される 🔵
    });
  });

  // ============================================================================
  // TC-WAF-013: ロググループ名プレフィックス確認
  // 🔵 信頼性: note.md 技術的制約、AWS ドキュメントより
  // ============================================================================
  describe('TC-WAF-013: ロググループ名プレフィックス確認', () => {
    // 【テスト目的】: ロググループ名が `aws-waf-logs-` プレフィックスで始まることを確認
    // 【テスト内容】: AWS WAF ログ設定の必須プレフィックス検証
    // 【期待される動作】: LogGroupName が `aws-waf-logs-` で始まる
    // 🔵 信頼性: note.md「ロググループ名は `aws-waf-logs-` プレフィックスで始まる必要がある」より

    beforeEach(() => {
      // 【テストデータ準備】: enableLogging: true で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        enableLogging: true,
      });
      template = Template.fromStack(stack);
    });

    test('ロググループ名が `aws-waf-logs-` プレフィックスで始まること', () => {
      // 【テスト目的】: AWS 仕様準拠の確認
      // 【テスト内容】: LogGroupName プロパティ値のプレフィックス検証
      // 【期待される動作】: プレフィックスが正しい
      // 🔵 信頼性: note.md 技術的制約より

      // 【結果検証】: LogGroupName プロパティの確認
      // 【期待値確認】: `aws-waf-logs-` プレフィックスを持つ
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.stringLikeRegexp('^aws-waf-logs-.*'),
      }); // 【確認内容】: ロググループ名が `aws-waf-logs-` プレフィックスで始まる 🔵
    });
  });

  // ============================================================================
  // TC-WAF-014: ログ保持期間設定確認
  // 🔵 信頼性: requirements.md Props インターフェース、note.md より
  // ============================================================================
  describe('TC-WAF-014: ログ保持期間設定確認', () => {
    // 【テスト目的】: ログ保持期間が設定されていることを確認
    // 【テスト内容】: RetentionInDays プロパティの設定検証
    // 【期待される動作】: ログ保持期間が数値で設定される
    // 🔵 信頼性: requirements.md「ログ保持期間（日数）」プロパティ定義より

    beforeEach(() => {
      // 【テストデータ準備】: logRetentionDays: 30 で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        enableLogging: true,
        logRetentionDays: 30,
      });
      template = Template.fromStack(stack);
    });

    test('ログ保持期間が設定されていること', () => {
      // 【テスト目的】: ログ保持設定の正確性確認
      // 【テスト内容】: RetentionInDays プロパティ値の検証
      // 【期待される動作】: 30 日が設定される
      // 🔵 信頼性: requirements.md Props インターフェースより

      // 【結果検証】: RetentionInDays プロパティの確認
      // 【期待値確認】: RetentionInDays が 30
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 30,
      }); // 【確認内容】: ログ保持期間が 30 日に設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-015: WAF LoggingConfiguration 作成確認
  // 🔵 信頼性: AWS WAF ドキュメント、TASK-0011.md より
  // ============================================================================
  describe('TC-WAF-015: WAF LoggingConfiguration 作成確認', () => {
    // 【テスト目的】: WAF LoggingConfiguration が作成されることを確認
    // 【テスト内容】: WebACL とロググループの関連付け検証
    // 【期待される動作】: AWS::WAFv2::LoggingConfiguration リソースが作成される
    // 🔵 信頼性: WAF ログ設定には LoggingConfiguration リソースが必要

    beforeEach(() => {
      // 【テストデータ準備】: enableLogging: true で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        enableLogging: true,
      });
      template = Template.fromStack(stack);
    });

    test('WAF LoggingConfiguration が作成されること', () => {
      // 【テスト目的】: ログ設定リソースの作成確認
      // 【テスト内容】: LoggingConfiguration リソースの存在検証
      // 【期待される動作】: LoggingConfiguration が作成される
      // 🔵 信頼性: AWS WAF ドキュメントより

      // 【結果検証】: LoggingConfiguration リソースの確認
      // 【期待値確認】: AWS::WAFv2::LoggingConfiguration が存在する
      template.resourceCountIs('AWS::WAFv2::LoggingConfiguration', 1); // 【確認内容】: WAF LoggingConfiguration が作成される 🔵
    });
  });

  // ============================================================================
  // TC-WAF-016: enableLogging: false 時のロググループ不在確認
  // 🔵 信頼性: requirements.md Props インターフェース「enableLogging?: boolean」より
  // ============================================================================
  describe('TC-WAF-016: enableLogging: false 時のロググループ不在確認', () => {
    // 【テスト目的】: enableLogging: false の場合、ロググループが作成されないことを確認
    // 【テスト内容】: ログ記録無効化時の動作検証
    // 【期待される動作】: LogGroup リソースが作成されない
    // 🔵 信頼性: オプション設定が正しく反映されること

    beforeEach(() => {
      // 【テストデータ準備】: enableLogging: false で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        enableLogging: false,
      });
      template = Template.fromStack(stack);
    });

    test('enableLogging: false の場合、ロググループが作成されないこと', () => {
      // 【テスト目的】: オプション機能の無効化確認
      // 【テスト内容】: LogGroup リソースの不在検証
      // 【期待される動作】: LogGroup が作成されない
      // 🔵 信頼性: requirements.md Props インターフェースより

      // 【結果検証】: LogGroup リソースの不在確認
      // 【期待値確認】: LogGroup が 0 個
      template.resourceCountIs('AWS::Logs::LogGroup', 0); // 【確認内容】: ロググループが作成されない 🔵
    });
  });

  // ============================================================================
  // TC-WAF-017: associateWithAlb メソッドで WebACLAssociation が作成されること
  // 🔵 信頼性: TASK-0011.md 完了条件、ALB 関連付け機能設計より
  // ============================================================================
  describe('TC-WAF-017: associateWithAlb メソッドで WebACLAssociation が作成されること', () => {
    // 【テスト目的】: associateWithAlb 呼び出しで WebACLAssociation が作成されることを確認
    // 【テスト内容】: ALB との関連付け機能の検証
    // 【期待される動作】: AWS::WAFv2::WebACLAssociation リソースが作成される
    // 🔵 信頼性: TASK-0011.md 完了条件「ALB との関連付けが可能な設計になっている」より

    beforeEach(() => {
      // 【テストデータ準備】: WafConstruct を作成し、associateWithAlb を呼び出し
      const wafConstruct = new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      wafConstruct.associateWithAlb('arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/my-alb/1234567890');
      template = Template.fromStack(stack);
    });

    test('associateWithAlb 呼び出しで WebACLAssociation が作成されること', () => {
      // 【テスト目的】: ALB 関連付け機能の確認
      // 【テスト内容】: WebACLAssociation リソースの存在検証
      // 【期待される動作】: WebACLAssociation が作成される
      // 🔵 信頼性: TASK-0011.md 完了条件より

      // 【結果検証】: WebACLAssociation リソースの確認
      // 【期待値確認】: AWS::WAFv2::WebACLAssociation が存在する
      template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 1); // 【確認内容】: WebACLAssociation が作成される 🔵
    });
  });

  // ============================================================================
  // TC-WAF-018: WebACLAssociation ResourceArn 設定確認
  // 🔵 信頼性: TASK-0011.md 設計、requirements.md より
  // ============================================================================
  describe('TC-WAF-018: WebACLAssociation ResourceArn 設定確認', () => {
    // 【テスト目的】: WebACLAssociation の ResourceArn が正しく設定されることを確認
    // 【テスト内容】: 関連付け先の ARN 設定検証
    // 【期待される動作】: ResourceArn に ALB ARN が設定される
    // 🔵 信頼性: TASK-0011.md 設計「resourceArn: albArn」より

    const testAlbArn = 'arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/my-alb/1234567890';

    beforeEach(() => {
      // 【テストデータ準備】: WafConstruct を作成し、associateWithAlb を呼び出し
      const wafConstruct = new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      wafConstruct.associateWithAlb(testAlbArn);
      template = Template.fromStack(stack);
    });

    test('WebACLAssociation の ResourceArn が正しく設定されること', () => {
      // 【テスト目的】: ARN 参照の正確性確認
      // 【テスト内容】: ResourceArn プロパティ値の検証
      // 【期待される動作】: 指定した ALB ARN が設定される
      // 🔵 信頼性: TASK-0011.md 設計より

      // 【結果検証】: ResourceArn プロパティの確認
      // 【期待値確認】: ResourceArn が ALB ARN
      template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
        ResourceArn: testAlbArn,
      }); // 【確認内容】: ResourceArn が正しく設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-019: WebACLAssociation WebAclArn 設定確認
  // 🔵 信頼性: TASK-0011.md 設計、CDK パターンより
  // ============================================================================
  describe('TC-WAF-019: WebACLAssociation WebAclArn 設定確認', () => {
    // 【テスト目的】: WebACLAssociation の WebAclArn が正しく設定されることを確認
    // 【テスト内容】: WebACL ARN の参照設定検証
    // 【期待される動作】: WebAclArn に WebACL の ARN が設定される
    // 🔵 信頼性: TASK-0011.md 設計「webAclArn: this.webAcl.attrArn」より

    beforeEach(() => {
      // 【テストデータ準備】: WafConstruct を作成し、associateWithAlb を呼び出し
      const wafConstruct = new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      wafConstruct.associateWithAlb('arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/my-alb/1234567890');
      template = Template.fromStack(stack);
    });

    test('WebACLAssociation の WebAclArn が正しく設定されること', () => {
      // 【テスト目的】: WebACL 参照の正確性確認
      // 【テスト内容】: WebAclArn プロパティ値の検証
      // 【期待される動作】: GetAtt 参照になる
      // 🔵 信頼性: TASK-0011.md 設計、CDK パターンより

      // 【結果検証】: WebAclArn プロパティの確認
      // 【期待値確認】: WebAclArn が Fn::GetAtt 参照
      template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
        WebACLArn: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([
            Match.stringLikeRegexp('.*WebACL.*|.*WebAcl.*'),
          ]),
        }),
      }); // 【確認内容】: WebAclArn が正しく参照設定されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-020: webAcl プロパティが定義されていること
  // 🔵 信頼性: requirements.md 出力インターフェース、note.md 型定義より
  // ============================================================================
  describe('TC-WAF-020: webAcl プロパティが定義されていること', () => {
    // 【テスト目的】: webAcl プロパティが定義されていることを確認
    // 【テスト内容】: 公開プロパティの存在検証
    // 【期待される動作】: webAcl プロパティが undefined でないこと
    // 🔵 信頼性: requirements.md 出力インターフェース「public readonly webAcl: wafv2.CfnWebACL」より

    test('webAcl プロパティが定義されていること', () => {
      // 【テスト目的】: 公開 API の正確性確認
      // 【テスト内容】: プロパティの存在検証
      // 【期待される動作】: webAcl が定義される
      // 🔵 信頼性: requirements.md 出力インターフェースより

      // 【テストデータ準備】: WafConstruct を作成
      const wafConstruct = new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });

      // 【結果検証】: webAcl プロパティの確認
      // 【期待値確認】: プロパティが定義されている
      expect(wafConstruct.webAcl).toBeDefined(); // 【確認内容】: webAcl プロパティが定義されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-021: webAclArn プロパティが定義されていること
  // 🔵 信頼性: requirements.md 出力インターフェース、note.md 型定義より
  // ============================================================================
  describe('TC-WAF-021: webAclArn プロパティが定義されていること', () => {
    // 【テスト目的】: webAclArn プロパティが定義されていることを確認
    // 【テスト内容】: ARN 公開プロパティの存在検証
    // 【期待される動作】: webAclArn プロパティが undefined でないこと
    // 🔵 信頼性: requirements.md 出力インターフェース「public readonly webAclArn: string」より

    test('webAclArn プロパティが定義されていること', () => {
      // 【テスト目的】: 公開 API の正確性確認
      // 【テスト内容】: プロパティの存在検証
      // 【期待される動作】: webAclArn が定義される
      // 🔵 信頼性: requirements.md 出力インターフェースより

      // 【テストデータ準備】: WafConstruct を作成
      const wafConstruct = new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });

      // 【結果検証】: webAclArn プロパティの確認
      // 【期待値確認】: プロパティが定義されている
      expect(wafConstruct.webAclArn).toBeDefined(); // 【確認内容】: webAclArn プロパティが定義されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-022: logGroup プロパティの条件付き存在確認
  // 🔵 信頼性: requirements.md 出力インターフェースより
  // ============================================================================
  describe('TC-WAF-022: logGroup プロパティの条件付き存在確認', () => {
    // 【テスト目的】: enableLogging: true の場合に logGroup プロパティが定義されていることを確認
    // 【テスト内容】: 条件付き公開プロパティの存在検証
    // 【期待される動作】: ログ有効時に logGroup が定義される
    // 🔵 信頼性: requirements.md 出力インターフェース「public readonly logGroup?: logs.ILogGroup」より

    test('enableLogging: true の場合に logGroup プロパティが定義されていること', () => {
      // 【テスト目的】: 条件付きプロパティの正確性確認
      // 【テスト内容】: プロパティの存在検証
      // 【期待される動作】: logGroup が定義される
      // 🔵 信頼性: requirements.md 出力インターフェースより

      // 【テストデータ準備】: enableLogging: true で WafConstruct を作成
      const wafConstruct = new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        enableLogging: true,
      });

      // 【結果検証】: logGroup プロパティの確認
      // 【期待値確認】: プロパティが定義されている
      expect(wafConstruct.logGroup).toBeDefined(); // 【確認内容】: logGroup プロパティが定義されている 🔵
    });
  });

  // ============================================================================
  // TC-WAF-023: デフォルト設定での正常動作確認
  // 🔵 信頼性: requirements.md Props インターフェース、note.md より
  // ============================================================================
  describe('TC-WAF-023: デフォルト設定での正常動作確認', () => {
    // 【テスト目的】: 最小構成（envName のみ）で正常に作成されることを確認
    // 【テスト内容】: オプションパラメータのデフォルト値適用検証
    // 【期待される動作】: デフォルト値が正しく適用される
    // 🔵 信頼性: Props インターフェースの必須/オプション定義

    beforeEach(() => {
      // 【テストデータ準備】: envName のみで WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('最小構成（envName のみ）で正常に作成されること', () => {
      // 【テスト目的】: デフォルト値の適用確認
      // 【テスト内容】: 各デフォルト値の検証
      // 【期待される動作】: 全デフォルト値が正しく適用される
      // 🔵 信頼性: requirements.md Props インターフェースより

      // 【結果検証】: デフォルト設定の確認
      // 【期待値確認】: WebACL が作成され、デフォルト設定が適用される
      template.resourceCountIs('AWS::WAFv2::WebACL', 1); // 【確認内容】: WebACL が作成される 🔵

      // 【期待値確認】: scope が 'REGIONAL'（デフォルト）
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'REGIONAL',
      }); // 【確認内容】: デフォルト scope が REGIONAL 🔵
    });
  });

  // ============================================================================
  // TC-WAF-024: scope: 'CLOUDFRONT' 設定確認
  // 🟡 信頼性: requirements.md Props インターフェース、note.md 技術的制約（将来対応）より
  // ============================================================================
  describe("TC-WAF-024: scope: 'CLOUDFRONT' 設定確認", () => {
    // 【テスト目的】: scope: 'CLOUDFRONT' が正しく設定されることを確認
    // 【テスト内容】: スコープの選択肢（REGIONAL vs CLOUDFRONT）検証
    // 【期待される動作】: 両スコープ値が正しく処理される
    // 🟡 信頼性: requirements.md Props インターフェース、将来対応として定義

    beforeEach(() => {
      // 【テストデータ準備】: scope: 'CLOUDFRONT' で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        scope: 'CLOUDFRONT',
      });
      template = Template.fromStack(stack);
    });

    test("scope: 'CLOUDFRONT' が正しく設定されること", () => {
      // 【テスト目的】: スコープ選択の網羅性確認
      // 【テスト内容】: Scope プロパティ値の検証
      // 【期待される動作】: CLOUDFRONT が設定される
      // 🟡 信頼性: 将来対応として定義

      // 【結果検証】: Scope プロパティの確認
      // 【期待値確認】: Scope が 'CLOUDFRONT'
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'CLOUDFRONT',
      }); // 【確認内容】: Scope が CLOUDFRONT に設定されている 🟡
    });
  });

  // ============================================================================
  // TC-WAF-025: カスタム managedRules 指定確認
  // 🟡 信頼性: requirements.md Props インターフェース「managedRules?: WafManagedRule[]」より
  // ============================================================================
  describe('TC-WAF-025: カスタム managedRules 指定確認', () => {
    // 【テスト目的】: カスタム managedRules を指定した場合に正しく適用されることを確認
    // 【テスト内容】: デフォルトルール vs カスタムルールの検証
    // 【期待される動作】: カスタム設定が優先される
    // 🟡 信頼性: requirements.md Props インターフェースより

    const customRules: WafManagedRule[] = [
      { name: 'AWSManagedRulesCommonRuleSet', vendorName: 'AWS', priority: 1 },
      { name: 'AWSManagedRulesKnownBadInputsRuleSet', vendorName: 'AWS', priority: 2 },
    ];

    beforeEach(() => {
      // 【テストデータ準備】: カスタム managedRules で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        managedRules: customRules,
      });
      template = Template.fromStack(stack);
    });

    test('カスタム managedRules を指定した場合に正しく適用されること', () => {
      // 【テスト目的】: カスタマイズ機能の確認
      // 【テスト内容】: カスタムルールの適用検証
      // 【期待される動作】: 指定した managedRules が適用される
      // 🟡 信頼性: requirements.md Props インターフェースより

      // 【結果検証】: カスタムルールの確認
      // 【期待値確認】: AWSManagedRulesKnownBadInputsRuleSet が含まれる
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesKnownBadInputsRuleSet',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesKnownBadInputsRuleSet',
              },
            },
          }),
        ]),
      }); // 【確認内容】: カスタムルールが適用されている 🟡
    });
  });

  // ============================================================================
  // TC-WAF-026: 空の managedRules 配列時のデフォルトフォールバック
  // 🟡 信頼性: requirements.md エッジケース EDGE-WAF-04「空の Managed Rules」より
  // ============================================================================
  describe('TC-WAF-026: 空の managedRules 配列時のデフォルトフォールバック', () => {
    // 【テスト目的】: managedRules: [] の場合、デフォルトルールが適用されることを確認
    // 【テスト内容】: 空配列指定時の動作検証
    // 【期待される動作】: デフォルト Managed Rules（Common + SQLi）が適用される
    // 🟡 信頼性: requirements.md エッジケースより

    beforeEach(() => {
      // 【テストデータ準備】: managedRules: [] で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        managedRules: [],
      });
      template = Template.fromStack(stack);
    });

    test('managedRules: [] の場合、デフォルトルールが適用されること', () => {
      // 【テスト目的】: エッジケースでの安全動作確認
      // 【テスト内容】: デフォルトルールへのフォールバック検証
      // 【期待される動作】: Common + SQLi ルールが適用される
      // 🟡 信頼性: セキュリティホールの防止

      // 【結果検証】: デフォルトルールの確認
      // 【期待値確認】: AWSManagedRulesCommonRuleSet が含まれる（デフォルトフォールバック）
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          Match.objectLike({
            Name: 'AWSManagedRulesCommonRuleSet',
          }),
        ]),
      }); // 【確認内容】: デフォルトルールにフォールバックされている 🟡
    });
  });

  // ============================================================================
  // TC-WAF-027: 複数回の associateWithAlb 呼び出し確認
  // 🟡 信頼性: requirements.md 公開メソッド設計、実運用想定より
  // ============================================================================
  describe('TC-WAF-027: 複数回の associateWithAlb 呼び出し確認', () => {
    // 【テスト目的】: 複数の ALB に関連付けできることを確認
    // 【テスト内容】: 同一 WebACL の複数リソース関連付け検証
    // 【期待される動作】: 2 つの WebACLAssociation が作成される
    // 🟡 信頼性: 実運用シナリオ（複数 ALB での WAF 共有）より

    beforeEach(() => {
      // 【テストデータ準備】: WafConstruct を作成し、複数の associateWithAlb を呼び出し
      const wafConstruct = new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      wafConstruct.associateWithAlb('arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/alb-1/1111111111');
      wafConstruct.associateWithAlb('arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/alb-2/2222222222');
      template = Template.fromStack(stack);
    });

    test('複数の ALB に関連付けできること', () => {
      // 【テスト目的】: 複数関連付けの動作確認
      // 【テスト内容】: WebACLAssociation リソース数の検証
      // 【期待される動作】: 2 つの WebACLAssociation が作成される
      // 🟡 信頼性: 実運用シナリオより

      // 【結果検証】: WebACLAssociation リソース数の確認
      // 【期待値確認】: 2 つの WebACLAssociation が存在する
      template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 2); // 【確認内容】: 2 つの WebACLAssociation が作成される 🟡
    });
  });

  // ============================================================================
  // TC-WAF-028: 作成されるリソース総数確認
  // 🔵 信頼性: TASK-0011.md 設計、note.md より
  // ============================================================================
  describe('TC-WAF-028: 作成されるリソース総数確認', () => {
    // 【テスト目的】: WafConstruct で作成されるリソースが適切な数であることを確認
    // 【テスト内容】: 不要リソースの作成防止検証
    // 【期待される動作】: 必要最小限のリソースのみ作成
    // 🔵 信頼性: 設計で定義されたリソースのみ作成

    beforeEach(() => {
      // 【テストデータ準備】: 標準構成（enableLogging: true）で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
        enableLogging: true,
      });
      template = Template.fromStack(stack);
    });

    test('WafConstruct で作成されるリソースが適切な数であること', () => {
      // 【テスト目的】: リソース数の正確性確認
      // 【テスト内容】: 各リソースタイプの数検証
      // 【期待される動作】: 設計通りのリソース数
      // 🔵 信頼性: TASK-0011.md 設計より

      // 【結果検証】: 各リソースタイプの数確認
      // 【期待値確認】: 各リソースが設計通りの数
      template.resourceCountIs('AWS::WAFv2::WebACL', 1); // 【確認内容】: WebACL が 1 つ 🔵
      template.resourceCountIs('AWS::Logs::LogGroup', 1); // 【確認内容】: LogGroup が 1 つ 🔵
      template.resourceCountIs('AWS::WAFv2::LoggingConfiguration', 1); // 【確認内容】: LoggingConfiguration が 1 つ 🔵
    });
  });

  // ============================================================================
  // TC-WAF-029: WebACL に Rules が 2 つ存在すること（デフォルト設定）
  // 🔵 信頼性: requirements.md DEFAULT_WAF_RULES 定義より
  // ============================================================================
  describe('TC-WAF-029: WebACL に Rules が 2 つ存在すること（デフォルト設定）', () => {
    // 【テスト目的】: デフォルト設定で 2 つの Managed Rules が適用されることを確認
    // 【テスト内容】: デフォルト Managed Rules の適用数検証
    // 【期待される動作】: Common + SQLi の 2 ルール
    // 🔵 信頼性: DEFAULT_WAF_RULES の定義より

    beforeEach(() => {
      // 【テストデータ準備】: デフォルト設定で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('デフォルト設定で 2 つの Managed Rules が適用されること', () => {
      // 【テスト目的】: デフォルトルール数の確認
      // 【テスト内容】: Rules 配列の長さ検証
      // 【期待される動作】: 2 つのルールが含まれる
      // 🔵 信頼性: DEFAULT_WAF_RULES 定義より

      // 【結果検証】: Rules 配列の長さ確認
      // 【期待値確認】: Rules に 2 つのルールが含まれる
      const webAcls = template.findResources('AWS::WAFv2::WebACL');
      const webAcl = Object.values(webAcls)[0] as any;
      expect(webAcl.Properties.Rules).toHaveLength(2); // 【確認内容】: Rules 配列に 2 つのルールが含まれる 🔵
    });
  });

  // ============================================================================
  // TC-WAF-030: 危険なルール（過剰に許可するルール）が含まれていないこと
  // 🔵 信頼性: セキュリティベストプラクティス、note.md セキュリティ考慮事項より
  // ============================================================================
  describe('TC-WAF-030: 危険なルール（過剰に許可するルール）が含まれていないこと', () => {
    // 【テスト目的】: 全トラフィックを許可するルールが含まれていないことを確認
    // 【テスト内容】: セキュリティホールとなるルールの不在検証
    // 【期待される動作】: 明示的な Allow ルールが Rules 配列に含まれない
    // 🔵 信頼性: セキュリティベストプラクティス

    beforeEach(() => {
      // 【テストデータ準備】: 標準構成で WafConstruct を作成
      new WafConstruct(stack, 'TestWaf', {
        envName: 'dev',
      });
      template = Template.fromStack(stack);
    });

    test('全トラフィックを許可するルールが含まれていないこと', () => {
      // 【テスト目的】: セキュリティ設定の正確性確認
      // 【テスト内容】: Rules 配列の内容検証
      // 【期待される動作】: 全許可ルールが存在しない
      // 🔵 信頼性: セキュリティベストプラクティスより

      // 【結果検証】: Rules 配列の検証
      // 【期待値確認】: 全トラフィックを許可するカスタムルールが含まれない
      const webAcls = template.findResources('AWS::WAFv2::WebACL');
      const webAcl = Object.values(webAcls)[0] as any;
      const rules = webAcl.Properties.Rules || [];

      // 各ルールに Action: Allow が含まれていないことを確認
      // （Managed Rules は OverrideAction を使用するため、Action は持たない）
      const hasAllowRule = rules.some((rule: any) => rule.Action?.Allow !== undefined);
      expect(hasAllowRule).toBe(false); // 【確認内容】: 全許可ルールが含まれていない 🔵
    });
  });
});
