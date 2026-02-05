/**
 * Ops Stack テスト
 *
 * TASK-0024: Ops Stack 統合 + 最終統合テスト
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * 【テスト概要】: OpsStack の動作を検証するテストスイート
 * 【テスト対象】: ops-stack.ts（未実装）
 * 【テストケース数】: 22 テストケース
 *
 * テストケース:
 * - TC-OS-01〜02: スナップショットテスト
 * - TC-OS-03〜08: Construct 統合テスト
 * - TC-OS-09〜11: 異常系・バリデーションテスト
 * - TC-OS-12〜16: 境界値・オプション設定テスト
 * - TC-OS-17〜18: 環境別設定テスト
 * - TC-OS-19〜20: 統合テスト
 * - TC-OS-21〜22: セキュリティテスト
 *
 * 🔵 信頼性: 要件定義書 REQ-035〜042, REQ-101〜103, NFR-101〜102 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { OpsStack } from '../lib/stack/ops-stack';
import { devConfig, prodConfig, EnvironmentConfig } from '../parameter';

// ============================================================================
// 【テスト用定数】
// ============================================================================

/**
 * 【テスト用 AWS アカウント ID】
 * 🔵 信頼性: テスト用の仮想アカウント
 */
const TEST_ACCOUNT_ID = '123456789012';

/**
 * 【テスト用リージョン】
 * 🔵 信頼性: REQ-403 より（ap-northeast-1）
 */
const TEST_REGION = 'ap-northeast-1';

// ============================================================================
// 【テストヘルパー関数】
// ============================================================================

/**
 * 【VPC 作成ヘルパー】: テスト用の VPC を作成
 *
 * 【設計方針】: Ops Stack が参照する VPC を作成
 * 【サブネット構成】: Public、Private App、Private DB（Isolated）の 3 層構造
 *
 * 🔵 信頼性: architecture.md VPC 設計より
 *
 * @param stack テスト用スタック
 * @returns 作成された VPC
 */
function createTestVpc(stack: cdk.Stack): ec2.IVpc {
  return new ec2.Vpc(stack, 'TestVpc', {
    maxAzs: 2,
    subnetConfiguration: [
      {
        name: 'Public',
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 24,
      },
      {
        name: 'PrivateApp',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        cidrMask: 23,
      },
      {
        name: 'PrivateDb',
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        cidrMask: 24,
      },
    ],
  });
}

/**
 * 【ECS Cluster 作成ヘルパー】: テスト用の ECS Cluster を作成
 *
 * 【設計方針】: Application Stack が作成する ECS Cluster をシミュレート
 *
 * 🔵 信頼性: application-stack.ts より
 *
 * @param stack テスト用スタック
 * @param vpc テスト用 VPC
 * @returns 作成された ECS Cluster
 */
function createTestEcsCluster(stack: cdk.Stack, vpc: ec2.IVpc): ecs.ICluster {
  return new ecs.Cluster(stack, 'TestEcsCluster', {
    vpc,
    clusterName: 'test-cluster',
    containerInsights: true,
  });
}

/**
 * 【ECS Service 作成ヘルパー】: テスト用の ECS Service を作成
 *
 * 【設計方針】: Application Stack が作成する ECS Service をシミュレート
 *
 * 🔵 信頼性: application-stack.ts より
 *
 * @param stack テスト用スタック
 * @param cluster テスト用 ECS Cluster
 * @param serviceName サービス名
 * @returns 作成された ECS Service
 */
function createTestEcsService(
  stack: cdk.Stack,
  cluster: ecs.ICluster,
  serviceName: string
): ecs.FargateService {
  // 【タスク定義作成】: シンプルなタスク定義
  const taskDefinition = new ecs.FargateTaskDefinition(stack, `${serviceName}TaskDef`, {
    memoryLimitMiB: 512,
    cpu: 256,
  });

  // 【コンテナ追加】: テスト用のダミーコンテナ
  taskDefinition.addContainer(`${serviceName}Container`, {
    image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
    memoryLimitMiB: 256,
  });

  // 【サービス作成】
  return new ecs.FargateService(stack, `${serviceName}Service`, {
    cluster,
    taskDefinition,
    serviceName: `test-${serviceName.toLowerCase()}-service`,
    desiredCount: 1,
  });
}

/**
 * 【テスト用 Config 作成ヘルパー】: カスタマイズされた config を作成
 *
 * @param overrides 上書きするプロパティ
 * @returns カスタマイズされた EnvironmentConfig
 */
function createTestConfig(overrides: Partial<EnvironmentConfig> = {}): EnvironmentConfig {
  return {
    ...devConfig,
    ...overrides,
  };
}

