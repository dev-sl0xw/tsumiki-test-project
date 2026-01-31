/**
 * Application Stack テスト
 *
 * TASK-0017: Application Stack 統合
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * 【テスト概要】: ApplicationStack の動作を検証するテストスイート
 * 【テスト対象】: application-stack.ts
 * 【テストケース数】: 36 テストケース
 *
 * テストケース:
 * - TC-AS-01〜02: スナップショットテスト
 * - TC-AS-03〜08: リソース存在確認テスト
 * - TC-AS-09〜14: コンポーネント統合テスト
 * - TC-AS-15〜20: 公開プロパティ確認テスト
 * - TC-AS-21〜26: CfnOutput 確認テスト
 * - TC-AS-27〜30: 依存関係テスト
 * - TC-AS-31〜33: セキュリティテスト
 * - TC-AS-34〜36: 異常系・境界値テスト
 *
 * 🔵 信頼性: 要件定義書 REQ-012〜021, REQ-028〜030、タスク定義書に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ApplicationStack } from '../lib/stack/application-stack';
import { devConfig, prodConfig } from '../parameter';

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

/**
 * 【テスト用 ACM 証明書 ARN】
 * 🔵 信頼性: REQ-030 より
 */
const TEST_CERTIFICATE_ARN = `arn:aws:acm:${TEST_REGION}:${TEST_ACCOUNT_ID}:certificate/test-certificate-id`;

// ============================================================================
// 【テストヘルパー関数】
// ============================================================================

/**
 * 【VPC 作成ヘルパー】: テスト用の VPC を作成
 *
 * 【設計方針】: Application Stack が必要とするサブネット構成を提供
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
 * 【ECS Security Group 作成ヘルパー】: テスト用の ECS Security Group を作成
 *
 * 【設計方針】: ECS 用の Security Group をシミュレート
 *
 * 🔵 信頼性: security-stack.ts より
 *
 * @param stack テスト用スタック
 * @param vpc テスト用 VPC
 * @returns 作成された Security Group
 */
function createTestEcsSecurityGroup(stack: cdk.Stack, vpc: ec2.IVpc): ec2.ISecurityGroup {
  return new ec2.SecurityGroup(stack, 'TestEcsSg', {
    vpc,
    description: 'Test ECS Security Group',
    allowAllOutbound: true,
  });
}

/**
 * 【ALB Security Group 作成ヘルパー】: テスト用の ALB Security Group を作成
 *
 * 【設計方針】: ALB 用の Security Group をシミュレート
 *
 * 🔵 信頼性: security-stack.ts より
 *
 * @param stack テスト用スタック
 * @param vpc テスト用 VPC
 * @returns 作成された Security Group
 */
function createTestAlbSecurityGroup(stack: cdk.Stack, vpc: ec2.IVpc): ec2.ISecurityGroup {
  return new ec2.SecurityGroup(stack, 'TestAlbSg', {
    vpc,
    description: 'Test ALB Security Group',
    allowAllOutbound: true,
  });
}

/**
 * 【ECS Task Role 作成ヘルパー】: テスト用の ECS Task Role を作成
 *
 * 【設計方針】: ECS Task 用の IAM Role をシミュレート
 *
 * 🔵 信頼性: security-stack.ts より
 *
 * @param stack テスト用スタック
 * @returns 作成された IAM Role
 */
function createTestEcsTaskRole(stack: cdk.Stack): iam.IRole {
  return new iam.Role(stack, 'TestEcsTaskRole', {
    assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    description: 'Test ECS Task Role',
  });
}

/**
 * 【ECS Task Execution Role 作成ヘルパー】: テスト用の ECS Task Execution Role を作成
 *
 * 【設計方針】: ECS Task Execution 用の IAM Role をシミュレート
 *
 * 🔵 信頼性: security-stack.ts より
 *
 * @param stack テスト用スタック
 * @returns 作成された IAM Role
 */
function createTestEcsTaskExecutionRole(stack: cdk.Stack): iam.IRole {
  const role = new iam.Role(stack, 'TestEcsTaskExecutionRole', {
    assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    description: 'Test ECS Task Execution Role',
  });
  role.addManagedPolicy(
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
  );
  return role;
}

/**
 * 【ECR Repository 作成ヘルパー】: テスト用の ECR Repository を作成
 *
 * 【設計方針】: ECR Repository をシミュレート
 *
 * 🔵 信頼性: Task Definition 要件より
 *
 * @param stack テスト用スタック
 * @param id Repository ID
 * @returns 作成された ECR Repository
 */
function createTestEcrRepository(stack: cdk.Stack, id: string): ecr.IRepository {
  return new ecr.Repository(stack, id, {
    repositoryName: `test-${id.toLowerCase()}`,
  });
}

/**
 * 【Log Group 作成ヘルパー】: テスト用の Log Group を作成
 *
 * 【設計方針】: CloudWatch Logs をシミュレート
 *
 * 🔵 信頼性: Task Definition 要件より
 *
 * @param stack テスト用スタック
 * @returns 作成された Log Group
 */
function createTestLogGroup(stack: cdk.Stack): logs.ILogGroup {
  return new logs.LogGroup(stack, 'TestLogGroup', {
    logGroupName: '/test/ecs/application',
    retention: logs.RetentionDays.THREE_DAYS,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });
}

