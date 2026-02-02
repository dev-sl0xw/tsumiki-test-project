/**
 * LogGroupConstruct テスト
 *
 * TASK-0021: CloudWatch Logs 設定
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-LOGS-001: ECS Frontend Log Group 作成確認
 * - TC-LOGS-002: ECS Backend Log Group 作成確認
 * - TC-LOGS-003: RDS Aurora Log Group 作成確認
 * - TC-LOGS-004: VPC Flow Log Group 作成確認
 * - TC-LOGS-005: Dev 環境ログ保持期間確認 (3日)
 * - TC-LOGS-006: Prod 環境ログ保持期間確認 (30日)
 * - TC-LOGS-007: 環境パラメータ動的設定確認
 * - TC-LOGS-008: カスタム保持期間オーバーライド確認
 * - TC-LOGS-009: KMS 暗号化キー作成確認
 * - TC-LOGS-010: Log Group KMS 暗号化設定確認
 * - TC-LOGS-011: カスタム KMS キー使用確認
 * - TC-LOGS-012: 暗号化無効時の動作確認
 * - TC-LOGS-018: ecsFrontendLogGroup プロパティ確認
 * - TC-LOGS-019: ecsBackendLogGroup プロパティ確認
 * - TC-LOGS-020: rdsLogGroup プロパティ確認
 * - TC-LOGS-021: vpcFlowLogGroup プロパティ確認
 * - TC-LOGS-022: encryptionKey プロパティ確認
 * - TC-LOGS-024: envName 必須パラメータ確認
 * - TC-LOGS-025: Dev 環境テンプレートスナップショット
 * - TC-LOGS-026: Prod 環境テンプレートスナップショット
 * - TC-LOGS-027: RemovalPolicy Dev 環境確認
 * - TC-LOGS-028: RemovalPolicy Prod 環境確認
 * - TC-LOGS-029: KMS キーポリシー CloudWatch 許可確認
 * - TC-LOGS-030: 複数インスタンス作成確認
 *
 * 🔵 信頼性: 要件定義書 REQ-035〜037, REQ-102 に基づくテスト
 *
 * @module monitoring/log-group-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { LogGroupConstruct } from '../../../lib/construct/monitoring/log-group-construct';

describe('LogGroupConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    // 【初期条件設定】: テスト用のモックリソースを作成
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
  // Log Group 作成テスト
  // ============================================================================

  describe('Log Group 作成テスト', () => {
    // ============================================================================
    // TC-LOGS-001: ECS Frontend Log Group 作成確認
    // 🔵 信頼性: REQ-035 より
    // ============================================================================
    describe('TC-LOGS-001: ECS Frontend Log Group 作成確認', () => {
      // 【テスト目的】: ECS Frontend サービス用の Log Group が正しい命名規則で作成されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、CloudFormation テンプレートを検証
      // 【期待される動作】: AWS::Logs::LogGroup リソースが作成され、LogGroupName が `/ecs/{env-name}/frontend` パターンに一致する
      // 🔵 信頼性: REQ-035 より

      test('ECS Frontend 用 Log Group が作成されること', () => {
        // 【テストデータ準備】: 環境名 'dev' で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: Log Group リソースの存在確認
        // 【期待値確認】: LogGroupName が `/ecs/.*/frontend` パターンに一致すること
        template.hasResourceProperties('AWS::Logs::LogGroup', {
          LogGroupName: Match.stringLikeRegexp('/ecs/.*/frontend'), // 【確認内容】: ECS Frontend Log Group 命名規則 🔵
        });
      });
    });

    // ============================================================================
    // TC-LOGS-002: ECS Backend Log Group 作成確認
    // 🔵 信頼性: REQ-035 より
    // ============================================================================
    describe('TC-LOGS-002: ECS Backend Log Group 作成確認', () => {
      // 【テスト目的】: ECS Backend サービス用の Log Group が正しい命名規則で作成されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、CloudFormation テンプレートを検証
      // 【期待される動作】: AWS::Logs::LogGroup リソースが作成され、LogGroupName が `/ecs/{env-name}/backend` パターンに一致する
      // 🔵 信頼性: REQ-035 より

      test('ECS Backend 用 Log Group が作成されること', () => {
        // 【テストデータ準備】: 環境名 'dev' で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: Log Group リソースの存在確認
        // 【期待値確認】: LogGroupName が `/ecs/.*/backend` パターンに一致すること
        template.hasResourceProperties('AWS::Logs::LogGroup', {
          LogGroupName: Match.stringLikeRegexp('/ecs/.*/backend'), // 【確認内容】: ECS Backend Log Group 命名規則 🔵
        });
      });
    });

    // ============================================================================
    // TC-LOGS-003: RDS Aurora Log Group 作成確認
    // 🔵 信頼性: REQ-035 より
    // ============================================================================
    describe('TC-LOGS-003: RDS Aurora Log Group 作成確認', () => {
      // 【テスト目的】: RDS Aurora 用の Log Group が正しい命名規則で作成されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、CloudFormation テンプレートを検証
      // 【期待される動作】: AWS::Logs::LogGroup リソースが作成され、LogGroupName が `/rds/{env-name}/aurora` パターンに一致する
      // 🔵 信頼性: REQ-035 より

      test('RDS Aurora 用 Log Group が作成されること', () => {
        // 【テストデータ準備】: 環境名 'dev' で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: Log Group リソースの存在確認
        // 【期待値確認】: LogGroupName が `/rds/.*/aurora` パターンに一致すること
        template.hasResourceProperties('AWS::Logs::LogGroup', {
          LogGroupName: Match.stringLikeRegexp('/rds/.*/aurora'), // 【確認内容】: RDS Aurora Log Group 命名規則 🔵
        });
      });
    });

    // ============================================================================
    // TC-LOGS-004: VPC Flow Log Group 作成確認
    // 🔵 信頼性: REQ-035 より
    // ============================================================================
    describe('TC-LOGS-004: VPC Flow Log Group 作成確認', () => {
      // 【テスト目的】: VPC Flow Logs 用の Log Group が正しい命名規則で作成されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、CloudFormation テンプレートを検証
      // 【期待される動作】: AWS::Logs::LogGroup リソースが作成され、LogGroupName が `/vpc/{env-name}/flow-logs` パターンに一致する
      // 🔵 信頼性: REQ-035 より

      test('VPC Flow Logs 用 Log Group が作成されること', () => {
        // 【テストデータ準備】: 環境名 'dev' で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: Log Group リソースの存在確認
        // 【期待値確認】: LogGroupName が `/vpc/.*/flow-logs` パターンに一致すること
        template.hasResourceProperties('AWS::Logs::LogGroup', {
          LogGroupName: Match.stringLikeRegexp('/vpc/.*/flow-logs'), // 【確認内容】: VPC Flow Logs Log Group 命名規則 🔵
        });
      });
    });
  });

  // ============================================================================
  // Retention 設定テスト
  // ============================================================================

  describe('Retention 設定テスト', () => {
    // ============================================================================
    // TC-LOGS-005: Dev 環境ログ保持期間確認 (3日)
    // 🔵 信頼性: REQ-036, REQ-102 より
    // ============================================================================
    describe('TC-LOGS-005: Dev 環境ログ保持期間確認 (3日)', () => {
      // 【テスト目的】: Dev 環境で Log Group の保持期間が 3 日間に設定されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、RetentionInDays プロパティを検証
      // 【期待される動作】: 全ての Log Group の RetentionInDays が 3 に設定される
      // 🔵 信頼性: REQ-036, REQ-102 より

      test('Dev 環境で RetentionInDays が 3 に設定されること', () => {
        // 【テストデータ準備】: 環境名 'dev' で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: 全ての Log Group の保持期間確認
        // 【期待値確認】: RetentionInDays が 3 であること
        const logGroups = template.findResources('AWS::Logs::LogGroup');
        Object.values(logGroups).forEach((lg: any) => {
          expect(lg.Properties.RetentionInDays).toBe(3); // 【確認内容】: Dev 環境は 3 日間保持 🔵
        });
      });
    });

    // ============================================================================
    // TC-LOGS-006: Prod 環境ログ保持期間確認 (30日)
    // 🔵 信頼性: REQ-037 より
    // ============================================================================
    describe('TC-LOGS-006: Prod 環境ログ保持期間確認 (30日)', () => {
      // 【テスト目的】: Prod 環境で Log Group の保持期間が 30 日間に設定されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'prod'` で作成し、RetentionInDays プロパティを検証
      // 【期待される動作】: 全ての Log Group の RetentionInDays が 30 に設定される
      // 🔵 信頼性: REQ-037 より

      test('Prod 環境で RetentionInDays が 30 に設定されること', () => {
        // 【テストデータ準備】: 環境名 'prod' で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'prod' });
        const template = Template.fromStack(stack);

        // 【結果検証】: 全ての Log Group の保持期間確認
        // 【期待値確認】: RetentionInDays が 30 であること
        const logGroups = template.findResources('AWS::Logs::LogGroup');
        Object.values(logGroups).forEach((lg: any) => {
          expect(lg.Properties.RetentionInDays).toBe(30); // 【確認内容】: Prod 環境は 30 日間保持 🔵
        });
      });
    });

    // ============================================================================
    // TC-LOGS-007: 環境パラメータ動的設定確認
    // 🔵 信頼性: REQ-036, REQ-037 より
    // ============================================================================
    describe('TC-LOGS-007: 環境パラメータ動的設定確認', () => {
      // 【テスト目的】: envName パラメータにより保持期間が動的に切り替わることを確認する
      // 【テスト内容】: Dev と Prod 環境で別々に LogGroupConstruct を作成し、RetentionInDays を比較
      // 【期待される動作】: Dev 環境: RetentionInDays = 3, Prod 環境: RetentionInDays = 30
      // 🔵 信頼性: REQ-036, REQ-037 より

      test('envName により保持期間が動的に切り替わること', () => {
        // 【テストデータ準備】: 独立した CDK App を使用して環境別テストを実行
        // 【修正内容】: 同一 App での複数スタック作成による CDK synthesis エラーを回避
        const devApp = new cdk.App();
        const devStack = new cdk.Stack(devApp, 'DevStack');
        new LogGroupConstruct(devStack, 'LogGroup', { envName: 'dev' });
        const devTemplate = Template.fromStack(devStack);

        // 【テストデータ準備】: Prod 環境用の独立した App
        const prodApp = new cdk.App();
        const prodStack = new cdk.Stack(prodApp, 'ProdStack');
        new LogGroupConstruct(prodStack, 'LogGroup', { envName: 'prod' });
        const prodTemplate = Template.fromStack(prodStack);

        // 【結果検証】: 環境別保持期間の確認
        // 【期待値確認】: Dev は 3 日、Prod は 30 日であること
        const devLogGroups = devTemplate.findResources('AWS::Logs::LogGroup');
        const prodLogGroups = prodTemplate.findResources('AWS::Logs::LogGroup');

        Object.values(devLogGroups).forEach((lg: any) => {
          expect(lg.Properties.RetentionInDays).toBe(3); // 【確認内容】: Dev 環境は 3 日 🔵
        });
        Object.values(prodLogGroups).forEach((lg: any) => {
          expect(lg.Properties.RetentionInDays).toBe(30); // 【確認内容】: Prod 環境は 30 日 🔵
        });
      });
    });

    // ============================================================================
    // TC-LOGS-008: カスタム保持期間オーバーライド確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-008: カスタム保持期間オーバーライド確認', () => {
      // 【テスト目的】: retentionDays プロパティでデフォルト値をオーバーライドできることを確認する
      // 【テスト内容】: LogGroupConstruct を `retentionDays: logs.RetentionDays.ONE_WEEK` で作成し、RetentionInDays を検証
      // 【期待される動作】: RetentionInDays が 7 (ONE_WEEK) に設定される
      // 🟡 信頼性: 設計仕様より

      test('retentionDays でデフォルト値をオーバーライドできること', () => {
        // 【テストデータ準備】: カスタム保持期間で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'dev',
          retentionDays: logs.RetentionDays.ONE_WEEK,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: カスタム保持期間の確認
        // 【期待値確認】: RetentionInDays が 7 であること
        const logGroups = template.findResources('AWS::Logs::LogGroup');
        Object.values(logGroups).forEach((lg: any) => {
          expect(lg.Properties.RetentionInDays).toBe(7); // 【確認内容】: カスタム保持期間 7 日 🟡
        });
      });
    });
  });

  // ============================================================================
  // KMS 暗号化テスト
  // ============================================================================

  describe('KMS 暗号化テスト', () => {
    // ============================================================================
    // TC-LOGS-009: KMS 暗号化キー作成確認
    // 🔵 信頼性: セキュリティベストプラクティスより
    // ============================================================================
    describe('TC-LOGS-009: KMS 暗号化キー作成確認', () => {
      // 【テスト目的】: Log Group 暗号化用の KMS キーが作成されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、KMS Key リソースを検証
      // 【期待される動作】: AWS::KMS::Key リソースが作成され、EnableKeyRotation が true に設定される
      // 🔵 信頼性: セキュリティベストプラクティスより

      test('KMS キーが作成されること', () => {
        // 【テストデータ準備】: デフォルト設定で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: KMS キーの存在と設定確認
        // 【期待値確認】: EnableKeyRotation が true であること
        template.hasResourceProperties('AWS::KMS::Key', {
          EnableKeyRotation: true, // 【確認内容】: キーローテーション有効 🔵
        });
      });
    });

    // ============================================================================
    // TC-LOGS-010: Log Group KMS 暗号化設定確認
    // 🔵 信頼性: セキュリティベストプラクティスより
    // ============================================================================
    describe('TC-LOGS-010: Log Group KMS 暗号化設定確認', () => {
      // 【テスト目的】: 全ての Log Group に KMS 暗号化が設定されていることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、KmsKeyId プロパティを検証
      // 【期待される動作】: 全ての Log Group に KmsKeyId プロパティが設定される
      // 🔵 信頼性: セキュリティベストプラクティスより

      test('全ての Log Group に KmsKeyId が設定されること', () => {
        // 【テストデータ準備】: デフォルト設定で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: 全ての Log Group の暗号化設定確認
        // 【期待値確認】: KmsKeyId が定義されていること
        const logGroups = template.findResources('AWS::Logs::LogGroup');
        Object.values(logGroups).forEach((lg: any) => {
          expect(lg.Properties.KmsKeyId).toBeDefined(); // 【確認内容】: KMS 暗号化が設定されている 🔵
        });
      });
    });

    // ============================================================================
    // TC-LOGS-011: カスタム KMS キー使用確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-011: カスタム KMS キー使用確認', () => {
      // 【テスト目的】: 外部から提供された KMS キーを使用できることを確認する
      // 【テスト内容】: 別途作成した KMS キーを encryptionKey パラメータで渡し、リソース数を検証
      // 【期待される動作】: 新しい KMS キーが作成されない (カウント確認)、Log Group が提供された KMS キーを参照する
      // 🟡 信頼性: 設計仕様より

      test('外部 KMS キーを使用できること', () => {
        // 【テストデータ準備】: カスタム KMS キーを作成
        const customKey = new kms.Key(stack, 'CustomKey');
        new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'dev',
          encryptionKey: customKey,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: KMS キー数の確認
        // 【期待値確認】: KMS キーが 1 つだけ (カスタムキーのみ) であること
        template.resourceCountIs('AWS::KMS::Key', 1); // 【確認内容】: カスタム KMS キーのみ存在 🟡
      });
    });

    // ============================================================================
    // TC-LOGS-012: 暗号化無効時の動作確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-012: 暗号化無効時の動作確認', () => {
      // 【テスト目的】: enableEncryption: false を指定した場合に KMS 暗号化が無効になることを確認する
      // 【テスト内容】: LogGroupConstruct を `enableEncryption: false` で作成し、KMS リソースとプロパティを検証
      // 【期待される動作】: AWS::KMS::Key リソースが作成されない、Log Group に KmsKeyId が設定されない
      // 🟡 信頼性: 設計仕様より

      test('enableEncryption: false で KMS 暗号化が無効になること', () => {
        // 【テストデータ準備】: 暗号化無効で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'dev',
          enableEncryption: false,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: KMS キーが作成されないことを確認
        // 【期待値確認】: KMS::Key が 0 個であること
        template.resourceCountIs('AWS::KMS::Key', 0); // 【確認内容】: KMS キーが作成されない 🟡

        // 【結果検証】: Log Group に KmsKeyId が設定されていないことを確認
        const logGroups = template.findResources('AWS::Logs::LogGroup');
        Object.values(logGroups).forEach((lg: any) => {
          expect(lg.Properties.KmsKeyId).toBeUndefined(); // 【確認内容】: 暗号化が無効 🟡
        });
      });
    });

    // ============================================================================
    // TC-LOGS-029: KMS キーポリシー CloudWatch 許可確認
    // 🔵 信頼性: セキュリティベストプラクティスより
    // ============================================================================
    describe('TC-LOGS-029: KMS キーポリシー CloudWatch 許可確認', () => {
      // 【テスト目的】: KMS キーが CloudWatch Logs サービスからのアクセスを許可していることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、KMS キーポリシーを検証
      // 【期待される動作】: KMS キーポリシーに `logs.{region}.amazonaws.com` が許可されている
      // 🔵 信頼性: セキュリティベストプラクティスより

      test('KMS キーポリシーが CloudWatch Logs サービスを許可すること', () => {
        // 【テストデータ準備】: デフォルト設定で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: KMS キーポリシーの確認
        // 【期待値確認】: CloudWatch Logs サービスプリンシパルが含まれること
        template.hasResourceProperties('AWS::KMS::Key', {
          KeyPolicy: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Principal: Match.objectLike({
                  Service: Match.stringLikeRegexp('logs\\..*\\.amazonaws\\.com'), // 【確認内容】: CloudWatch Logs サービス許可 🔵
                }),
              }),
            ]),
          }),
        });
      });
    });
  });

  // ============================================================================
  // Props 検証テスト
  // ============================================================================

  describe('Props 検証テスト', () => {
    // ============================================================================
    // TC-LOGS-018: ecsFrontendLogGroup プロパティ確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-018: ecsFrontendLogGroup プロパティ確認', () => {
      // 【テスト目的】: ecsFrontendLogGroup プロパティが定義され、アクセス可能であることを確認する
      // 【テスト内容】: LogGroupConstruct を作成し、ecsFrontendLogGroup プロパティを検証
      // 【期待される動作】: ecsFrontendLogGroup が undefined ではない、logGroupName が定義されている
      // 🟡 信頼性: 設計仕様より

      test('ecsFrontendLogGroup プロパティが定義されていること', () => {
        // 【テストデータ準備】: LogGroupConstruct を作成
        const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'dev',
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: プロパティが定義され、logGroupName が存在すること
        expect(logGroupConstruct.ecsFrontendLogGroup).toBeDefined(); // 【確認内容】: プロパティ存在 🟡
        expect(logGroupConstruct.ecsFrontendLogGroup.logGroupName).toBeDefined(); // 【確認内容】: logGroupName 存在 🟡
      });
    });

    // ============================================================================
    // TC-LOGS-019: ecsBackendLogGroup プロパティ確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-019: ecsBackendLogGroup プロパティ確認', () => {
      // 【テスト目的】: ecsBackendLogGroup プロパティが定義され、アクセス可能であることを確認する
      // 【テスト内容】: LogGroupConstruct を作成し、ecsBackendLogGroup プロパティを検証
      // 【期待される動作】: ecsBackendLogGroup が undefined ではない、logGroupName が定義されている
      // 🟡 信頼性: 設計仕様より

      test('ecsBackendLogGroup プロパティが定義されていること', () => {
        // 【テストデータ準備】: LogGroupConstruct を作成
        const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'dev',
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: プロパティが定義され、logGroupName が存在すること
        expect(logGroupConstruct.ecsBackendLogGroup).toBeDefined(); // 【確認内容】: プロパティ存在 🟡
        expect(logGroupConstruct.ecsBackendLogGroup.logGroupName).toBeDefined(); // 【確認内容】: logGroupName 存在 🟡
      });
    });

    // ============================================================================
    // TC-LOGS-020: rdsLogGroup プロパティ確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-020: rdsLogGroup プロパティ確認', () => {
      // 【テスト目的】: rdsLogGroup プロパティが定義され、アクセス可能であることを確認する
      // 【テスト内容】: LogGroupConstruct を作成し、rdsLogGroup プロパティを検証
      // 【期待される動作】: rdsLogGroup が undefined ではない、logGroupName が定義されている
      // 🟡 信頼性: 設計仕様より

      test('rdsLogGroup プロパティが定義されていること', () => {
        // 【テストデータ準備】: LogGroupConstruct を作成
        const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'dev',
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: プロパティが定義され、logGroupName が存在すること
        expect(logGroupConstruct.rdsLogGroup).toBeDefined(); // 【確認内容】: プロパティ存在 🟡
        expect(logGroupConstruct.rdsLogGroup.logGroupName).toBeDefined(); // 【確認内容】: logGroupName 存在 🟡
      });
    });

    // ============================================================================
    // TC-LOGS-021: vpcFlowLogGroup プロパティ確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-021: vpcFlowLogGroup プロパティ確認', () => {
      // 【テスト目的】: vpcFlowLogGroup プロパティが定義され、アクセス可能であることを確認する
      // 【テスト内容】: LogGroupConstruct を作成し、vpcFlowLogGroup プロパティを検証
      // 【期待される動作】: vpcFlowLogGroup が undefined ではない、logGroupName が定義されている
      // 🟡 信頼性: 設計仕様より

      test('vpcFlowLogGroup プロパティが定義されていること', () => {
        // 【テストデータ準備】: LogGroupConstruct を作成
        const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'dev',
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: プロパティが定義され、logGroupName が存在すること
        expect(logGroupConstruct.vpcFlowLogGroup).toBeDefined(); // 【確認内容】: プロパティ存在 🟡
        expect(logGroupConstruct.vpcFlowLogGroup.logGroupName).toBeDefined(); // 【確認内容】: logGroupName 存在 🟡
      });
    });

    // ============================================================================
    // TC-LOGS-022: encryptionKey プロパティ確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-022: encryptionKey プロパティ確認', () => {
      // 【テスト目的】: encryptionKey プロパティが定義され、アクセス可能であることを確認する
      // 【テスト内容】: LogGroupConstruct を作成し、encryptionKey プロパティを検証
      // 【期待される動作】: encryptionKey が undefined ではない、keyArn が定義されている
      // 🟡 信頼性: 設計仕様より

      test('encryptionKey プロパティが定義されていること', () => {
        // 【テストデータ準備】: デフォルト設定で LogGroupConstruct を作成
        const logGroupConstruct = new LogGroupConstruct(stack, 'LogGroup', {
          envName: 'dev',
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: プロパティが定義され、keyArn が存在すること
        expect(logGroupConstruct.encryptionKey).toBeDefined(); // 【確認内容】: プロパティ存在 🟡
        expect(logGroupConstruct.encryptionKey?.keyArn).toBeDefined(); // 【確認内容】: keyArn 存在 🟡
      });
    });

    // ============================================================================
    // TC-LOGS-024: envName 必須パラメータ確認
    // 🔵 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-LOGS-024: envName 必須パラメータ確認', () => {
      // 【テスト目的】: envName が必須パラメータであり、有効な値のみ受け付けることを確認する
      // 【テスト内容】: envName: 'dev' と 'prod' で正常に作成できることを確認
      // 【期待される動作】: 'dev' と 'prod' のみが有効な envName 値として受け付けられる
      // 🔵 信頼性: 設計仕様より

      test('envName: dev が有効であること', () => {
        // 【テストデータ準備】: 環境名 'dev' で LogGroupConstruct を作成
        expect(() => {
          new LogGroupConstruct(stack, 'LogGroupDev', { envName: 'dev' });
        }).not.toThrow(); // 【確認内容】: Dev 環境で正常に作成できる 🔵
      });

      test('envName: prod が有効であること', () => {
        // 【テストデータ準備】: 環境名 'prod' で LogGroupConstruct を作成
        const prodStack = new cdk.Stack(app, 'ProdStack');
        expect(() => {
          new LogGroupConstruct(prodStack, 'LogGroupProd', { envName: 'prod' });
        }).not.toThrow(); // 【確認内容】: Prod 環境で正常に作成できる 🔵
      });
    });
  });

  // ============================================================================
  // スナップショットテスト
  // ============================================================================

  describe('スナップショットテスト', () => {
    // ============================================================================
    // TC-LOGS-025: Dev 環境テンプレートスナップショット
    // 🔵 信頼性: CDK ベストプラクティスより
    // ============================================================================
    describe('TC-LOGS-025: Dev 環境テンプレートスナップショット', () => {
      // 【テスト目的】: Dev 環境の CloudFormation テンプレートが期待通りであることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、スナップショットと比較
      // 【期待される動作】: テンプレートが保存されたスナップショットと一致する
      // 🔵 信頼性: CDK ベストプラクティスより

      test('Dev 環境テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: Dev 環境で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの比較
        // 【期待値確認】: テンプレートが以前のスナップショットと一致すること
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: Dev 環境スナップショット 🔵
      });
    });

    // ============================================================================
    // TC-LOGS-026: Prod 環境テンプレートスナップショット
    // 🔵 信頼性: CDK ベストプラクティスより
    // ============================================================================
    describe('TC-LOGS-026: Prod 環境テンプレートスナップショット', () => {
      // 【テスト目的】: Prod 環境の CloudFormation テンプレートが期待通りであることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'prod'` で作成し、スナップショットと比較
      // 【期待される動作】: テンプレートが保存されたスナップショットと一致する
      // 🔵 信頼性: CDK ベストプラクティスより

      test('Prod 環境テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: Prod 環境で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'prod' });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの比較
        // 【期待値確認】: テンプレートが以前のスナップショットと一致すること
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: Prod 環境スナップショット 🔵
      });
    });
  });

  // ============================================================================
  // エッジケーステスト
  // ============================================================================

  describe('エッジケーステスト', () => {
    // ============================================================================
    // TC-LOGS-027: RemovalPolicy Dev 環境確認
    // 🟡 信頼性: CDK ベストプラクティスより
    // ============================================================================
    describe('TC-LOGS-027: RemovalPolicy Dev 環境確認', () => {
      // 【テスト目的】: Dev 環境で Log Group の RemovalPolicy が DESTROY に設定されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'dev'` で作成し、DeletionPolicy を検証
      // 【期待される動作】: DeletionPolicy が 'Delete' に設定される
      // 🟡 信頼性: CDK ベストプラクティスより

      test('Dev 環境で DeletionPolicy が Delete であること', () => {
        // 【テストデータ準備】: Dev 環境で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: 全ての Log Group の DeletionPolicy 確認
        // 【期待値確認】: DeletionPolicy が 'Delete' であること
        const logGroups = template.findResources('AWS::Logs::LogGroup');
        Object.values(logGroups).forEach((lg: any) => {
          expect(lg.DeletionPolicy).toBe('Delete'); // 【確認内容】: Dev 環境は削除可能 🟡
        });
      });
    });

    // ============================================================================
    // TC-LOGS-028: RemovalPolicy Prod 環境確認
    // 🟡 信頼性: CDK ベストプラクティスより
    // ============================================================================
    describe('TC-LOGS-028: RemovalPolicy Prod 環境確認', () => {
      // 【テスト目的】: Prod 環境で Log Group の RemovalPolicy が RETAIN に設定されることを確認する
      // 【テスト内容】: LogGroupConstruct を `envName: 'prod'` で作成し、DeletionPolicy を検証
      // 【期待される動作】: DeletionPolicy が 'Retain' に設定される
      // 🟡 信頼性: CDK ベストプラクティスより

      test('Prod 環境で DeletionPolicy が Retain であること', () => {
        // 【テストデータ準備】: Prod 環境で LogGroupConstruct を作成
        new LogGroupConstruct(stack, 'LogGroup', { envName: 'prod' });
        const template = Template.fromStack(stack);

        // 【結果検証】: 全ての Log Group の DeletionPolicy 確認
        // 【期待値確認】: DeletionPolicy が 'Retain' であること
        const logGroups = template.findResources('AWS::Logs::LogGroup');
        Object.values(logGroups).forEach((lg: any) => {
          expect(lg.DeletionPolicy).toBe('Retain'); // 【確認内容】: Prod 環境は保持される 🟡
        });
      });
    });

    // ============================================================================
    // TC-LOGS-030: 複数インスタンス作成確認
    // 🟡 信頼性: CDK 動作仕様より
    // ============================================================================
    describe('TC-LOGS-030: 複数インスタンス作成確認', () => {
      // 【テスト目的】: 同一 Stack 内で複数の LogGroupConstruct インスタンスが作成できることを確認する
      // 【テスト内容】: LogGroupConstruct を 2 つの異なる ID で作成し、Log Group リソース数を検証
      // 【期待される動作】: 8 つの Log Group が作成される (4 種類 x 2 インスタンス)
      // 🟡 信頼性: CDK 動作仕様より

      test('複数の LogGroupConstruct を作成できること', () => {
        // 【テストデータ準備】: 2 つの LogGroupConstruct インスタンスを作成
        new LogGroupConstruct(stack, 'LogGroup1', { envName: 'dev' });
        new LogGroupConstruct(stack, 'LogGroup2', { envName: 'dev' });
        const template = Template.fromStack(stack);

        // 【結果検証】: Log Group 数の確認
        // 【期待値確認】: 4 種類 x 2 インスタンス = 8 Log Groups であること
        template.resourceCountIs('AWS::Logs::LogGroup', 8); // 【確認内容】: 複数インスタンス作成可能 🟡
      });
    });
  });
});