describe('OpsStack', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と OpsStack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let prereqStack: cdk.Stack;
  let testVpc: ec2.IVpc;
  let testCluster: ecs.ICluster;
  let testFrontendService: ecs.FargateService;
  let testBackendService: ecs.FargateService;
  let stack: OpsStack;
  let template: Template;

  /**
   * 【テスト環境設定】: 各テストで使用する共通環境
   */
  const testEnv = {
    account: TEST_ACCOUNT_ID,
    region: TEST_REGION,
  };

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と 前提リソースを作成
    // 【初期条件設定】: devConfig を使用して OpsStack を生成
    // 【前提条件確認】: Application Stack の模擬リソースが正常に作成されていること
    app = new cdk.App();

    // 【前提 Stack 作成】: Application Stack の模擬
    prereqStack = new cdk.Stack(app, 'TestPrereqStack', { env: testEnv });
    testVpc = createTestVpc(prereqStack);
    testCluster = createTestEcsCluster(prereqStack, testVpc);
    testFrontendService = createTestEcsService(prereqStack, testCluster, 'Frontend');
    testBackendService = createTestEcsService(prereqStack, testCluster, 'Backend');

    // 【実際の処理実行】: OpsStack を作成
    // 【処理内容】: OpsStack が作成するリソースを CloudFormation テンプレート形式で取得
    stack = new OpsStack(app, 'TestOpsStack', {
      config: devConfig,
      ecsCluster: testCluster,
      ecsServices: {
        frontend: testFrontendService,
        backend: testBackendService,
      },
      vpc: testVpc,
      env: testEnv,
    });
    template = Template.fromStack(stack);
  });

  // ============================================================================
  // TC-OS-01: スナップショットテスト（devConfig）
  // 🔵 信頼性: CDK ベストプラクティス、既存 Stack テストパターンより
  // ============================================================================
  describe('TC-OS-01: スナップショットテスト（devConfig）', () => {
    // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: OpsStack の CloudFormation テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する

    test('CloudFormation テンプレートのスナップショットテスト（Dev環境）', () => {
      // 【テストデータ準備】: devConfig を使用して OpsStack を作成
      const snapshotApp = new cdk.App();
      const snapshotEnv = { account: TEST_ACCOUNT_ID, region: TEST_REGION };

      // 【前提 Stack 作成】: 模擬リソース
      const snapshotPrereqStack = new cdk.Stack(snapshotApp, 'SnapshotPrereqStack', {
        env: snapshotEnv,
      });
      const snapshotVpc = createTestVpc(snapshotPrereqStack);
      const snapshotCluster = createTestEcsCluster(snapshotPrereqStack, snapshotVpc);
      const snapshotFrontend = createTestEcsService(snapshotPrereqStack, snapshotCluster, 'Frontend');
      const snapshotBackend = createTestEcsService(snapshotPrereqStack, snapshotCluster, 'Backend');

      // 【実際の処理実行】: OpsStack を作成
      const snapshotStack = new OpsStack(snapshotApp, 'SnapshotOpsStack', {
        config: devConfig,
        ecsCluster: snapshotCluster,
        ecsServices: {
          frontend: snapshotFrontend,
          backend: snapshotBackend,
        },
        vpc: snapshotVpc,
        env: snapshotEnv,
      });
      const snapshotTemplate = Template.fromStack(snapshotStack);

      // 【結果検証】: スナップショットと完全一致することを確認
      // 【確認内容】: テンプレート一致 🔵
      expect(snapshotTemplate.toJSON()).toMatchSnapshot();
    });
  });

  // ============================================================================
  // TC-OS-02: スナップショットテスト（prodConfig）
  // 🔵 信頼性: CDK ベストプラクティスより
  // ============================================================================
  describe('TC-OS-02: スナップショットテスト（prodConfig）', () => {
    // 【テスト目的】: Prod 環境テンプレートの一貫性を保証する
    // 【テスト内容】: OpsStack の Prod 環境 CloudFormation テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する

    test('CloudFormation テンプレートのスナップショットテスト（Prod環境）', () => {
      // 【テストデータ準備】: prodConfig を使用して OpsStack を作成
      const prodApp = new cdk.App();
      const prodEnv = { account: TEST_ACCOUNT_ID, region: TEST_REGION };

      // 【前提 Stack 作成】: 模擬リソース
      const prodPrereqStack = new cdk.Stack(prodApp, 'ProdPrereqStack', { env: prodEnv });
      const prodVpc = createTestVpc(prodPrereqStack);
      const prodCluster = createTestEcsCluster(prodPrereqStack, prodVpc);
      const prodFrontend = createTestEcsService(prodPrereqStack, prodCluster, 'Frontend');
      const prodBackend = createTestEcsService(prodPrereqStack, prodCluster, 'Backend');

      // 【Prod 環境用 Slack 設定】: 有効な Slack 設定を持つ config
      const prodConfigWithSlack = {
        ...prodConfig,
        slackWorkspaceId: 'T12345678',
        slackChannelId: 'C12345678',
      };

      // 【実際の処理実行】: Prod 設定で OpsStack を作成
      const prodStack = new OpsStack(prodApp, 'ProdOpsStack', {
        config: prodConfigWithSlack,
        ecsCluster: prodCluster,
        ecsServices: {
          frontend: prodFrontend,
          backend: prodBackend,
        },
        vpc: prodVpc,
        enableLogExport: true,
        enableChatbot: true,
        env: prodEnv,
      });
      const prodTemplate = Template.fromStack(prodStack);

      // 【結果検証】: スナップショットと完全一致することを確認
      // 【確認内容】: Prod 環境テンプレート一致 🔵
      expect(prodTemplate.toJSON()).toMatchSnapshot();
    });
  });

  // ============================================================================
  // TC-OS-03: LogGroupConstruct 統合テスト
  // 🔵 信頼性: 要件定義書 REQ-035, REQ-036, REQ-037 より
  // ============================================================================
  describe('TC-OS-03: LogGroupConstruct 統合テスト', () => {
    // 【テスト目的】: CloudWatch Log Groups が正しく作成されることを確認
    // 【テスト内容】: LogGroupConstruct の統合と設定値の検証
    // 【期待される動作】: 4 つの Log Group が適切な設定で作成される

    test('CloudWatch Log Groups が正しく作成されること', () => {
      // 【リソース数確認】: Log Group が 4 つ存在することを確認
      // 【確認内容】: ECS Frontend, Backend, RDS, VPC Flow Logs 用 🔵
      template.resourceCountIs('AWS::Logs::LogGroup', 4);
    });

    test('Dev 環境で 3 日間のログ保持が設定されること', () => {
      // 【プロパティ確認】: RetentionInDays が 3 であることを確認
      // 【確認内容】: Dev 環境のログ保持期間 🔵
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 3,
      });
    });
  });

  // ============================================================================
  // TC-OS-04: AlarmConstruct 統合テスト
  // 🔵 信頼性: 要件定義書 REQ-039 より
  // ============================================================================
  describe('TC-OS-04: AlarmConstruct 統合テスト', () => {
    // 【テスト目的】: CloudWatch Alarms と SNS Topic が正しく作成されることを確認
    // 【テスト内容】: AlarmConstruct の統合と設定値の検証
    // 【期待される動作】: Alarm と暗号化された SNS Topic が作成される

    test('CloudWatch Alarms が作成されること', () => {
      // 【リソース存在確認】: Alarm リソースが存在することを確認
      // 【確認内容】: ECS CPU/Memory Alarm, Error Pattern Alarm 🔵
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      expect(Object.keys(alarms).length).toBeGreaterThan(0);
    });

    test('SNS Topic が作成されること', () => {
      // 【リソース存在確認】: SNS Topic が存在することを確認
      // 【確認内容】: アラーム通知用 SNS Topic 🔵
      template.resourceCountIs('AWS::SNS::Topic', 1);
    });

    test('SNS Topic が KMS 暗号化されて作成されること', () => {
      // 【セキュリティ確認】: SNS Topic の KMS 暗号化を確認
      // 【確認内容】: NFR-101 データ暗号化要件 🔵
      template.hasResourceProperties('AWS::SNS::Topic', {
        KmsMasterKeyId: Match.anyValue(),
      });
    });
  });

  // ============================================================================
  // TC-OS-05: ChatbotConstruct 統合テスト（有効時）
  // 🔵 信頼性: 要件定義書 REQ-039, REQ-103 より
  // ============================================================================
  describe('TC-OS-05: ChatbotConstruct 統合テスト（有効時）', () => {
    // 【テスト目的】: AWS Chatbot が正しく作成されることを確認
    // 【テスト内容】: ChatbotConstruct の統合と Slack 連携の検証
    // 【期待される動作】: Chatbot が作成され SNS Topic をサブスクライブする

    test('Slack Channel Configuration が作成されること（有効な Slack 設定時）', () => {
      // 【テストデータ準備】: 有効な Slack 設定を持つ config
      const chatbotApp = new cdk.App();
      const chatbotPrereqStack = new cdk.Stack(chatbotApp, 'ChatbotPrereqStack', { env: testEnv });
      const chatbotVpc = createTestVpc(chatbotPrereqStack);
      const chatbotCluster = createTestEcsCluster(chatbotPrereqStack, chatbotVpc);
      const chatbotFrontend = createTestEcsService(chatbotPrereqStack, chatbotCluster, 'Frontend');
      const chatbotBackend = createTestEcsService(chatbotPrereqStack, chatbotCluster, 'Backend');

      const configWithSlack = createTestConfig({
        slackWorkspaceId: 'T12345678',
        slackChannelId: 'C12345678',
      });

      // 【実際の処理実行】: Chatbot 有効で OpsStack を作成
      const chatbotStack = new OpsStack(chatbotApp, 'ChatbotOpsStack', {
        config: configWithSlack,
        ecsCluster: chatbotCluster,
        ecsServices: {
          frontend: chatbotFrontend,
          backend: chatbotBackend,
        },
        vpc: chatbotVpc,
        enableChatbot: true,
        env: testEnv,
      });
      const chatbotTemplate = Template.fromStack(chatbotStack);

      // 【リソース存在確認】: Chatbot リソースが存在することを確認
      // 【確認内容】: AWS Chatbot Slack Channel Configuration 🔵
      chatbotTemplate.resourceCountIs('AWS::Chatbot::SlackChannelConfiguration', 1);
    });
  });

  // ============================================================================
  // TC-OS-06: CI/CD Pipeline 統合テスト
  // 🔵 信頼性: 要件定義書 REQ-040, REQ-041 より
  // ============================================================================
  describe('TC-OS-06: CI/CD Pipeline 統合テスト', () => {
    // 【テスト目的】: CI/CD Pipeline が正しく作成されることを確認
    // 【テスト内容】: CodeCommit, CodeBuild, CodePipeline の統合検証
    // 【期待される動作】: 完全な CI/CD パイプラインが作成される

    test('CodeCommit Repository が作成されること', () => {
      // 【リソース存在確認】: CodeCommit Repository が存在することを確認
      // 【確認内容】: ソースコード管理用リポジトリ 🔵
      template.resourceCountIs('AWS::CodeCommit::Repository', 1);
    });

    test('CodeBuild Project が作成されること', () => {
      // 【リソース存在確認】: CodeBuild Project が存在することを確認
      // 【確認内容】: Docker ビルド + テスト用プロジェクト 🔵
      template.resourceCountIs('AWS::CodeBuild::Project', 1);
    });

    test('CodePipeline が作成されること', () => {
      // 【リソース存在確認】: CodePipeline が存在することを確認
      // 【確認内容】: Source → Build → Deploy パイプライン 🔵
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
    });
  });

  // ============================================================================
  // TC-OS-07: Stack 公開プロパティテスト
  // 🔵 信頼性: 要件定義書・既存 Stack パターンより
  // ============================================================================
  describe('TC-OS-07: Stack 公開プロパティテスト', () => {
    // 【テスト目的】: Stack の公開プロパティが正しく設定されることを確認
    // 【テスト内容】: 各公開プロパティの存在と値を検証
    // 【期待される動作】: すべての公開プロパティがアクセス可能

    test('logGroups プロパティが定義されていること', () => {
      // 【プロパティ確認】: logGroups プロパティが存在することを確認
      // 【確認内容】: LogGroupConstruct への参照 🔵
      expect(stack.logGroups).toBeDefined();
    });

    test('alarms プロパティが定義されていること', () => {
      // 【プロパティ確認】: alarms プロパティが存在することを確認
      // 【確認内容】: AlarmConstruct への参照 🔵
      expect(stack.alarms).toBeDefined();
    });

    test('alarmTopic プロパティが定義されていること', () => {
      // 【プロパティ確認】: alarmTopic プロパティが存在することを確認
      // 【確認内容】: SNS Topic への参照 🔵
      expect(stack.alarmTopic).toBeDefined();
    });
  });

  // ============================================================================
  // TC-OS-08: CfnOutput 出力テスト
  // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より
  // ============================================================================
  describe('TC-OS-08: CfnOutput 出力テスト', () => {
    // 【テスト目的】: CfnOutput が正しくエクスポートされることを確認
    // 【テスト内容】: Stack 出力値の存在と形式を検証
    // 【期待される動作】: 必要な出力値がすべてエクスポートされる

    test('AlarmTopicArn がエクスポートされること', () => {
      // 【出力確認】: AlarmTopicArn 出力が存在することを確認
      // 【確認内容】: SNS Topic ARN のエクスポート 🔵
      template.hasOutput('AlarmTopicArn', {
        Value: Match.anyValue(),
        Export: {
          Name: Match.stringLikeRegexp('.*-AlarmTopicArn'),
        },
      });
    });
  });

  // ============================================================================
  // TC-OS-09: envName が空の場合のバリデーションエラー
  // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より
  // ============================================================================
  describe('TC-OS-09: envName が空の場合のバリデーションエラー', () => {
    // 【テスト目的】: envName が空の場合にエラーが発生することを確認
    // 【テスト内容】: 空の envName でスタック作成を試行
    // 【期待される動作】: バリデーションエラーがスローされる

    test('envName が空文字の場合にエラーが発生すること', () => {
      // 【テストデータ準備】: 空の envName を持つ config
      const invalidConfig = createTestConfig({ envName: '' });

      // 【実際の処理実行】: 無効な config で OpsStack 作成を試行
      // 【結果検証】: エラーがスローされることを確認
      // 【確認内容】: envName 空文字バリデーション 🔵
      expect(() => {
        new OpsStack(app, 'InvalidStack', {
          config: invalidConfig,
          ecsCluster: testCluster,
          ecsServices: {
            frontend: testFrontendService,
            backend: testBackendService,
          },
          vpc: testVpc,
          env: testEnv,
        });
      }).toThrow();
    });
  });

  // ============================================================================
  // TC-OS-10: envName が長すぎる場合のバリデーションエラー
  // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より
  // ============================================================================
  describe('TC-OS-10: envName が長すぎる場合のバリデーションエラー', () => {
    // 【テスト目的】: envName が最大長を超える場合にエラーが発生することを確認
    // 【テスト内容】: 21 文字の envName でスタック作成を試行
    // 【期待される動作】: バリデーションエラーがスローされる

    test('envName が 20 文字を超える場合にエラーが発生すること', () => {
      // 【テストデータ準備】: 21 文字の envName を持つ config
      const invalidConfig = createTestConfig({ envName: 'a'.repeat(21) });

      // 【実際の処理実行】: 無効な config で OpsStack 作成を試行
      // 【結果検証】: エラーがスローされることを確認
      // 【確認内容】: envName 長さバリデーション 🔵
      expect(() => {
        new OpsStack(app, 'InvalidLengthStack', {
          config: invalidConfig,
          ecsCluster: testCluster,
          ecsServices: {
            frontend: testFrontendService,
            backend: testBackendService,
          },
          vpc: testVpc,
          env: testEnv,
        });
      }).toThrow();
    });
  });

  // ============================================================================
  // TC-OS-11: envName が不正な形式の場合のバリデーションエラー
  // 🔵 信頼性: 既存 Stack パターン（DistributionStack）より
  // ============================================================================
  describe('TC-OS-11: envName が不正な形式の場合のバリデーションエラー', () => {
    // 【テスト目的】: envName に不正な文字が含まれる場合にエラーが発生することを確認
    // 【テスト内容】: 不正な形式の envName でスタック作成を試行
    // 【期待される動作】: バリデーションエラーがスローされる

    test('envName にスペースが含まれる場合にエラーが発生すること', () => {
      // 【テストデータ準備】: スペースを含む envName を持つ config
      const invalidConfig = createTestConfig({ envName: 'dev env' });

      // 【実際の処理実行】: 無効な config で OpsStack 作成を試行
      // 【結果検証】: エラーがスローされることを確認
      // 【確認内容】: envName 形式バリデーション 🔵
      expect(() => {
        new OpsStack(app, 'InvalidFormatStack', {
          config: invalidConfig,
          ecsCluster: testCluster,
          ecsServices: {
            frontend: testFrontendService,
            backend: testBackendService,
          },
          vpc: testVpc,
          env: testEnv,
        });
      }).toThrow();
    });
  });

  // ============================================================================
  // TC-OS-12: Chatbot 無効時のテスト
  // 🔵 信頼性: 要件定義書・ChatbotConstruct 実装より
  // ============================================================================
  describe('TC-OS-12: Chatbot 無効時のテスト', () => {
    // 【テスト目的】: Chatbot 無効時にリソースが作成されないことを確認
    // 【テスト内容】: enableChatbot: false でスタック作成
    // 【期待される動作】: Chatbot 関連リソースが 0 個

    test('enableChatbot: false の場合に Chatbot が作成されないこと', () => {
      // 【テストデータ準備】: Chatbot 無効設定
      const noChatbotApp = new cdk.App();
      const noChatbotPrereqStack = new cdk.Stack(noChatbotApp, 'NoChatbotPrereqStack', {
        env: testEnv,
      });
      const noChatbotVpc = createTestVpc(noChatbotPrereqStack);
      const noChatbotCluster = createTestEcsCluster(noChatbotPrereqStack, noChatbotVpc);
      const noChatbotFrontend = createTestEcsService(noChatbotPrereqStack, noChatbotCluster, 'Frontend');
      const noChatbotBackend = createTestEcsService(noChatbotPrereqStack, noChatbotCluster, 'Backend');

      // 【実際の処理実行】: Chatbot 無効で OpsStack を作成
      const noChatbotStack = new OpsStack(noChatbotApp, 'NoChatbotStack', {
        config: devConfig,
        ecsCluster: noChatbotCluster,
        ecsServices: {
          frontend: noChatbotFrontend,
          backend: noChatbotBackend,
        },
        vpc: noChatbotVpc,
        enableChatbot: false,
        env: testEnv,
      });
      const noChatbotTemplate = Template.fromStack(noChatbotStack);

      // 【リソース不存在確認】: Chatbot が作成されていないことを確認
      // 【確認内容】: オプション機能の無効化 🔵
      noChatbotTemplate.resourceCountIs('AWS::Chatbot::SlackChannelConfiguration', 0);
    });
  });

  // ============================================================================
  // TC-OS-13: Slack 設定なしで Chatbot 有効時のテスト
  // 🔵 信頼性: ChatbotConstruct 実装より
  // ============================================================================
  describe('TC-OS-13: Slack 設定なしで Chatbot 有効時のテスト', () => {
    // 【テスト目的】: Slack 設定がない場合に Chatbot がスキップされることを確認
    // 【テスト内容】: enableChatbot: true + 空の Slack 設定でスタック作成
    // 【期待される動作】: Chatbot が作成されない（エラーではなくスキップ）

    test('Slack 設定がない場合に Chatbot がスキップされること', () => {
      // 【テストデータ準備】: 空の Slack 設定を持つ config
      const configWithoutSlack = createTestConfig({
        slackWorkspaceId: '',
        slackChannelId: '',
      });

      // 【実際の処理実行】: Chatbot 有効 + Slack 設定なしで OpsStack 作成を試行
      // 【結果検証】: エラーが発生しないことを確認
      // 【確認内容】: グレースフルデグラデーション 🔵
      expect(() => {
        const noSlackApp = new cdk.App();
        const noSlackPrereqStack = new cdk.Stack(noSlackApp, 'NoSlackPrereqStack', { env: testEnv });
        const noSlackVpc = createTestVpc(noSlackPrereqStack);
        const noSlackCluster = createTestEcsCluster(noSlackPrereqStack, noSlackVpc);
        const noSlackFrontend = createTestEcsService(noSlackPrereqStack, noSlackCluster, 'Frontend');
        const noSlackBackend = createTestEcsService(noSlackPrereqStack, noSlackCluster, 'Backend');

        new OpsStack(noSlackApp, 'NoSlackStack', {
          config: configWithoutSlack,
          ecsCluster: noSlackCluster,
          ecsServices: {
            frontend: noSlackFrontend,
            backend: noSlackBackend,
          },
          vpc: noSlackVpc,
          enableChatbot: true,
          env: testEnv,
        });
      }).not.toThrow();
    });
  });

  // ============================================================================
  // TC-OS-14: CI/CD 無効時のテスト
  // 🔵 信頼性: 要件定義書より
  // ============================================================================
  describe('TC-OS-14: CI/CD 無効時のテスト', () => {
    // 【テスト目的】: CI/CD 無効時にリソースが作成されないことを確認
    // 【テスト内容】: enableCicd: false でスタック作成
    // 【期待される動作】: CI/CD 関連リソースが 0 個

    test('enableCicd: false の場合に CI/CD リソースが作成されないこと', () => {
      // 【テストデータ準備】: CI/CD 無効設定
      const noCicdApp = new cdk.App();
      const noCicdPrereqStack = new cdk.Stack(noCicdApp, 'NoCicdPrereqStack', { env: testEnv });
      const noCicdVpc = createTestVpc(noCicdPrereqStack);
      const noCicdCluster = createTestEcsCluster(noCicdPrereqStack, noCicdVpc);
      const noCicdFrontend = createTestEcsService(noCicdPrereqStack, noCicdCluster, 'Frontend');
      const noCicdBackend = createTestEcsService(noCicdPrereqStack, noCicdCluster, 'Backend');

      // 【実際の処理実行】: CI/CD 無効で OpsStack を作成
      const noCicdStack = new OpsStack(noCicdApp, 'NoCicdStack', {
        config: devConfig,
        ecsCluster: noCicdCluster,
        ecsServices: {
          frontend: noCicdFrontend,
          backend: noCicdBackend,
        },
        vpc: noCicdVpc,
        enableCicd: false,
        env: testEnv,
      });
      const noCicdTemplate = Template.fromStack(noCicdStack);

      // 【リソース不存在確認】: CI/CD リソースが作成されていないことを確認
      // 【確認内容】: オプション機能の無効化 🔵
      noCicdTemplate.resourceCountIs('AWS::CodeCommit::Repository', 0);
      noCicdTemplate.resourceCountIs('AWS::CodeBuild::Project', 0);
      noCicdTemplate.resourceCountIs('AWS::CodePipeline::Pipeline', 0);
    });
  });

  // ============================================================================
  // TC-OS-15: LogExport 有効時のテスト（Prod 環境）
  // 🔵 信頼性: 要件定義書 REQ-038, REQ-101 より
  // ============================================================================
  describe('TC-OS-15: LogExport 有効時のテスト（Prod 環境）', () => {
    // 【テスト目的】: LogExport 有効時に S3 エクスポートリソースが作成されることを確認
    // 【テスト内容】: enableLogExport: true + prodConfig でスタック作成
    // 【期待される動作】: Firehose と S3 バケットが作成される

    test('Kinesis Firehose Delivery Stream が作成されること', () => {
      // 【テストデータ準備】: LogExport 有効 + Prod 設定
      const logExportApp = new cdk.App();
      const logExportPrereqStack = new cdk.Stack(logExportApp, 'LogExportPrereqStack', {
        env: testEnv,
      });
      const logExportVpc = createTestVpc(logExportPrereqStack);
      const logExportCluster = createTestEcsCluster(logExportPrereqStack, logExportVpc);
      const logExportFrontend = createTestEcsService(logExportPrereqStack, logExportCluster, 'Frontend');
      const logExportBackend = createTestEcsService(logExportPrereqStack, logExportCluster, 'Backend');

      // 【実際の処理実行】: LogExport 有効で OpsStack を作成
      const logExportStack = new OpsStack(logExportApp, 'LogExportOpsStack', {
        config: prodConfig,
        ecsCluster: logExportCluster,
        ecsServices: {
          frontend: logExportFrontend,
          backend: logExportBackend,
        },
        vpc: logExportVpc,
        enableLogExport: true,
        env: testEnv,
      });
      const logExportTemplate = Template.fromStack(logExportStack);

      // 【リソース存在確認】: Firehose が存在することを確認
      // 【確認内容】: Prod 環境のログ長期保存 🔵
      const firehoseResources = logExportTemplate.findResources('AWS::KinesisFirehose::DeliveryStream');
      expect(Object.keys(firehoseResources).length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TC-OS-16: LogExport 無効時のテスト（Dev 環境）
  // 🔵 信頼性: 要件定義書 REQ-102 より
  // ============================================================================
  describe('TC-OS-16: LogExport 無効時のテスト（Dev 環境）', () => {
    // 【テスト目的】: LogExport 無効時に S3 エクスポートリソースが作成されないことを確認
    // 【テスト内容】: enableLogExport: false + devConfig でスタック作成
    // 【期待される動作】: Firehose が作成されない

    test('Kinesis Firehose が作成されないこと', () => {
      // 【テストデータ準備】: LogExport 無効 + Dev 設定
      const noLogExportApp = new cdk.App();
      const noLogExportPrereqStack = new cdk.Stack(noLogExportApp, 'NoLogExportPrereqStack', {
        env: testEnv,
      });
      const noLogExportVpc = createTestVpc(noLogExportPrereqStack);
      const noLogExportCluster = createTestEcsCluster(noLogExportPrereqStack, noLogExportVpc);
      const noLogExportFrontend = createTestEcsService(
        noLogExportPrereqStack,
        noLogExportCluster,
        'Frontend'
      );
      const noLogExportBackend = createTestEcsService(
        noLogExportPrereqStack,
        noLogExportCluster,
        'Backend'
      );

      // 【実際の処理実行】: LogExport 無効で OpsStack を作成
      const noLogExportStack = new OpsStack(noLogExportApp, 'NoLogExportOpsStack', {
        config: devConfig,
        ecsCluster: noLogExportCluster,
        ecsServices: {
          frontend: noLogExportFrontend,
          backend: noLogExportBackend,
        },
        vpc: noLogExportVpc,
        enableLogExport: false,
        env: testEnv,
      });
      const noLogExportTemplate = Template.fromStack(noLogExportStack);

      // 【リソース不存在確認】: Firehose が作成されていないことを確認
      // 【確認内容】: Dev 環境のコスト最適化 🔵
      noLogExportTemplate.resourceCountIs('AWS::KinesisFirehose::DeliveryStream', 0);
    });
  });

  // ============================================================================
  // TC-OS-17: Dev 環境設定の適用確認
  // 🔵 信頼性: 要件定義書 REQ-036, REQ-042 より
  // ============================================================================
  describe('TC-OS-17: Dev 環境設定の適用確認', () => {
    // 【テスト目的】: Dev 環境設定が正しく適用されることを確認
    // 【テスト内容】: devConfig での OpsStack 作成と設定値検証
    // 【期待される動作】: Dev 固有の設定値が適用される

    test('Dev 環境で 3 日間のログ保持が設定されること', () => {
      // 【プロパティ確認】: RetentionInDays が 3 であることを確認
      // 【確認内容】: REQ-036 Dev 環境ログ保持期間 🔵
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 3,
      });
    });
  });

  // ============================================================================
  // TC-OS-18: Prod 環境設定の適用確認
  // 🔵 信頼性: 要件定義書 REQ-037, REQ-042 より
  // ============================================================================
  describe('TC-OS-18: Prod 環境設定の適用確認', () => {
    // 【テスト目的】: Prod 環境設定が正しく適用されることを確認
    // 【テスト内容】: prodConfig での OpsStack 作成と設定値検証
    // 【期待される動作】: Prod 固有の設定値が適用される

    test('Prod 環境で 30 日間のログ保持が設定されること', () => {
      // 【テストデータ準備】: prodConfig を使用
      const prodApp = new cdk.App();
      const prodPrereqStack = new cdk.Stack(prodApp, 'ProdEnvPrereqStack', { env: testEnv });
      const prodVpc = createTestVpc(prodPrereqStack);
      const prodCluster = createTestEcsCluster(prodPrereqStack, prodVpc);
      const prodFrontend = createTestEcsService(prodPrereqStack, prodCluster, 'Frontend');
      const prodBackend = createTestEcsService(prodPrereqStack, prodCluster, 'Backend');

      // 【実際の処理実行】: Prod 設定で OpsStack を作成
      const prodStack = new OpsStack(prodApp, 'ProdEnvOpsStack', {
        config: prodConfig,
        ecsCluster: prodCluster,
        ecsServices: {
          frontend: prodFrontend,
          backend: prodBackend,
        },
        vpc: prodVpc,
        enableLogExport: true,
        env: testEnv,
      });
      const prodTemplate = Template.fromStack(prodStack);

      // 【プロパティ確認】: RetentionInDays が 30 であることを確認
      // 【確認内容】: REQ-037 Prod 環境ログ保持期間 🔵
      prodTemplate.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 30,
      });
    });
  });

  // ============================================================================
  // TC-OS-21: CloudWatch Logs 暗号化テスト
  // 🔵 信頼性: 要件定義書 NFR-102 より
  // ============================================================================
  describe('TC-OS-21: CloudWatch Logs 暗号化テスト', () => {
    // 【テスト目的】: CloudWatch Logs が KMS 暗号化されていることを確認
    // 【テスト内容】: Log Group の KmsKeyId プロパティを検証
    // 【期待される動作】: すべての Log Group が暗号化される

    test('Log Group が KMS 暗号化されていること', () => {
      // 【セキュリティ確認】: Log Group の KMS 暗号化を確認
      // 【確認内容】: NFR-102 Storage Encryption 要件 🔵
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        KmsKeyId: Match.anyValue(),
      });
    });
  });

  // ============================================================================
  // TC-OS-22: SNS Topic 暗号化テスト
  // 🔵 信頼性: 要件定義書 NFR-101 より
  // ============================================================================
  describe('TC-OS-22: SNS Topic 暗号化テスト', () => {
    // 【テスト目的】: SNS Topic が KMS 暗号化されていることを確認
    // 【テスト内容】: SNS Topic の KmsMasterKeyId プロパティを検証
    // 【期待される動作】: SNS Topic が暗号化される

    test('SNS Topic が KMS 暗号化されていること', () => {
      // 【セキュリティ確認】: SNS Topic の KMS 暗号化を確認
      // 【確認内容】: NFR-101 データ暗号化要件 🔵
      template.hasResourceProperties('AWS::SNS::Topic', {
        KmsMasterKeyId: Match.anyValue(),
      });
    });
  });
});