describe('ApplicationStack', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と ApplicationStack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let prereqStack: cdk.Stack;
  let vpc: ec2.IVpc;
  let ecsSecurityGroup: ec2.ISecurityGroup;
  let albSecurityGroup: ec2.ISecurityGroup;
  let ecsTaskRole: iam.IRole;
  let ecsTaskExecutionRole: iam.IRole;
  let appRepository: ecr.IRepository;
  let sidecarRepository: ecr.IRepository;
  let logGroup: logs.ILogGroup;
  let stack: ApplicationStack;
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
    // 【初期条件設定】: devConfig を使用して ApplicationStack を生成
    // 【前提条件確認】: VPC Stack、Security Stack、Database Stack の模擬リソースが正常に作成されていること
    app = new cdk.App();

    // 【前提 Stack 作成】: VPC Stack、Security Stack の模擬
    prereqStack = new cdk.Stack(app, 'TestPrereqStack', { env: testEnv });
    vpc = createTestVpc(prereqStack);
    ecsSecurityGroup = createTestEcsSecurityGroup(prereqStack, vpc);
    albSecurityGroup = createTestAlbSecurityGroup(prereqStack, vpc);
    ecsTaskRole = createTestEcsTaskRole(prereqStack);
    ecsTaskExecutionRole = createTestEcsTaskExecutionRole(prereqStack);
    appRepository = createTestEcrRepository(prereqStack, 'AppRepository');
    sidecarRepository = createTestEcrRepository(prereqStack, 'SidecarRepository');
    logGroup = createTestLogGroup(prereqStack);

    // 【実際の処理実行】: ApplicationStack を作成
    // 【処理内容】: ApplicationStack が作成するリソースを CloudFormation テンプレート形式で取得
    stack = new ApplicationStack(app, 'TestApplicationStack', {
      vpc,
      ecsSecurityGroup,
      albSecurityGroup,
      ecsTaskRole,
      ecsTaskExecutionRole,
      dbEndpoint: 'test-aurora-cluster.cluster-xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com',
      dbPort: 3306,
      appRepository,
      sidecarRepository,
      logGroup,
      certificateArn: TEST_CERTIFICATE_ARN,
      config: devConfig,
      env: testEnv,
    });
    template = Template.fromStack(stack);
  });

  // 【テスト後処理】: Jest が自動的にテスト間の分離を保証
  // afterEach は明示的なクリーンアップが不要なため省略

  // ============================================================================
  // TC-AS-01: スナップショットテスト（devConfig）
  // 🔵 信頼性: CDK ベストプラクティス、vpc-stack.test.ts パターンより
  // ============================================================================
  describe('TC-AS-01: スナップショットテスト（devConfig）', () => {
    // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: ApplicationStack の CloudFormation テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する
    // 🔵 信頼性: CDK ベストプラクティス、vpc-stack.test.ts パターンより

    test('CloudFormation テンプレートのスナップショットテスト（Dev環境）', () => {
      // 【テストデータ準備】: devConfig を使用して ApplicationStack を作成
      // 【初期条件設定】: 開発環境の標準設定でスタックを生成
      const snapshotApp = new cdk.App();
      const snapshotEnv = {
        account: TEST_ACCOUNT_ID,
        region: TEST_REGION,
      };

      // 【前提 Stack 作成】: 模擬リソース
      const snapshotPrereqStack = new cdk.Stack(snapshotApp, 'SnapshotPrereqStack', {
        env: snapshotEnv,
      });
      const snapshotVpc = createTestVpc(snapshotPrereqStack);
      const snapshotEcsSg = createTestEcsSecurityGroup(snapshotPrereqStack, snapshotVpc);
      const snapshotAlbSg = createTestAlbSecurityGroup(snapshotPrereqStack, snapshotVpc);
      const snapshotTaskRole = createTestEcsTaskRole(snapshotPrereqStack);
      const snapshotTaskExecRole = createTestEcsTaskExecutionRole(snapshotPrereqStack);
      const snapshotAppRepo = createTestEcrRepository(snapshotPrereqStack, 'SnapshotAppRepo');
      const snapshotSidecarRepo = createTestEcrRepository(
        snapshotPrereqStack,
        'SnapshotSidecarRepo'
      );
      const snapshotLogGroup = createTestLogGroup(snapshotPrereqStack);

      // 【実際の処理実行】: ApplicationStack を作成
      const snapshotStack = new ApplicationStack(snapshotApp, 'SnapshotApplicationStack', {
        vpc: snapshotVpc,
        ecsSecurityGroup: snapshotEcsSg,
        albSecurityGroup: snapshotAlbSg,
        ecsTaskRole: snapshotTaskRole,
        ecsTaskExecutionRole: snapshotTaskExecRole,
        dbEndpoint: 'test-aurora-cluster.cluster-xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com',
        dbPort: 3306,
        appRepository: snapshotAppRepo,
        sidecarRepository: snapshotSidecarRepo,
        logGroup: snapshotLogGroup,
        certificateArn: TEST_CERTIFICATE_ARN,
        config: devConfig,
        env: snapshotEnv,
      });
      const snapshotTemplate = Template.fromStack(snapshotStack);

      // 【結果検証】: スナップショットとの一致を確認
      // 【検証項目】: CloudFormation テンプレート全体
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(snapshotTemplate.toJSON()).toMatchSnapshot();
    });
  });

  // ============================================================================
  // TC-AS-02: スナップショットテスト（prodConfig）
  // 🔵 信頼性: database-stack.test.ts パターンより
  // ============================================================================
  describe('TC-AS-02: スナップショットテスト（prodConfig）', () => {
    // 【テスト目的】: 本番環境設定での CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: prodConfig での ApplicationStack テンプレートをスナップショットと比較
    // 【期待される動作】: 本番用テンプレートがスナップショットと一致する
    // 🔵 信頼性: database-stack.test.ts パターンより

    test('CloudFormation テンプレートのスナップショットテスト（Prod環境）', () => {
      // 【テストデータ準備】: prodConfig を使用
      const prodApp = new cdk.App();
      const prodEnv = {
        account: TEST_ACCOUNT_ID,
        region: TEST_REGION,
      };

      const prodPrereqStack = new cdk.Stack(prodApp, 'ProdPrereqStack', { env: prodEnv });
      const prodVpc = createTestVpc(prodPrereqStack);
      const prodEcsSg = createTestEcsSecurityGroup(prodPrereqStack, prodVpc);
      const prodAlbSg = createTestAlbSecurityGroup(prodPrereqStack, prodVpc);
      const prodTaskRole = createTestEcsTaskRole(prodPrereqStack);
      const prodTaskExecRole = createTestEcsTaskExecutionRole(prodPrereqStack);
      const prodAppRepo = createTestEcrRepository(prodPrereqStack, 'ProdAppRepo');
      const prodSidecarRepo = createTestEcrRepository(prodPrereqStack, 'ProdSidecarRepo');
      const prodLogGroup = createTestLogGroup(prodPrereqStack);

      const prodStack = new ApplicationStack(prodApp, 'ProdApplicationStack', {
        vpc: prodVpc,
        ecsSecurityGroup: prodEcsSg,
        albSecurityGroup: prodAlbSg,
        ecsTaskRole: prodTaskRole,
        ecsTaskExecutionRole: prodTaskExecRole,
        dbEndpoint: 'prod-aurora-cluster.cluster-xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com',
        dbPort: 3306,
        appRepository: prodAppRepo,
        sidecarRepository: prodSidecarRepo,
        logGroup: prodLogGroup,
        certificateArn: TEST_CERTIFICATE_ARN,
        config: prodConfig,
        env: prodEnv,
      });
      const prodTemplate = Template.fromStack(prodStack);

      // 【結果検証】: スナップショットとの一致を確認
      expect(prodTemplate.toJSON()).toMatchSnapshot();
    });
  });

  // ============================================================================
  // TC-AS-03: ECS Cluster リソース存在確認
  // 🔵 信頼性: REQ-012、TASK-0017.md より
  // ============================================================================
  describe('TC-AS-03: ECS Cluster リソース存在確認', () => {
    // 【テスト目的】: ApplicationStack が ECS Cluster を正しく作成することを確認
    // 【テスト内容】: AWS::ECS::Cluster リソースが 1 つ存在することを検証
    // 【期待される動作】: ECS Cluster リソースが 1 つ存在する
    // 🔵 信頼性: REQ-012、TASK-0017.md より

    test('ECS Cluster が 1 つ作成されること', () => {
      // 【検証項目】: Cluster リソースの数
      // 🔵 信頼性: REQ-012 より
      template.resourceCountIs('AWS::ECS::Cluster', 1);
    });
  });

  // ============================================================================
  // TC-AS-04: Task Definition リソース存在確認
  // 🔵 信頼性: REQ-014〜018、TASK-0017.md より
  // ============================================================================
  describe('TC-AS-04: Task Definition リソース存在確認', () => {
    // 【テスト目的】: ApplicationStack が Task Definition を正しく作成することを確認
    // 【テスト内容】: AWS::ECS::TaskDefinition リソースが 2 つ存在することを検証
    // 【期待される動作】: Frontend と Backend 用に各 1 つ、計 2 つ作成
    // 🔵 信頼性: REQ-014〜018、TASK-0017.md より

    test('Task Definition が 2 つ作成されること（Frontend + Backend）', () => {
      // 【検証項目】: TaskDefinition リソースの数
      // 🔵 信頼性: REQ-021 で Frontend/Backend 別 Service が要求されている
      template.resourceCountIs('AWS::ECS::TaskDefinition', 2);
    });
  });

  // ============================================================================
  // TC-AS-05: ECS Service リソース存在確認
  // 🔵 信頼性: REQ-019〜021、TASK-0017.md より
  // ============================================================================
  describe('TC-AS-05: ECS Service リソース存在確認', () => {
    // 【テスト目的】: ApplicationStack が ECS Service を正しく作成することを確認
    // 【テスト内容】: AWS::ECS::Service リソースが 2 つ存在することを検証
    // 【期待される動作】: Frontend と Backend Service が各 1 つ作成
    // 🔵 信頼性: REQ-019〜021、TASK-0017.md より

    test('ECS Service が 2 つ作成されること（Frontend + Backend）', () => {
      // 【検証項目】: Service リソースの数
      // 🔵 信頼性: REQ-021 で別々の ECS Service 構成が要求されている
      template.resourceCountIs('AWS::ECS::Service', 2);
    });
  });

  // ============================================================================
  // TC-AS-06: ALB リソース存在確認
  // 🔵 信頼性: REQ-028、TASK-0017.md より
  // ============================================================================
  describe('TC-AS-06: ALB リソース存在確認', () => {
    // 【テスト目的】: ApplicationStack が ALB を正しく作成することを確認
    // 【テスト内容】: AWS::ElasticLoadBalancingV2::LoadBalancer リソースが 1 つ存在することを検証
    // 【期待される動作】: Internet-facing ALB が作成される
    // 🔵 信頼性: REQ-028、TASK-0017.md より

    test('ALB が 1 つ作成されること', () => {
      // 【検証項目】: LoadBalancer リソースの数
      // 🔵 信頼性: REQ-028 より
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    });
  });

  // ============================================================================
  // TC-AS-07: Target Group リソース存在確認
  // 🔵 信頼性: REQ-028、alb-construct.test.ts パターンより
  // ============================================================================
  describe('TC-AS-07: Target Group リソース存在確認', () => {
    // 【テスト目的】: ApplicationStack が Target Group を正しく作成することを確認
    // 【テスト内容】: AWS::ElasticLoadBalancingV2::TargetGroup リソースが存在することを検証
    // 【期待される動作】: ECS Service 用の Target Group が作成される
    // 🔵 信頼性: REQ-028、alb-construct.test.ts パターンより

    test('Target Group が作成されること', () => {
      // 【検証項目】: TargetGroup リソースの存在
      // 🔵 信頼性: ALB にはターゲットへのルーティング用 Target Group が必要
      const targetGroups = template.findResources('AWS::ElasticLoadBalancingV2::TargetGroup');
      expect(Object.keys(targetGroups).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // TC-AS-08: Listener リソース存在確認
  // 🔵 信頼性: REQ-029〜030、alb-construct.test.ts パターンより
  // ============================================================================
  describe('TC-AS-08: Listener リソース存在確認', () => {
    // 【テスト目的】: ApplicationStack が HTTPS/HTTP Listener を正しく作成することを確認
    // 【テスト内容】: AWS::ElasticLoadBalancingV2::Listener リソースが 2 つ存在することを検証
    // 【期待される動作】: HTTPS リスナーと HTTP→HTTPS リダイレクト用リスナーが作成
    // 🔵 信頼性: REQ-029〜030、alb-construct.test.ts パターンより

    test('HTTPS/HTTP Listener が 2 つ作成されること', () => {
      // 【検証項目】: Listener リソースの数
      // 🔵 信頼性: REQ-029（HTTP→HTTPS）、REQ-030（ACM 証明書）
      template.resourceCountIs('AWS::ElasticLoadBalancingV2::Listener', 2);
    });
  });

  // ============================================================================
  // TC-AS-09: ECS Cluster Container Insights 設定確認
  // 🔵 信頼性: REQ-013、ecs-cluster-construct.test.ts パターンより
  // ============================================================================
  describe('TC-AS-09: ECS Cluster Container Insights 設定確認', () => {
    // 【テスト目的】: Container Insights が有効化されていることを確認
    // 【テスト内容】: ECS Cluster の Container Insights 設定を検証
    // 【期待される動作】: containerInsights: 'enabled' が設定
    // 🔵 信頼性: REQ-013、ecs-cluster-construct.test.ts パターンより

    test('Container Insights が有効化されていること', () => {
      // 【検証項目】: containerInsights 設定値
      // 🔵 信頼性: REQ-013 で Container Insights 有効化が要求されている
      // 【補足】: CDK v2 では containerInsightsV2 使用時に 'enhanced' モードが設定される
      template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterSettings: Match.arrayWith([
          Match.objectLike({
            Name: 'containerInsights',
            Value: 'enhanced',
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-AS-10: Task Definition CPU/Memory 設定確認
  // 🔵 信頼性: REQ-014、task-definition-construct.test.ts パターンより
  // ============================================================================
  describe('TC-AS-10: Task Definition CPU/Memory 設定確認', () => {
    // 【テスト目的】: Task Definition の CPU/Memory が正しく設定されていることを確認
    // 【テスト内容】: Task Definition の Cpu と Memory 設定を検証
    // 【期待される動作】: 0.5 vCPU / 1 GB Memory が設定
    // 🔵 信頼性: REQ-014、task-definition-construct.test.ts パターンより

    test('Task Definition の CPU が正しく設定されていること', () => {
      // 【検証項目】: Cpu の値
      // 🔵 信頼性: REQ-014 で 0.5 vCPU が指定されている
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '512',
      });
    });

    test('Task Definition の Memory が正しく設定されていること', () => {
      // 【検証項目】: Memory の値
      // 🔵 信頼性: REQ-014 で 1GB が指定されている
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Memory: '1024',
      });
    });
  });

  // ============================================================================
  // TC-AS-11: ECS Service Desired Count 設定確認
  // 🔵 信頼性: REQ-020、ecs-service-construct.test.ts パターンより
  // ============================================================================
  describe('TC-AS-11: ECS Service Desired Count 設定確認', () => {
    // 【テスト目的】: Desired Count が 2 以上に設定されていることを確認
    // 【テスト内容】: ECS Service の DesiredCount 設定を検証
    // 【期待される動作】: 高可用性のため 2 以上のタスク数が設定
    // 🔵 信頼性: REQ-020、ecs-service-construct.test.ts パターンより

    test('Desired Count が 2 以上に設定されていること', () => {
      // 【検証項目】: DesiredCount の値
      // 🔵 信頼性: REQ-020、NFR-004 で Desired Count 2 以上が要求されている
      template.hasResourceProperties('AWS::ECS::Service', {
        DesiredCount: Match.anyValue(),
      });

      // サービスの DesiredCount が 2 以上であることを確認
      const services = template.findResources('AWS::ECS::Service');
      const serviceValues = Object.values(services);
      expect(serviceValues.length).toBeGreaterThanOrEqual(1);

      for (const service of serviceValues) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const desiredCount = (service as any).Properties.DesiredCount;
        expect(desiredCount).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ============================================================================
  // TC-AS-12: ECS Service EnableExecuteCommand 設定確認
  // 🔵 信頼性: REQ-019、ecs-service-construct.test.ts パターンより
  // ============================================================================
  describe('TC-AS-12: ECS Service EnableExecuteCommand 設定確認', () => {
    // 【テスト目的】: ECS Exec が有効化されていることを確認
    // 【テスト内容】: ECS Service の EnableExecuteCommand 設定を検証
    // 【期待される動作】: ECS Exec が有効
    // 🔵 信頼性: REQ-019、ecs-service-construct.test.ts パターンより

    test('ECS Exec が有効化されていること', () => {
      // 【検証項目】: EnableExecuteCommand の値
      // 🔵 信頼性: REQ-019 で ECS Exec 有効化が要求されている
      template.hasResourceProperties('AWS::ECS::Service', {
        EnableExecuteCommand: true,
      });
    });
  });

  // ============================================================================
  // TC-AS-13: ALB Internet-facing 設定確認
  // 🔵 信頼性: REQ-028、alb-construct.test.ts パターンより
  // ============================================================================
  describe('TC-AS-13: ALB Internet-facing 設定確認', () => {
    // 【テスト目的】: ALB が Internet-facing で設定されていることを確認
    // 【テスト内容】: ALB の Scheme 設定を検証
    // 【期待される動作】: Public Subnet に配置され、インターネットからアクセス可能
    // 🔵 信頼性: REQ-028、alb-construct.test.ts パターンより

    test('ALB が Internet-facing で設定されていること', () => {
      // 【検証項目】: Scheme の値
      // 🔵 信頼性: REQ-028 で Internet-facing が要求されている
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Scheme: 'internet-facing',
      });
    });
  });

  // ============================================================================
  // TC-AS-14: HTTP→HTTPS リダイレクト設定確認
  // 🔵 信頼性: REQ-029、alb-construct.test.ts パターンより
  // ============================================================================
  describe('TC-AS-14: HTTP→HTTPS リダイレクト設定確認', () => {
    // 【テスト目的】: HTTP リクエストが HTTPS にリダイレクトされることを確認
    // 【テスト内容】: HTTP Listener のリダイレクトアクションを検証
    // 【期待される動作】: Port 80 への接続が Port 443 へリダイレクト
    // 🔵 信頼性: REQ-029、alb-construct.test.ts パターンより

    test('HTTP リクエストが HTTPS にリダイレクトされること', () => {
      // 【検証項目】: リダイレクトアクションの設定
      // 🔵 信頼性: REQ-029 で HTTP→HTTPS リダイレクトが要求されている
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 80,
        DefaultActions: Match.arrayWith([
          Match.objectLike({
            Type: 'redirect',
            RedirectConfig: Match.objectLike({
              Protocol: 'HTTPS',
              Port: '443',
              StatusCode: 'HTTP_301',
            }),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-AS-15: cluster プロパティ公開確認
  // 🔵 信頼性: note.md 公開プロパティ、database-stack.test.ts パターンより
  // ============================================================================
  describe('TC-AS-15: cluster プロパティ公開確認', () => {
    // 【テスト目的】: ApplicationStack.cluster が定義されていることを確認
    // 【テスト内容】: cluster プロパティがアクセス可能で、ICluster 型であることを検証
    // 【期待される動作】: cluster プロパティが定義され、clusterArn が取得可能
    // 🔵 信頼性: note.md 公開プロパティ、database-stack.test.ts パターンより

    test('cluster プロパティが定義されていること', () => {
      // 【検証項目】: cluster プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.cluster).toBeDefined();
    });

    test('cluster の clusterArn が取得可能であること', () => {
      // 【検証項目】: clusterArn の取得可能性
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.cluster.clusterArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-AS-16: frontendTaskDefinition プロパティ公開確認
  // 🔵 信頼性: note.md 公開プロパティより
  // ============================================================================
  describe('TC-AS-16: frontendTaskDefinition プロパティ公開確認', () => {
    // 【テスト目的】: ApplicationStack.frontendTaskDefinition が定義されていることを確認
    // 【テスト内容】: frontendTaskDefinition プロパティがアクセス可能であることを検証
    // 【期待される動作】: FargateTaskDefinition 型のプロパティがアクセス可能
    // 🔵 信頼性: note.md 公開プロパティより

    test('frontendTaskDefinition プロパティが定義されていること', () => {
      // 【検証項目】: frontendTaskDefinition プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.frontendTaskDefinition).toBeDefined();
    });

    test('frontendTaskDefinition の taskDefinitionArn が取得可能であること', () => {
      // 【検証項目】: taskDefinitionArn の取得可能性
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.frontendTaskDefinition.taskDefinitionArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-AS-17: backendTaskDefinition プロパティ公開確認
  // 🔵 信頼性: note.md 公開プロパティより
  // ============================================================================
  describe('TC-AS-17: backendTaskDefinition プロパティ公開確認', () => {
    // 【テスト目的】: ApplicationStack.backendTaskDefinition が定義されていることを確認
    // 【テスト内容】: backendTaskDefinition プロパティがアクセス可能であることを検証
    // 【期待される動作】: FargateTaskDefinition 型のプロパティがアクセス可能
    // 🔵 信頼性: note.md 公開プロパティより

    test('backendTaskDefinition プロパティが定義されていること', () => {
      // 【検証項目】: backendTaskDefinition プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.backendTaskDefinition).toBeDefined();
    });

    test('backendTaskDefinition の taskDefinitionArn が取得可能であること', () => {
      // 【検証項目】: taskDefinitionArn の取得可能性
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.backendTaskDefinition.taskDefinitionArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-AS-18: frontendService プロパティ公開確認
  // 🔵 信頼性: note.md 公開プロパティより
  // ============================================================================
  describe('TC-AS-18: frontendService プロパティ公開確認', () => {
    // 【テスト目的】: ApplicationStack.frontendService が定義されていることを確認
    // 【テスト内容】: frontendService プロパティがアクセス可能であることを検証
    // 【期待される動作】: FargateService 型のプロパティがアクセス可能
    // 🔵 信頼性: note.md 公開プロパティより

    test('frontendService プロパティが定義されていること', () => {
      // 【検証項目】: frontendService プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.frontendService).toBeDefined();
    });

    test('frontendService の serviceArn が取得可能であること', () => {
      // 【検証項目】: serviceArn の取得可能性
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.frontendService.serviceArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-AS-19: backendService プロパティ公開確認
  // 🔵 信頼性: note.md 公開プロパティより
  // ============================================================================
  describe('TC-AS-19: backendService プロパティ公開確認', () => {
    // 【テスト目的】: ApplicationStack.backendService が定義されていることを確認
    // 【テスト内容】: backendService プロパティがアクセス可能であることを検証
    // 【期待される動作】: FargateService 型のプロパティがアクセス可能
    // 🔵 信頼性: note.md 公開プロパティより

    test('backendService プロパティが定義されていること', () => {
      // 【検証項目】: backendService プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.backendService).toBeDefined();
    });

    test('backendService の serviceArn が取得可能であること', () => {
      // 【検証項目】: serviceArn の取得可能性
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.backendService.serviceArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-AS-20: loadBalancer / dnsName プロパティ公開確認
  // 🔵 信頼性: note.md 公開プロパティより
  // ============================================================================
  describe('TC-AS-20: loadBalancer / dnsName プロパティ公開確認', () => {
    // 【テスト目的】: ApplicationStack.loadBalancer と dnsName が定義されていることを確認
    // 【テスト内容】: loadBalancer, dnsName プロパティがアクセス可能であることを検証
    // 【期待される動作】: IApplicationLoadBalancer 型と string 型のプロパティがアクセス可能
    // 🔵 信頼性: note.md 公開プロパティより

    test('loadBalancer プロパティが定義されていること', () => {
      // 【検証項目】: loadBalancer プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.loadBalancer).toBeDefined();
    });

    test('loadBalancer の loadBalancerArn が取得可能であること', () => {
      // 【検証項目】: loadBalancerArn の取得可能性
      // 🔵 信頼性: CDK ベストプラクティスより
      expect(stack.loadBalancer.loadBalancerArn).toBeDefined();
    });

    test('dnsName プロパティが定義されていること', () => {
      // 【検証項目】: dnsName プロパティの存在
      // 🔵 信頼性: note.md 公開プロパティより
      expect(stack.dnsName).toBeDefined();
    });

    test('dnsName が string 型であること', () => {
      // 【検証項目】: 型の確認
      // 🔵 信頼性: TypeScript 型定義より
      expect(typeof stack.dnsName).toBe('string');
    });
  });

  // ============================================================================
  // TC-AS-21: AlbDnsName CfnOutput 確認
  // 🔵 信頼性: note.md CfnOutput、database-stack.test.ts パターンより
  // ============================================================================
  describe('TC-AS-21: AlbDnsName CfnOutput 確認', () => {
    // 【テスト目的】: AlbDnsName が CfnOutput でエクスポートされていることを確認
    // 【テスト内容】: AlbDnsName の CfnOutput 存在と Export 設定を検証
    // 【期待される動作】: `${envName}-AlbDnsName` でエクスポート
    // 🔵 信頼性: note.md CfnOutput、database-stack.test.ts パターンより

    test('AlbDnsName がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: note.md CfnOutput より
      template.hasOutput('AlbDnsName', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-AlbDnsName`,
        },
      });
    });
  });

  // ============================================================================
  // TC-AS-22: AlbArn CfnOutput 確認
  // 🔵 信頼性: note.md CfnOutput より
  // ============================================================================
  describe('TC-AS-22: AlbArn CfnOutput 確認', () => {
    // 【テスト目的】: AlbArn が CfnOutput でエクスポートされていることを確認
    // 【テスト内容】: AlbArn の CfnOutput 存在と Export 設定を検証
    // 【期待される動作】: `${envName}-AlbArn` でエクスポート
    // 🔵 信頼性: note.md CfnOutput より

    test('AlbArn がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: note.md CfnOutput より
      template.hasOutput('AlbArn', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-AlbArn`,
        },
      });
    });
  });

  // ============================================================================
  // TC-AS-23: EcsClusterArn CfnOutput 確認
  // 🔵 信頼性: note.md CfnOutput より
  // ============================================================================
  describe('TC-AS-23: EcsClusterArn CfnOutput 確認', () => {
    // 【テスト目的】: EcsClusterArn が CfnOutput でエクスポートされていることを確認
    // 【テスト内容】: EcsClusterArn の CfnOutput 存在と Export 設定を検証
    // 【期待される動作】: `${envName}-EcsClusterArn` でエクスポート
    // 🔵 信頼性: note.md CfnOutput より

    test('EcsClusterArn がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: note.md CfnOutput より
      template.hasOutput('EcsClusterArn', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-EcsClusterArn`,
        },
      });
    });
  });

  // ============================================================================
  // TC-AS-24: FrontendServiceArn CfnOutput 確認
  // 🔵 信頼性: note.md CfnOutput より
  // ============================================================================
  describe('TC-AS-24: FrontendServiceArn CfnOutput 確認', () => {
    // 【テスト目的】: FrontendServiceArn が CfnOutput でエクスポートされていることを確認
    // 【テスト内容】: FrontendServiceArn の CfnOutput 存在と Export 設定を検証
    // 【期待される動作】: `${envName}-FrontendServiceArn` でエクスポート
    // 🔵 信頼性: note.md CfnOutput より

    test('FrontendServiceArn がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: note.md CfnOutput より
      template.hasOutput('FrontendServiceArn', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-FrontendServiceArn`,
        },
      });
    });
  });

  // ============================================================================
  // TC-AS-25: BackendServiceArn CfnOutput 確認
  // 🔵 信頼性: note.md CfnOutput より
  // ============================================================================
  describe('TC-AS-25: BackendServiceArn CfnOutput 確認', () => {
    // 【テスト目的】: BackendServiceArn が CfnOutput でエクスポートされていることを確認
    // 【テスト内容】: BackendServiceArn の CfnOutput 存在と Export 設定を検証
    // 【期待される動作】: `${envName}-BackendServiceArn` でエクスポート
    // 🔵 信頼性: note.md CfnOutput より

    test('BackendServiceArn がエクスポートされていること', () => {
      // 【検証項目】: CfnOutput の存在
      // 🔵 信頼性: note.md CfnOutput より
      template.hasOutput('BackendServiceArn', {
        Value: Match.anyValue(),
        Export: {
          Name: `${devConfig.envName}-BackendServiceArn`,
        },
      });
    });
  });

  // ============================================================================
  // TC-AS-26: TargetGroupArn CfnOutput 確認
  // 🟡 信頼性: CDK ベストプラクティスから妥当な推測
  // ============================================================================
  describe('TC-AS-26: TargetGroupArn CfnOutput 確認', () => {
    // 【テスト目的】: TargetGroupArn が CfnOutput で出力されていることを確認
    // 【テスト内容】: TargetGroupArn の CfnOutput 存在を検証
    // 【期待される動作】: Target Group ARN が出力される（オプション）
    // 🟡 信頼性: CDK ベストプラクティスから妥当な推測

    test('TargetGroupArn が出力されていること', () => {
      // 【検証項目】: Output の存在
      // 🟡 信頼性: Auto Scaling 設定等に有用
      const outputs = template.findOutputs('*');
      const outputKeys = Object.keys(outputs);
      // TargetGroupArn が存在するか確認（オプショナル）
      const hasTargetGroupOutput = outputKeys.some((key) => key.includes('TargetGroup'));
      expect(hasTargetGroupOutput).toBe(true);
    });
  });

  // ============================================================================
  // TC-AS-27: VPC 依存関係確認
  // 🔵 信頼性: architecture.md Stack 依存関係より
  // ============================================================================
  describe('TC-AS-27: VPC 依存関係確認', () => {
    // 【テスト目的】: Application Stack が VPC を正しく受け取ることを確認
    // 【テスト内容】: Props の vpc パラメータが各 Construct で使用されることを検証
    // 【期待される動作】: ALB、ECS Service が VPC のサブネットに配置
    // 🔵 信頼性: architecture.md Stack 依存関係より

    test('ALB が VPC のサブネットを参照していること', () => {
      // 【検証項目】: サブネット参照の正確性
      // 🔵 信頼性: architecture.md より
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Subnets: Match.anyValue(),
      });
    });

    test('ECS Service が VPC のサブネットを参照していること', () => {
      // 【検証項目】: NetworkConfiguration の設定
      // 🔵 信頼性: architecture.md より
      template.hasResourceProperties('AWS::ECS::Service', {
        NetworkConfiguration: Match.objectLike({
          AwsvpcConfiguration: Match.objectLike({
            Subnets: Match.anyValue(),
          }),
        }),
      });
    });
  });

  // ============================================================================
  // TC-AS-28: Security Stack 依存関係確認
  // 🔵 信頼性: architecture.md Stack 依存関係より
  // ============================================================================
  describe('TC-AS-28: Security Stack 依存関係確認', () => {
    // 【テスト目的】: Application Stack が Security Group と IAM Role を正しく受け取ることを確認
    // 【テスト内容】: Props の ecsSecurityGroup, albSecurityGroup, ecsTaskRole, ecsTaskExecutionRole が使用されることを検証
    // 【期待される動作】: 各リソースに適切な Security Group と Role が設定
    // 🔵 信頼性: architecture.md Stack 依存関係より

    test('ECS Service に SecurityGroups が設定されていること', () => {
      // 【検証項目】: Security Group 参照の正確性
      // 🔵 信頼性: architecture.md より
      template.hasResourceProperties('AWS::ECS::Service', {
        NetworkConfiguration: Match.objectLike({
          AwsvpcConfiguration: Match.objectLike({
            SecurityGroups: Match.anyValue(),
          }),
        }),
      });
    });

    test('ALB に SecurityGroups が設定されていること', () => {
      // 【検証項目】: Security Group 参照の正確性
      // 🔵 信頼性: architecture.md より
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        SecurityGroups: Match.anyValue(),
      });
    });

    test('Task Definition に ExecutionRoleArn が設定されていること', () => {
      // 【検証項目】: IAM Role 参照の正確性
      // 🔵 信頼性: architecture.md より
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ExecutionRoleArn: Match.anyValue(),
      });
    });

    test('Task Definition に TaskRoleArn が設定されていること', () => {
      // 【検証項目】: IAM Role 参照の正確性
      // 🔵 信頼性: architecture.md より
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        TaskRoleArn: Match.anyValue(),
      });
    });
  });

  // ============================================================================
  // TC-AS-29: Database Stack 依存関係確認
  // 🔵 信頼性: architecture.md Stack 依存関係より
  // ============================================================================
  describe('TC-AS-29: Database Stack 依存関係確認', () => {
    // 【テスト目的】: Application Stack が DB 接続情報を正しく受け取ることを確認
    // 【テスト内容】: Props の dbEndpoint, dbPort が Task Definition で使用されることを検証
    // 【期待される動作】: Sidecar Container の環境変数に DB 接続情報が設定
    // 🔵 信頼性: architecture.md Stack 依存関係より

    test('Task Definition の ContainerDefinitions に Environment が設定されていること', () => {
      // 【検証項目】: 環境変数の設定
      // 🔵 信頼性: Sidecar パターンでの DB 接続に必要
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Environment: Match.anyValue(),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-AS-30: Construct 間依存関係確認
  // 🔵 信頼性: TASK-0017.md より
  // ============================================================================
  describe('TC-AS-30: Construct 間依存関係確認', () => {
    // 【テスト目的】: Service が Cluster と Task Definition に依存していることを確認
    // 【テスト内容】: ECS Service が正しい Cluster と Task Definition を参照することを検証
    // 【期待される動作】: DependsOn または Ref で依存関係が設定
    // 🔵 信頼性: TASK-0017.md より

    test('ECS Service が Cluster を参照していること', () => {
      // 【検証項目】: 参照の存在
      // 🔵 信頼性: デプロイ順序の制御に必要
      template.hasResourceProperties('AWS::ECS::Service', {
        Cluster: Match.anyValue(),
      });
    });

    test('ECS Service が TaskDefinition を参照していること', () => {
      // 【検証項目】: 参照の存在
      // 🔵 信頼性: デプロイ順序の制御に必要
      template.hasResourceProperties('AWS::ECS::Service', {
        TaskDefinition: Match.anyValue(),
      });
    });
  });

  // ============================================================================
  // TC-AS-31: HTTPS 強制設定確認
  // 🔵 信頼性: REQ-029、NFR-105 より
  // ============================================================================
  describe('TC-AS-31: HTTPS 強制設定確認', () => {
    // 【テスト目的】: HTTPS が強制されていることを確認
    // 【テスト内容】: HTTP→HTTPS リダイレクト + HTTPS Listener の存在を検証
    // 【期待される動作】: Port 80 は 443 へリダイレクト、Port 443 で終端
    // 🔵 信頼性: REQ-029、NFR-105 より

    test('HTTPS Listener が存在すること', () => {
      // 【検証項目】: HTTPS Listener の存在
      // 🔵 信頼性: REQ-029 より
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 443,
        Protocol: 'HTTPS',
      });
    });

    test('HTTP Listener にリダイレクトアクションが設定されていること', () => {
      // 【検証項目】: リダイレクトアクションの設定
      // 🔵 信頼性: REQ-029 より
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 80,
        DefaultActions: Match.arrayWith([
          Match.objectLike({
            Type: 'redirect',
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-AS-32: ACM 証明書設定確認
  // 🔵 信頼性: REQ-030 より
  // ============================================================================
  describe('TC-AS-32: ACM 証明書設定確認', () => {
    // 【テスト目的】: HTTPS Listener に ACM 証明書が設定されていることを確認
    // 【テスト内容】: HTTPS Listener の Certificates 設定を検証
    // 【期待される動作】: Props で受け取った certificateArn が設定
    // 🔵 信頼性: REQ-030 より

    test('HTTPS Listener に ACM 証明書が設定されていること', () => {
      // 【検証項目】: CertificateArn の参照
      // 🔵 信頼性: TLS 終端に必要
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
        Port: 443,
        Certificates: Match.arrayWith([
          Match.objectLike({
            CertificateArn: Match.anyValue(),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-AS-33: Private Subnet 配置確認
  // 🔵 信頼性: architecture.md、セキュリティ設計より
  // ============================================================================
  describe('TC-AS-33: Private Subnet 配置確認', () => {
    // 【テスト目的】: ECS Service が Private App Subnet に配置されていることを確認
    // 【テスト内容】: ECS Service の NetworkConfiguration を検証
    // 【期待される動作】: Private App Subnet のみに配置、Public IP なし
    // 🔵 信頼性: architecture.md、セキュリティ設計より

    test('ECS Service に AssignPublicIp が DISABLED であること', () => {
      // 【検証項目】: サブネットと Public IP 設定
      // 🔵 信頼性: セキュリティ要件（外部からの直接アクセス防止）
      template.hasResourceProperties('AWS::ECS::Service', {
        NetworkConfiguration: Match.objectLike({
          AwsvpcConfiguration: Match.objectLike({
            AssignPublicIp: 'DISABLED',
          }),
        }),
      });
    });
  });

  // ============================================================================
  // TC-AS-34: 必須パラメータ欠落時のエラー（TypeScript コンパイル時検証）
  // 🟡 信頼性: TypeScript/CDK の動作仕様から妥当な推測
  // ============================================================================
  // 注: このテストケースは TypeScript コンパイル時に検証されるため、
  // ランタイムテストとしては省略。Props の型定義により必須パラメータが保証される。

  // ============================================================================
  // TC-AS-35: 無効な ARN 形式の処理
  // 🟡 信頼性: CDK/CloudFormation の動作仕様から妥当な推測
  // ============================================================================
  // 注: CDK は synth 時に ARN バリデーションを行わない場合が多い。
  // CloudFormation デプロイ時にエラーとなるため、ランタイムテストとしては省略。

  // ============================================================================
  // TC-AS-36: 環境別設定での動作確認
  // 🔵 信頼性: parameter.ts、database-stack.test.ts パターンより
  // ============================================================================
  describe('TC-AS-36: 環境別設定での動作確認', () => {
    // 【テスト目的】: devConfig と prodConfig の両方で Stack が正常に作成されることを確認
    // 【テスト内容】: 両環境で同じリソース構成が作成されることを検証
    // 【期待される動作】: 両環境でリソースが正常に作成
    // 🔵 信頼性: parameter.ts、database-stack.test.ts パターンより

    test('devConfig で正常に Stack が作成されること', () => {
      // 【テストデータ準備】: devConfig を使用
      const devApp = new cdk.App();
      const devEnv = {
        account: TEST_ACCOUNT_ID,
        region: TEST_REGION,
      };

      const devPrereqStack = new cdk.Stack(devApp, 'DevPrereqStack', { env: devEnv });
      const devVpc = createTestVpc(devPrereqStack);
      const devEcsSg = createTestEcsSecurityGroup(devPrereqStack, devVpc);
      const devAlbSg = createTestAlbSecurityGroup(devPrereqStack, devVpc);
      const devTaskRole = createTestEcsTaskRole(devPrereqStack);
      const devTaskExecRole = createTestEcsTaskExecutionRole(devPrereqStack);
      const devAppRepo = createTestEcrRepository(devPrereqStack, 'DevAppRepo');
      const devSidecarRepo = createTestEcrRepository(devPrereqStack, 'DevSidecarRepo');
      const devLogGroup = createTestLogGroup(devPrereqStack);

      const devStack = new ApplicationStack(devApp, 'DevApplicationStack', {
        vpc: devVpc,
        ecsSecurityGroup: devEcsSg,
        albSecurityGroup: devAlbSg,
        ecsTaskRole: devTaskRole,
        ecsTaskExecutionRole: devTaskExecRole,
        dbEndpoint: 'dev-aurora-cluster.cluster-xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com',
        dbPort: 3306,
        appRepository: devAppRepo,
        sidecarRepository: devSidecarRepo,
        logGroup: devLogGroup,
        certificateArn: TEST_CERTIFICATE_ARN,
        config: devConfig,
        env: devEnv,
      });
      const devTemplate = Template.fromStack(devStack);

      // 【検証項目】: 基本リソースの存在
      // 🔵 信頼性: parameter.ts より
      devTemplate.resourceCountIs('AWS::ECS::Cluster', 1);
      devTemplate.resourceCountIs('AWS::ECS::TaskDefinition', 2);
      devTemplate.resourceCountIs('AWS::ECS::Service', 2);
      devTemplate.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    });

    test('prodConfig で正常に Stack が作成されること', () => {
      // 【テストデータ準備】: prodConfig を使用
      const prodApp = new cdk.App();
      const prodEnv = {
        account: TEST_ACCOUNT_ID,
        region: TEST_REGION,
      };

      const prodPrereqStack = new cdk.Stack(prodApp, 'ProdPrereqStack', { env: prodEnv });
      const prodVpc = createTestVpc(prodPrereqStack);
      const prodEcsSg = createTestEcsSecurityGroup(prodPrereqStack, prodVpc);
      const prodAlbSg = createTestAlbSecurityGroup(prodPrereqStack, prodVpc);
      const prodTaskRole = createTestEcsTaskRole(prodPrereqStack);
      const prodTaskExecRole = createTestEcsTaskExecutionRole(prodPrereqStack);
      const prodAppRepo = createTestEcrRepository(prodPrereqStack, 'ProdAppRepo');
      const prodSidecarRepo = createTestEcrRepository(prodPrereqStack, 'ProdSidecarRepo');
      const prodLogGroup = createTestLogGroup(prodPrereqStack);

      const prodStack = new ApplicationStack(prodApp, 'ProdApplicationStack', {
        vpc: prodVpc,
        ecsSecurityGroup: prodEcsSg,
        albSecurityGroup: prodAlbSg,
        ecsTaskRole: prodTaskRole,
        ecsTaskExecutionRole: prodTaskExecRole,
        dbEndpoint: 'prod-aurora-cluster.cluster-xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com',
        dbPort: 3306,
        appRepository: prodAppRepo,
        sidecarRepository: prodSidecarRepo,
        logGroup: prodLogGroup,
        certificateArn: TEST_CERTIFICATE_ARN,
        config: prodConfig,
        env: prodEnv,
      });
      const prodTemplate = Template.fromStack(prodStack);

      // 【検証項目】: 基本リソースの存在
      // 🔵 信頼性: parameter.ts より
      prodTemplate.resourceCountIs('AWS::ECS::Cluster', 1);
      prodTemplate.resourceCountIs('AWS::ECS::TaskDefinition', 2);
      prodTemplate.resourceCountIs('AWS::ECS::Service', 2);
      prodTemplate.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    });
  });
});
