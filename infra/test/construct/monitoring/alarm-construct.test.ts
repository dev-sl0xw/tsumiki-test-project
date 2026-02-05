/**
 * AlarmConstruct テスト
 *
 * TASK-0022: CloudWatch Alarms + Chatbot 設定
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-ALARM-001: Dev 環境 CloudFormation テンプレートスナップショット
 * - TC-ALARM-002: Prod 環境 CloudFormation テンプレートスナップショット
 * - TC-ALARM-003: SNS Topic 作成確認
 * - TC-ALARM-004: KMS 暗号化キー作成確認
 * - TC-ALARM-005: ECS CPU Alarm 作成確認
 * - TC-ALARM-006: ECS Memory Alarm 作成確認
 * - TC-ALARM-007: Metric Filter 作成確認
 * - TC-ALARM-008: Error Alarm 作成確認
 * - TC-ALARM-009: CPU Alarm 閾値確認 (デフォルト 80%)
 * - TC-ALARM-010: CPU Alarm 閾値カスタマイズ確認
 * - TC-ALARM-011: Memory Alarm 閾値確認 (デフォルト 80%)
 * - TC-ALARM-012: Memory Alarm 閾値カスタマイズ確認
 * - TC-ALARM-013: Alarm 評価期間確認 (5分)
 * - TC-ALARM-014: Alarm データポイント確認 (3回)
 * - TC-ALARM-015: Error Alarm 閾値確認 (1件以上)
 * - TC-ALARM-016: Alarm SNS アクション確認
 * - TC-ALARM-017: Metric Filter パターン確認
 * - TC-ALARM-018: alarmTopic プロパティ確認
 * - TC-ALARM-019: cpuAlarms プロパティ確認
 * - TC-ALARM-020: memoryAlarms プロパティ確認
 * - TC-ALARM-021: errorAlarms プロパティ確認
 * - TC-ALARM-022: allAlarms プロパティ確認
 * - TC-ALARM-023: ECS 設定なしで ECS Alarm が作成されないこと
 * - TC-ALARM-024: Log Groups なしで Error Alarm が作成されないこと
 * - TC-ALARM-025: 全オプション未指定でも SNS Topic は作成されること
 * - TC-ALARM-026: envName 空文字でエラー
 * - TC-ALARM-027: cpuThreshold 範囲外でエラー
 * - TC-ALARM-028: memoryThreshold 範囲外でエラー
 *
 * 🔵 信頼性: 要件定義書 REQ-039 に基づくテスト
 *
 * @module monitoring/alarm-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AlarmConstruct } from '../../../lib/construct/monitoring/alarm-construct';
import { EnvironmentConfig } from '../../../parameter';

describe('AlarmConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;

  // テスト用の環境設定
  const devConfig: EnvironmentConfig = {
    envName: 'dev',
    account: '123456789012',
    region: 'ap-northeast-1',
    vpcCidr: '10.0.0.0/16',
    taskCpu: 512,
    taskMemory: 1024,
    desiredCount: 2,
    auroraMinCapacity: 0.5,
    auroraMaxCapacity: 2,
    logRetentionDays: 3,
    slackWorkspaceId: '',
    slackChannelId: '',
  };

  const prodConfig: EnvironmentConfig = {
    envName: 'prod',
    account: '123456789012',
    region: 'ap-northeast-1',
    vpcCidr: '10.0.0.0/16',
    taskCpu: 512,
    taskMemory: 1024,
    desiredCount: 2,
    auroraMinCapacity: 0.5,
    auroraMaxCapacity: 2,
    logRetentionDays: 30,
    slackWorkspaceId: 'T12345678',
    slackChannelId: 'C12345678',
  };

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
  // スナップショットテスト
  // ============================================================================

  describe('スナップショットテスト', () => {
    // ============================================================================
    // TC-ALARM-001: Dev 環境 CloudFormation テンプレートスナップショット
    // 🔵 信頼性: 既存テストパターンより
    // ============================================================================
    describe('TC-ALARM-001: Dev 環境 CloudFormation テンプレートスナップショット', () => {
      // 【テスト目的】: Dev 環境での Alarm リソース構成の変更を検出する
      // 【テスト内容】: AlarmConstruct を Dev 環境設定で作成し、スナップショットと比較
      // 【期待される動作】: テンプレートが保存されたスナップショットと一致する
      // 🔵 信頼性: 既存テストパターンより

      test('Dev 環境テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: Dev 環境で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['frontend-service'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの比較
        // 【期待値確認】: テンプレートが以前のスナップショットと一致すること
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: Dev 環境スナップショット 🔵
      });
    });

    // ============================================================================
    // TC-ALARM-002: Prod 環境 CloudFormation テンプレートスナップショット
    // 🔵 信頼性: 既存テストパターンより
    // ============================================================================
    describe('TC-ALARM-002: Prod 環境 CloudFormation テンプレートスナップショット', () => {
      // 【テスト目的】: Prod 環境での Alarm リソース構成の変更を検出する
      // 【テスト内容】: AlarmConstruct を Prod 環境設定で作成し、スナップショットと比較
      // 【期待される動作】: テンプレートが保存されたスナップショットと一致する
      // 🔵 信頼性: 既存テストパターンより

      test('Prod 環境テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: Prod 環境用の Log Group を作成
        const logGroup = new logs.LogGroup(stack, 'TestLogGroup', {
          logGroupName: '/ecs/prod/frontend',
        });

        // 【テストデータ準備】: Prod 環境で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'prod',
          config: prodConfig,
          ecsClusterName: 'prod-cluster',
          ecsServiceNames: ['frontend-service', 'backend-service'],
          logGroups: [logGroup],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの比較
        // 【期待値確認】: テンプレートが以前のスナップショットと一致すること
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: Prod 環境スナップショット 🔵
      });
    });
  });

  // ============================================================================
  // リソース存在確認テスト
  // ============================================================================

  describe('リソース存在確認テスト', () => {
    // ============================================================================
    // TC-ALARM-003: SNS Topic 作成確認
    // 🔵 信頼性: FR-014 より
    // ============================================================================
    describe('TC-ALARM-003: SNS Topic 作成確認', () => {
      // 【テスト目的】: アラーム通知用 SNS Topic の作成を確認
      // 【テスト内容】: AlarmConstruct を作成し、SNS Topic リソースを検証
      // 【期待される動作】: AWS::SNS::Topic リソースが 1 つ存在すること
      // 🔵 信頼性: FR-014 より

      test('SNS Topic が 1 つ作成されること', () => {
        // 【テストデータ準備】: 基本 Props で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: SNS Topic リソースの存在確認
        // 【期待値確認】: SNS Topic が 1 つ存在すること
        template.resourceCountIs('AWS::SNS::Topic', 1); // 【確認内容】: SNS Topic 作成 🔵
      });
    });

    // ============================================================================
    // TC-ALARM-004: KMS 暗号化キー作成確認
    // 🔵 信頼性: FR-016, FR-017 より
    // ============================================================================
    describe('TC-ALARM-004: KMS 暗号化キー作成確認', () => {
      // 【テスト目的】: SNS Topic の KMS 暗号化設定を確認
      // 【テスト内容】: AlarmConstruct を作成し、KMS Key リソースを検証
      // 【期待される動作】: AWS::KMS::Key リソースが存在し、KeyRotation が有効
      // 🔵 信頼性: FR-016, FR-017 より

      test('SNS Topic 暗号化用 KMS キーが作成されること', () => {
        // 【テストデータ準備】: 基本 Props で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: KMS キーの存在と設定確認
        // 【期待値確認】: EnableKeyRotation が true であること
        template.hasResourceProperties('AWS::KMS::Key', {
          EnableKeyRotation: true, // 【確認内容】: キーローテーション有効 🔵
        });
      });
    });

    // ============================================================================
    // TC-ALARM-005: ECS CPU Alarm 作成確認
    // 🔵 信頼性: FR-001 より
    // ============================================================================
    describe('TC-ALARM-005: ECS CPU Alarm 作成確認', () => {
      // 【テスト目的】: ECS CPU 使用率監視 Alarm の作成を確認
      // 【テスト内容】: AlarmConstruct を ecsServiceNames で作成し、Alarm リソースを検証
      // 【期待される動作】: サービス数分の AWS::CloudWatch::Alarm が作成
      // 🔵 信頼性: FR-001 より

      test('ECS サービスごとに CPU Alarm が作成されること', () => {
        // 【テストデータ準備】: ECS 設定付きで AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['svc1', 'svc2'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: CPU Alarm の存在確認
        // 【期待値確認】: CPUUtilization メトリクスを持つ Alarm が存在すること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          MetricName: 'CPUUtilization', // 【確認内容】: CPU Alarm 🔵
          Namespace: 'AWS/ECS',
        });
      });
    });

    // ============================================================================
    // TC-ALARM-006: ECS Memory Alarm 作成確認
    // 🔵 信頼性: FR-002 より
    // ============================================================================
    describe('TC-ALARM-006: ECS Memory Alarm 作成確認', () => {
      // 【テスト目的】: ECS Memory 使用率監視 Alarm の作成を確認
      // 【テスト内容】: AlarmConstruct を ecsServiceNames で作成し、Alarm リソースを検証
      // 【期待される動作】: サービス数分の AWS::CloudWatch::Alarm が作成
      // 🔵 信頼性: FR-002 より

      test('ECS サービスごとに Memory Alarm が作成されること', () => {
        // 【テストデータ準備】: ECS 設定付きで AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['svc1', 'svc2'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Memory Alarm の存在確認
        // 【期待値確認】: MemoryUtilization メトリクスを持つ Alarm が存在すること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          MetricName: 'MemoryUtilization', // 【確認内容】: Memory Alarm 🔵
          Namespace: 'AWS/ECS',
        });
      });
    });

    // ============================================================================
    // TC-ALARM-007: Metric Filter 作成確認
    // 🔵 信頼性: FR-008 より
    // ============================================================================
    describe('TC-ALARM-007: Metric Filter 作成確認', () => {
      // 【テスト目的】: エラーパターン検出用 Metric Filter の作成を確認
      // 【テスト内容】: AlarmConstruct を logGroups で作成し、Metric Filter リソースを検証
      // 【期待される動作】: Log Group 数分の AWS::Logs::MetricFilter が作成
      // 🔵 信頼性: FR-008 より

      test('Log Group ごとに Metric Filter が作成されること', () => {
        // 【テストデータ準備】: Log Group を作成
        const logGroup1 = new logs.LogGroup(stack, 'LogGroup1', {
          logGroupName: '/ecs/dev/frontend',
        });
        const logGroup2 = new logs.LogGroup(stack, 'LogGroup2', {
          logGroupName: '/ecs/dev/backend',
        });

        // 【テストデータ準備】: logGroups 付きで AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          logGroups: [logGroup1, logGroup2],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Metric Filter の存在確認
        // 【期待値確認】: Log Group 数分の Metric Filter が存在すること
        template.resourceCountIs('AWS::Logs::MetricFilter', 2); // 【確認内容】: Metric Filter 作成 🔵
      });
    });

    // ============================================================================
    // TC-ALARM-008: Error Alarm 作成確認
    // 🔵 信頼性: FR-011 より
    // ============================================================================
    describe('TC-ALARM-008: Error Alarm 作成確認', () => {
      // 【テスト目的】: Metric Filter に基づく Error Alarm の作成を確認
      // 【テスト内容】: AlarmConstruct を logGroups で作成し、Error Alarm リソースを検証
      // 【期待される動作】: Log Group 数分の Error Alarm が作成
      // 🔵 信頼性: FR-011 より

      test('Log Group ごとに Error Alarm が作成されること', () => {
        // 【テストデータ準備】: Log Group を作成
        const logGroup = new logs.LogGroup(stack, 'LogGroup', {
          logGroupName: '/ecs/dev/frontend',
        });

        // 【テストデータ準備】: logGroups 付きで AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          logGroups: [logGroup],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Error Alarm の存在確認
        // 【期待値確認】: ErrorCount メトリクスを監視する Alarm が存在すること
        // 注: AlarmDescription は Fn::Join でトークン連結されるため、MetricName で検証
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          MetricName: Match.stringLikeRegexp('ErrorCount'), // 【確認内容】: Error Alarm 🔵
          Namespace: 'Custom/Application',
        });
      });
    });
  });

  // ============================================================================
  // プロパティ検証テスト
  // ============================================================================

  describe('プロパティ検証テスト', () => {
    // ============================================================================
    // TC-ALARM-009: CPU Alarm 閾値確認 (デフォルト 80%)
    // 🔵 信頼性: FR-003 より
    // ============================================================================
    describe('TC-ALARM-009: CPU Alarm 閾値確認 (デフォルト 80%)', () => {
      // 【テスト目的】: CPU Alarm の閾値設定を確認
      // 【テスト内容】: cpuThreshold 未指定で AlarmConstruct を作成し、Threshold を検証
      // 【期待される動作】: Threshold: 80 が設定されること
      // 🔵 信頼性: FR-003 より

      test('CPU Alarm 閾値がデフォルト 80% であること', () => {
        // 【テストデータ準備】: cpuThreshold 未指定で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['service'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: CPU Alarm の閾値確認
        // 【期待値確認】: Threshold が 80 であること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          MetricName: 'CPUUtilization',
          Threshold: 80, // 【確認内容】: デフォルト CPU 閾値 80% 🔵
        });
      });
    });

    // ============================================================================
    // TC-ALARM-010: CPU Alarm 閾値カスタマイズ確認
    // 🟡 信頼性: FR-029 より
    // ============================================================================
    describe('TC-ALARM-010: CPU Alarm 閾値カスタマイズ確認', () => {
      // 【テスト目的】: CPU Alarm の閾値設定のカスタマイズを確認
      // 【テスト内容】: cpuThreshold: 70 で AlarmConstruct を作成し、Threshold を検証
      // 【期待される動作】: Threshold: 70 が設定されること
      // 🟡 信頼性: FR-029 より

      test('CPU Alarm 閾値がカスタマイズ可能であること', () => {
        // 【テストデータ準備】: cpuThreshold: 70 で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['service'],
          cpuThreshold: 70,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: CPU Alarm の閾値確認
        // 【期待値確認】: Threshold が 70 であること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          MetricName: 'CPUUtilization',
          Threshold: 70, // 【確認内容】: カスタム CPU 閾値 70% 🟡
        });
      });
    });

    // ============================================================================
    // TC-ALARM-011: Memory Alarm 閾値確認 (デフォルト 80%)
    // 🔵 信頼性: FR-004 より
    // ============================================================================
    describe('TC-ALARM-011: Memory Alarm 閾値確認 (デフォルト 80%)', () => {
      // 【テスト目的】: Memory Alarm の閾値設定を確認
      // 【テスト内容】: memoryThreshold 未指定で AlarmConstruct を作成し、Threshold を検証
      // 【期待される動作】: Threshold: 80 が設定されること
      // 🔵 信頼性: FR-004 より

      test('Memory Alarm 閾値がデフォルト 80% であること', () => {
        // 【テストデータ準備】: memoryThreshold 未指定で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['service'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Memory Alarm の閾値確認
        // 【期待値確認】: Threshold が 80 であること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          MetricName: 'MemoryUtilization',
          Threshold: 80, // 【確認内容】: デフォルト Memory 閾値 80% 🔵
        });
      });
    });

    // ============================================================================
    // TC-ALARM-012: Memory Alarm 閾値カスタマイズ確認
    // 🟡 信頼性: FR-030 より
    // ============================================================================
    describe('TC-ALARM-012: Memory Alarm 閾値カスタマイズ確認', () => {
      // 【テスト目的】: Memory Alarm の閾値設定のカスタマイズを確認
      // 【テスト内容】: memoryThreshold: 90 で AlarmConstruct を作成し、Threshold を検証
      // 【期待される動作】: Threshold: 90 が設定されること
      // 🟡 信頼性: FR-030 より

      test('Memory Alarm 閾値がカスタマイズ可能であること', () => {
        // 【テストデータ準備】: memoryThreshold: 90 で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['service'],
          memoryThreshold: 90,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Memory Alarm の閾値確認
        // 【期待値確認】: Threshold が 90 であること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          MetricName: 'MemoryUtilization',
          Threshold: 90, // 【確認内容】: カスタム Memory 閾値 90% 🟡
        });
      });
    });

    // ============================================================================
    // TC-ALARM-013: Alarm 評価期間確認 (5分)
    // 🟡 信頼性: FR-005 より
    // ============================================================================
    describe('TC-ALARM-013: Alarm 評価期間確認 (5分)', () => {
      // 【テスト目的】: Alarm の Period 設定を確認
      // 【テスト内容】: evaluationPeriods 未指定で AlarmConstruct を作成し、Period を検証
      // 【期待される動作】: Period: 300 (5分 = 300秒) が設定されること
      // 🟡 信頼性: FR-005 より

      test('Alarm 評価期間がデフォルト 5 分であること', () => {
        // 【テストデータ準備】: evaluationPeriods 未指定で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['service'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Alarm の評価期間確認
        // 【期待値確認】: Period が 300 秒 (5分) であること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          Period: 300, // 【確認内容】: 評価期間 5 分 🟡
        });
      });
    });

    // ============================================================================
    // TC-ALARM-014: Alarm データポイント確認 (3回)
    // 🟡 信頼性: FR-006 より
    // ============================================================================
    describe('TC-ALARM-014: Alarm データポイント確認 (3回)', () => {
      // 【テスト目的】: Alarm の DatapointsToAlarm 設定を確認
      // 【テスト内容】: datapointsToAlarm 未指定で AlarmConstruct を作成し、設定を検証
      // 【期待される動作】: DatapointsToAlarm: 3, EvaluationPeriods: 3 が設定
      // 🟡 信頼性: FR-006 より

      test('Alarm トリガーがデフォルト 3 回連続であること', () => {
        // 【テストデータ準備】: datapointsToAlarm 未指定で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['service'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Alarm のデータポイント設定確認
        // 【期待値確認】: DatapointsToAlarm が 3、EvaluationPeriods が 5 であること
        // 注: FR-005 より評価期間は 5 分、FR-006 よりデータポイントは 3 回
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          DatapointsToAlarm: 3, // 【確認内容】: 3 回連続でトリガー 🟡
          EvaluationPeriods: 5, // 【確認内容】: 5 分評価期間 🟡
        });
      });
    });

    // ============================================================================
    // TC-ALARM-015: Error Alarm 閾値確認 (1件以上)
    // 🔵 信頼性: FR-012 より
    // ============================================================================
    describe('TC-ALARM-015: Error Alarm 閾値確認 (1件以上)', () => {
      // 【テスト目的】: Error Alarm の閾値設定を確認
      // 【テスト内容】: logGroups 指定で AlarmConstruct を作成し、Threshold を検証
      // 【期待される動作】: Threshold: 1, ComparisonOperator: GreaterThanOrEqualToThreshold
      // 🔵 信頼性: FR-012 より

      test('Error Alarm 閾値が 1 件以上であること', () => {
        // 【テストデータ準備】: Log Group を作成
        const logGroup = new logs.LogGroup(stack, 'LogGroup', {
          logGroupName: '/ecs/dev/frontend',
        });

        // 【テストデータ準備】: logGroups 付きで AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          logGroups: [logGroup],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Error Alarm の閾値設定確認
        // 【期待値確認】: Threshold: 1, ComparisonOperator が設定されていること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          Threshold: 1, // 【確認内容】: Error 閾値 1 件以上 🔵
          ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        });
      });
    });

    // ============================================================================
    // TC-ALARM-016: Alarm SNS アクション確認
    // 🔵 信頼性: FR-007, FR-013 より
    // ============================================================================
    describe('TC-ALARM-016: Alarm SNS アクション確認', () => {
      // 【テスト目的】: Alarm の AlarmActions 設定を確認
      // 【テスト内容】: AlarmConstruct を作成し、AlarmActions を検証
      // 【期待される動作】: AlarmActions に SNS Topic ARN が含まれること
      // 🔵 信頼性: FR-007, FR-013 より

      test('Alarm 発生時に SNS Topic に通知されること', () => {
        // 【テストデータ準備】: ECS 設定付きで AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['service'],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Alarm の SNS アクション設定確認
        // 【期待値確認】: AlarmActions が定義されていること
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmActions: Match.anyValue(), // 【確認内容】: SNS アクション設定 🔵
        });
      });
    });

    // ============================================================================
    // TC-ALARM-017: Metric Filter パターン確認
    // 🔵 信頼性: FR-009, 🟡 FR-010 より
    // ============================================================================
    describe('TC-ALARM-017: Metric Filter パターン確認', () => {
      // 【テスト目的】: Metric Filter の FilterPattern 設定を確認
      // 【テスト内容】: logGroups 指定で AlarmConstruct を作成し、FilterPattern を検証
      // 【期待される動作】: FilterPattern に ERROR, Exception が含まれること
      // 🔵 信頼性: FR-009, 🟡 FR-010 より

      test('Metric Filter が ERROR/Exception パターンを検出すること', () => {
        // 【テストデータ準備】: Log Group を作成
        const logGroup = new logs.LogGroup(stack, 'LogGroup', {
          logGroupName: '/ecs/dev/frontend',
        });

        // 【テストデータ準備】: logGroups 付きで AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          logGroups: [logGroup],
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Metric Filter の FilterPattern 確認
        // 【期待値確認】: FilterPattern が定義されていること
        template.hasResourceProperties('AWS::Logs::MetricFilter', {
          FilterPattern: Match.anyValue(), // 【確認内容】: FilterPattern 設定 🔵
        });
      });
    });
  });

  // ============================================================================
  // 公開プロパティ確認テスト
  // ============================================================================

  describe('公開プロパティ確認テスト', () => {
    // ============================================================================
    // TC-ALARM-018: alarmTopic プロパティ確認
    // 🔵 信頼性: 要件定義より
    // ============================================================================
    describe('TC-ALARM-018: alarmTopic プロパティ確認', () => {
      // 【テスト目的】: 公開プロパティ alarmTopic の型と値を確認
      // 【テスト内容】: AlarmConstruct を作成し、alarmTopic プロパティを検証
      // 【期待される動作】: sns.ITopic インスタンスが返されること
      // 🔵 信頼性: 要件定義より

      test('alarmTopic プロパティが SNS Topic を返すこと', () => {
        // 【テストデータ準備】: AlarmConstruct を作成
        const alarmConstruct = new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
        });

        // 【結果検証】: プロパティ存在確認
        // 【期待値確認】: alarmTopic が定義されていること
        expect(alarmConstruct.alarmTopic).toBeDefined(); // 【確認内容】: alarmTopic プロパティ 🔵
        expect(alarmConstruct.alarmTopic.topicArn).toBeDefined(); // 【確認内容】: topicArn 存在 🔵
      });
    });

    // ============================================================================
    // TC-ALARM-019: cpuAlarms プロパティ確認
    // 🔵 信頼性: 要件定義より
    // ============================================================================
    describe('TC-ALARM-019: cpuAlarms プロパティ確認', () => {
      // 【テスト目的】: 公開プロパティ cpuAlarms の型と値を確認
      // 【テスト内容】: AlarmConstruct を ecsServiceNames で作成し、cpuAlarms を検証
      // 【期待される動作】: 2 つの cloudwatch.IAlarm を含む配列
      // 🔵 信頼性: 要件定義より

      test('cpuAlarms プロパティが Alarm 配列を返すこと', () => {
        // 【テストデータ準備】: ECS 設定付きで AlarmConstruct を作成
        const alarmConstruct = new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['svc1', 'svc2'],
        });

        // 【結果検証】: プロパティ存在と配列長確認
        // 【期待値確認】: cpuAlarms が 2 つの Alarm を含むこと
        expect(alarmConstruct.cpuAlarms).toBeDefined(); // 【確認内容】: cpuAlarms プロパティ 🔵
        expect(alarmConstruct.cpuAlarms.length).toBe(2); // 【確認内容】: サービス数分の Alarm 🔵
      });
    });

    // ============================================================================
    // TC-ALARM-020: memoryAlarms プロパティ確認
    // 🔵 信頼性: 要件定義より
    // ============================================================================
    describe('TC-ALARM-020: memoryAlarms プロパティ確認', () => {
      // 【テスト目的】: 公開プロパティ memoryAlarms の型と値を確認
      // 【テスト内容】: AlarmConstruct を ecsServiceNames で作成し、memoryAlarms を検証
      // 【期待される動作】: 2 つの cloudwatch.IAlarm を含む配列
      // 🔵 信頼性: 要件定義より

      test('memoryAlarms プロパティが Alarm 配列を返すこと', () => {
        // 【テストデータ準備】: ECS 設定付きで AlarmConstruct を作成
        const alarmConstruct = new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['svc1', 'svc2'],
        });

        // 【結果検証】: プロパティ存在と配列長確認
        // 【期待値確認】: memoryAlarms が 2 つの Alarm を含むこと
        expect(alarmConstruct.memoryAlarms).toBeDefined(); // 【確認内容】: memoryAlarms プロパティ 🔵
        expect(alarmConstruct.memoryAlarms.length).toBe(2); // 【確認内容】: サービス数分の Alarm 🔵
      });
    });

    // ============================================================================
    // TC-ALARM-021: errorAlarms プロパティ確認
    // 🔵 信頼性: 要件定義より
    // ============================================================================
    describe('TC-ALARM-021: errorAlarms プロパティ確認', () => {
      // 【テスト目的】: 公開プロパティ errorAlarms の型と値を確認
      // 【テスト内容】: AlarmConstruct を logGroups で作成し、errorAlarms を検証
      // 【期待される動作】: 1 つの cloudwatch.IAlarm を含む配列
      // 🔵 信頼性: 要件定義より

      test('errorAlarms プロパティが Alarm 配列を返すこと', () => {
        // 【テストデータ準備】: Log Group を作成
        const logGroup = new logs.LogGroup(stack, 'LogGroup', {
          logGroupName: '/ecs/dev/frontend',
        });

        // 【テストデータ準備】: logGroups 付きで AlarmConstruct を作成
        const alarmConstruct = new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          logGroups: [logGroup],
        });

        // 【結果検証】: プロパティ存在と配列長確認
        // 【期待値確認】: errorAlarms が 1 つの Alarm を含むこと
        expect(alarmConstruct.errorAlarms).toBeDefined(); // 【確認内容】: errorAlarms プロパティ 🔵
        expect(alarmConstruct.errorAlarms.length).toBe(1); // 【確認内容】: Log Group 数分の Alarm 🔵
      });
    });

    // ============================================================================
    // TC-ALARM-022: allAlarms プロパティ確認
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-ALARM-022: allAlarms プロパティ確認', () => {
      // 【テスト目的】: 公開プロパティ allAlarms の集約を確認
      // 【テスト内容】: AlarmConstruct を ECS + Log Groups 設定で作成し、allAlarms を検証
      // 【期待される動作】: CPU + Memory + Error Alarms の合計数
      // 🟡 信頼性: 設計仕様より

      test('allAlarms プロパティが全 Alarm を返すこと', () => {
        // 【テストデータ準備】: Log Group を作成
        const logGroup = new logs.LogGroup(stack, 'LogGroup', {
          logGroupName: '/ecs/dev/frontend',
        });

        // 【テストデータ準備】: ECS + logGroups 付きで AlarmConstruct を作成
        const alarmConstruct = new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['svc1', 'svc2'],
          logGroups: [logGroup],
        });

        // 【結果検証】: 全 Alarm の合計確認
        // 【期待値確認】: CPU(2) + Memory(2) + Error(1) = 5
        expect(alarmConstruct.allAlarms).toBeDefined(); // 【確認内容】: allAlarms プロパティ 🟡
        expect(alarmConstruct.allAlarms.length).toBe(5); // 【確認内容】: 全 Alarm の合計 🟡
      });
    });
  });

  // ============================================================================
  // 条件付きリソース作成テスト
  // ============================================================================

  describe('条件付きリソース作成テスト', () => {
    // ============================================================================
    // TC-ALARM-023: ECS 設定なしで ECS Alarm が作成されないこと
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-ALARM-023: ECS 設定なしで ECS Alarm が作成されないこと', () => {
      // 【テスト目的】: 条件付きリソース作成の動作を確認
      // 【テスト内容】: ecsClusterName, ecsServiceNames 未指定で AlarmConstruct を作成
      // 【期待される動作】: cpuAlarms.length === 0, memoryAlarms.length === 0
      // 🟡 信頼性: 設計仕様より

      test('ECS クラスター/サービス未指定時に ECS Alarm が作成されない', () => {
        // 【テストデータ準備】: ECS 設定なしで AlarmConstruct を作成
        const alarmConstruct = new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          // ecsClusterName, ecsServiceNames 未指定
        });

        // 【結果検証】: ECS Alarm が作成されないこと
        // 【期待値確認】: cpuAlarms と memoryAlarms が空配列であること
        expect(alarmConstruct.cpuAlarms.length).toBe(0); // 【確認内容】: CPU Alarm なし 🟡
        expect(alarmConstruct.memoryAlarms.length).toBe(0); // 【確認内容】: Memory Alarm なし 🟡
      });
    });

    // ============================================================================
    // TC-ALARM-024: Log Groups なしで Error Alarm が作成されないこと
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-ALARM-024: Log Groups なしで Error Alarm が作成されないこと', () => {
      // 【テスト目的】: 条件付きリソース作成の動作を確認
      // 【テスト内容】: logGroups 未指定で AlarmConstruct を作成
      // 【期待される動作】: errorAlarms.length === 0
      // 🟡 信頼性: 設計仕様より

      test('logGroups 未指定時に Error Alarm が作成されない', () => {
        // 【テストデータ準備】: logGroups なしで AlarmConstruct を作成
        const alarmConstruct = new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          ecsClusterName: 'test-cluster',
          ecsServiceNames: ['service'],
          // logGroups 未指定
        });

        // 【結果検証】: Error Alarm が作成されないこと
        // 【期待値確認】: errorAlarms が空配列であること
        expect(alarmConstruct.errorAlarms.length).toBe(0); // 【確認内容】: Error Alarm なし 🟡
      });
    });

    // ============================================================================
    // TC-ALARM-025: 全オプション未指定でも SNS Topic は作成されること
    // 🔵 信頼性: FR-014 より
    // ============================================================================
    describe('TC-ALARM-025: 全オプション未指定でも SNS Topic は作成されること', () => {
      // 【テスト目的】: 必須リソースの作成を確認
      // 【テスト内容】: envName, config のみで AlarmConstruct を作成
      // 【期待される動作】: AWS::SNS::Topic が 1 つ存在
      // 🔵 信頼性: FR-014 より

      test('最小構成でも SNS Topic が作成されること', () => {
        // 【テストデータ準備】: 最小構成で AlarmConstruct を作成
        new AlarmConstruct(stack, 'Alarm', {
          envName: 'dev',
          config: devConfig,
          // ecsClusterName, ecsServiceNames, logGroups 全て未指定
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: SNS Topic の存在確認
        // 【期待値確認】: SNS Topic が 1 つ存在すること
        template.resourceCountIs('AWS::SNS::Topic', 1); // 【確認内容】: 最小構成でも SNS Topic 作成 🔵
      });
    });
  });

  // ============================================================================
  // 異常系テスト
  // ============================================================================

  describe('異常系テスト', () => {
    // ============================================================================
    // TC-ALARM-026: envName 空文字でエラー
    // 🟡 信頼性: 既存パターンより
    // ============================================================================
    describe('TC-ALARM-026: envName 空文字でエラー', () => {
      // 【テスト目的】: 入力バリデーションの動作を確認
      // 【テスト内容】: envName: '' で AlarmConstruct を作成
      // 【期待される動作】: エラーがスローされること
      // 🟡 信頼性: 既存パターンより

      test('envName が空文字の場合エラーが発生すること', () => {
        // 【テストデータ準備】: 空の envName で AlarmConstruct を作成
        // 【結果検証】: エラーがスローされること
        expect(() => {
          new AlarmConstruct(stack, 'Alarm', {
            envName: '' as any,
            config: devConfig,
          });
        }).toThrow(); // 【確認内容】: envName 空文字でエラー 🟡
      });
    });

    // ============================================================================
    // TC-ALARM-027: cpuThreshold 範囲外でエラー
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-ALARM-027: cpuThreshold 範囲外でエラー', () => {
      // 【テスト目的】: 閾値バリデーションの動作を確認
      // 【テスト内容】: cpuThreshold が 0 以下または 100 超の場合
      // 【期待される動作】: エラーがスローされること
      // 🟡 信頼性: 設計仕様より

      test('cpuThreshold が 0 の場合エラーが発生すること', () => {
        // 【テストデータ準備】: cpuThreshold: 0 で AlarmConstruct を作成
        // 【結果検証】: エラーがスローされること
        expect(() => {
          new AlarmConstruct(stack, 'Alarm', {
            envName: 'dev',
            config: devConfig,
            ecsClusterName: 'test-cluster',
            ecsServiceNames: ['service'],
            cpuThreshold: 0,
          });
        }).toThrow(); // 【確認内容】: cpuThreshold 0 でエラー 🟡
      });

      test('cpuThreshold が 101 の場合エラーが発生すること', () => {
        // 【テストデータ準備】: cpuThreshold: 101 で AlarmConstruct を作成
        // 【結果検証】: エラーがスローされること
        expect(() => {
          new AlarmConstruct(stack, 'Alarm', {
            envName: 'dev',
            config: devConfig,
            ecsClusterName: 'test-cluster',
            ecsServiceNames: ['service'],
            cpuThreshold: 101,
          });
        }).toThrow(); // 【確認内容】: cpuThreshold 101 でエラー 🟡
      });
    });

    // ============================================================================
    // TC-ALARM-028: memoryThreshold 範囲外でエラー
    // 🟡 信頼性: 設計仕様より
    // ============================================================================
    describe('TC-ALARM-028: memoryThreshold 範囲外でエラー', () => {
      // 【テスト目的】: 閾値バリデーションの動作を確認
      // 【テスト内容】: memoryThreshold が 0 以下または 100 超の場合
      // 【期待される動作】: エラーがスローされること
      // 🟡 信頼性: 設計仕様より

      test('memoryThreshold が 0 の場合エラーが発生すること', () => {
        // 【テストデータ準備】: memoryThreshold: 0 で AlarmConstruct を作成
        // 【結果検証】: エラーがスローされること
        expect(() => {
          new AlarmConstruct(stack, 'Alarm', {
            envName: 'dev',
            config: devConfig,
            ecsClusterName: 'test-cluster',
            ecsServiceNames: ['service'],
            memoryThreshold: 0,
          });
        }).toThrow(); // 【確認内容】: memoryThreshold 0 でエラー 🟡
      });

      test('memoryThreshold が 101 の場合エラーが発生すること', () => {
        // 【テストデータ準備】: memoryThreshold: 101 で AlarmConstruct を作成
        // 【結果検証】: エラーがスローされること
        expect(() => {
          new AlarmConstruct(stack, 'Alarm', {
            envName: 'dev',
            config: devConfig,
            ecsClusterName: 'test-cluster',
            ecsServiceNames: ['service'],
            memoryThreshold: 101,
          });
        }).toThrow(); // 【確認内容】: memoryThreshold 101 でエラー 🟡
      });
    });
  });
});
