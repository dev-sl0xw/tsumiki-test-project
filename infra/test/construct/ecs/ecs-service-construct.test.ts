/**
 * ECS Service Construct テスト
 *
 * TASK-0015: ECS Service Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-SERVICE-01: ECS Service リソース作成確認
 * - TC-SERVICE-02: Launch Type 確認
 * - TC-SERVICE-03: Desired Count 確認（デフォルト値）
 * - TC-SERVICE-04: ECS Exec 有効化確認
 * - TC-SERVICE-05: Minimum Healthy Percent 確認
 * - TC-SERVICE-06: Maximum Percent 確認
 * - TC-SERVICE-07: Network Configuration 確認
 * - TC-SERVICE-08: Security Group 確認
 * - TC-SERVICE-09: Subnets 確認
 * - TC-SERVICE-10: Public IP 無効確認
 * - TC-SERVICE-11: Target Group 連携確認
 * - TC-SERVICE-12: Container Name 確認
 * - TC-SERVICE-13: Container Port 確認
 * - TC-SERVICE-14: カスタム Desired Count 確認
 * - TC-SERVICE-15: ECS Exec 無効化確認
 * - TC-SERVICE-16: カスタム Service 名確認
 * - TC-SERVICE-17: カスタム Rolling Update 設定確認
 * - TC-SERVICE-18: service プロパティ確認
 * - TC-SERVICE-19: CloudFormation テンプレートスナップショット確認
 *
 * 🔵 信頼性: 要件定義書 REQ-019〜021, NFR-001, NFR-004 に基づくテスト
 *
 * @module ecs-service-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { EcsServiceConstruct } from '../../../lib/construct/ecs/ecs-service-construct';

describe('EcsServiceConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let cluster: ecs.Cluster;
  let taskDefinition: ecs.FargateTaskDefinition;
  let securityGroup: ec2.SecurityGroup;

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

    // 【VPC作成】: Service を配置する VPC
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // 【ECS Cluster 作成】: Service を配置する Cluster
    cluster = new ecs.Cluster(stack, 'TestCluster', {
      vpc,
      clusterName: 'test-cluster',
    });

    // 【Task Definition 作成】: Service が使用する Task Definition
    taskDefinition = new ecs.FargateTaskDefinition(stack, 'TestTaskDef', {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    // 【App Container 追加】: Task Definition にコンテナを追加
    taskDefinition.addContainer('app', {
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      portMappings: [{ containerPort: 3000 }],
    });

    // 【Security Group 作成】: Service のネットワーク設定
    securityGroup = new ec2.SecurityGroup(stack, 'TestSG', {
      vpc,
      description: 'Test Security Group for ECS Service',
    });
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // 正常系テストケース（基本機能）
  // ============================================================================

  describe('正常系 - 基本機能', () => {
    // ============================================================================
    // TC-SERVICE-01: ECS Service リソース作成確認
    // 🔵 信頼性: REQ-019〜021 より
    // ============================================================================
    describe('TC-SERVICE-01: ECS Service リソース作成確認', () => {
      // 【テスト目的】: EcsServiceConstruct がデフォルト設定で正常に ECS Service を作成することを確認
      // 【テスト内容】: 必須パラメータのみで Construct をインスタンス化し、CloudFormation テンプレートを検証
      // 【期待される動作】: AWS::ECS::Service リソースが 1 つ作成される
      // 🔵 信頼性: REQ-019〜021 より

      test('ECS Service が作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで EcsServiceConstruct を作成
        // 【初期条件設定】: デフォルト設定を使用
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ECS Service リソースの存在確認
        // 【期待値確認】: 1つの ECS Service が作成されること
        template.resourceCountIs('AWS::ECS::Service', 1); // 【確認内容】: ECS Service リソースが1つ存在する 🔵
      });
    });

    // ============================================================================
    // TC-SERVICE-02: Launch Type 確認
    // 🔵 信頼性: Fargate 必須要件より
    // ============================================================================
    describe('TC-SERVICE-02: Launch Type 確認', () => {
      // 【テスト目的】: ECS Service が Fargate Launch Type で作成されることを確認
      // 【テスト内容】: LaunchType プロパティが 'FARGATE' であることを検証
      // 【期待される動作】: LaunchType: 'FARGATE' が設定される
      // 🔵 信頼性: Fargate 必須要件より

      test('LaunchType が FARGATE に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで EcsServiceConstruct を作成
        // 【初期条件設定】: Fargate Launch Type を確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: LaunchType プロパティの値確認
        // 【期待値確認】: Fargate Service であること
        template.hasResourceProperties('AWS::ECS::Service', {
          LaunchType: 'FARGATE', // 【確認内容】: Fargate Launch Type が設定されている 🔵
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-03: Desired Count 確認（デフォルト値）
    // 🔵 信頼性: REQ-020, NFR-004 より
    // ============================================================================
    describe('TC-SERVICE-03: Desired Count 確認（デフォルト値）', () => {
      // 【テスト目的】: desiredCount を指定しない場合、デフォルト値 2 が設定されることを確認
      // 【テスト内容】: デフォルトの Desired Count による高可用性設定を検証
      // 【期待される動作】: DesiredCount: 2 が設定される
      // 🔵 信頼性: REQ-020, NFR-004 より

      test('Desired Count デフォルト値が 2 に設定されること', () => {
        // 【テストデータ準備】: desiredCount を指定しないで EcsServiceConstruct を作成
        // 【初期条件設定】: デフォルト Desired Count の確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: DesiredCount プロパティの値確認
        // 【期待値確認】: 要件定義書で 2 以上を指定
        template.hasResourceProperties('AWS::ECS::Service', {
          DesiredCount: 2, // 【確認内容】: デフォルト Desired Count が 2（高可用性）🔵
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-04: ECS Exec 有効化確認
    // 🔵 信頼性: REQ-019 より
    // ============================================================================
    describe('TC-SERVICE-04: ECS Exec 有効化確認', () => {
      // 【テスト目的】: enableExecuteCommand がデフォルトで true に設定されることを確認
      // 【テスト内容】: ECS Exec によるコンテナアクセス機能を検証
      // 【期待される動作】: EnableExecuteCommand: true が設定される
      // 🔵 信頼性: REQ-019 より

      test('ECS Exec がデフォルトで有効化されること', () => {
        // 【テストデータ準備】: enableExecuteCommand を指定しないで EcsServiceConstruct を作成
        // 【初期条件設定】: デフォルト ECS Exec 設定の確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: EnableExecuteCommand プロパティの値確認
        // 【期待値確認】: 運用目的での ECS Exec が必要
        template.hasResourceProperties('AWS::ECS::Service', {
          EnableExecuteCommand: true, // 【確認内容】: ECS Exec がデフォルトで有効 🔵
        });
      });
    });
  });

  // ============================================================================
  // デプロイメント設定テストケース
  // ============================================================================

  describe('デプロイメント設定', () => {
    // ============================================================================
    // TC-SERVICE-05: Minimum Healthy Percent 確認
    // 🟡 信頼性: 設計文書から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-05: Minimum Healthy Percent 確認', () => {
      // 【テスト目的】: Rolling Update のデフォルト MinimumHealthyPercent が 50 に設定されることを確認
      // 【テスト内容】: デプロイ中の最小タスク維持率を検証
      // 【期待される動作】: DeploymentConfiguration.MinimumHealthyPercent: 50
      // 🟡 信頼性: 設計文書から妥当な推測

      test('Minimum Healthy Percent デフォルト値が 50 に設定されること', () => {
        // 【テストデータ準備】: minimumHealthyPercent を指定しないで EcsServiceConstruct を作成
        // 【初期条件設定】: デフォルト Rolling Update 設定の確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: DeploymentConfiguration.MinimumHealthyPercent の値確認
        // 【期待値確認】: デプロイ中に最低 50% のタスクを維持
        template.hasResourceProperties('AWS::ECS::Service', {
          DeploymentConfiguration: Match.objectLike({
            MinimumHealthyPercent: 50, // 【確認内容】: デフォルト MinimumHealthyPercent が 50% 🟡
          }),
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-06: Maximum Percent 確認
    // 🟡 信頼性: 設計文書から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-06: Maximum Percent 確認', () => {
      // 【テスト目的】: Rolling Update のデフォルト MaximumPercent が 200 に設定されることを確認
      // 【テスト内容】: デプロイ中の最大タスク許可率を検証
      // 【期待される動作】: DeploymentConfiguration.MaximumPercent: 200
      // 🟡 信頼性: 設計文書から妥当な推測

      test('Maximum Percent デフォルト値が 200 に設定されること', () => {
        // 【テストデータ準備】: maximumPercent を指定しないで EcsServiceConstruct を作成
        // 【初期条件設定】: デフォルト Rolling Update 設定の確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: DeploymentConfiguration.MaximumPercent の値確認
        // 【期待値確認】: デプロイ中に最大 200% のタスクを許可
        template.hasResourceProperties('AWS::ECS::Service', {
          DeploymentConfiguration: Match.objectLike({
            MaximumPercent: 200, // 【確認内容】: デフォルト MaximumPercent が 200% 🟡
          }),
        });
      });
    });
  });

  // ============================================================================
  // ネットワーク設定テストケース
  // ============================================================================

  describe('ネットワーク設定', () => {
    // ============================================================================
    // TC-SERVICE-07: Network Configuration 確認
    // 🔵 信頼性: architecture.md より
    // ============================================================================
    describe('TC-SERVICE-07: Network Configuration 確認', () => {
      // 【テスト目的】: ECS Service に NetworkConfiguration が設定されることを確認
      // 【テスト内容】: Fargate 必須の awsvpc ネットワーク設定を検証
      // 【期待される動作】: NetworkConfiguration.AwsvpcConfiguration が設定される
      // 🔵 信頼性: architecture.md より

      test('NetworkConfiguration が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで EcsServiceConstruct を作成
        // 【初期条件設定】: ネットワーク設定の存在確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: NetworkConfiguration の存在確認
        // 【期待値確認】: Fargate は awsvpc モード必須
        template.hasResourceProperties('AWS::ECS::Service', {
          NetworkConfiguration: Match.objectLike({
            AwsvpcConfiguration: Match.anyValue(), // 【確認内容】: AwsvpcConfiguration が存在する 🔵
          }),
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-08: Security Group 確認
    // 🔵 信頼性: architecture.md より
    // ============================================================================
    describe('TC-SERVICE-08: Security Group 確認', () => {
      // 【テスト目的】: 指定した Security Group が Service に関連付けられることを確認
      // 【テスト内容】: SecurityGroups 配列に指定した Security Group が含まれることを検証
      // 【期待される動作】: AwsvpcConfiguration.SecurityGroups に Security Group ID が含まれる
      // 🔵 信頼性: architecture.md より

      test('Security Group が正しく設定されること', () => {
        // 【テストデータ準備】: securityGroup を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: Security Group の関連付け確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: SecurityGroups の設定確認
        // 【期待値確認】: 最小権限の原則に基づく Security Group
        template.hasResourceProperties('AWS::ECS::Service', {
          NetworkConfiguration: Match.objectLike({
            AwsvpcConfiguration: Match.objectLike({
              SecurityGroups: Match.anyValue(), // 【確認内容】: SecurityGroups が設定されている 🔵
            }),
          }),
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-09: Subnets 確認
    // 🔵 信頼性: architecture.md より
    // ============================================================================
    describe('TC-SERVICE-09: Subnets 確認', () => {
      // 【テスト目的】: 指定した Subnet が Service に関連付けられることを確認
      // 【テスト内容】: Subnets 配列に指定した Subnet ID が含まれることを検証
      // 【期待される動作】: AwsvpcConfiguration.Subnets に Subnet ID が含まれる
      // 🔵 信頼性: architecture.md より

      test('Subnets が正しく設定されること', () => {
        // 【テストデータ準備】: subnets を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: Subnet の関連付け確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Subnets の設定確認
        // 【期待値確認】: Private Subnet への配置
        template.hasResourceProperties('AWS::ECS::Service', {
          NetworkConfiguration: Match.objectLike({
            AwsvpcConfiguration: Match.objectLike({
              Subnets: Match.anyValue(), // 【確認内容】: Subnets が設定されている 🔵
            }),
          }),
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-10: Public IP 無効確認
    // 🔵 信頼性: architecture.md より
    // ============================================================================
    describe('TC-SERVICE-10: Public IP 無効確認', () => {
      // 【テスト目的】: デフォルトで Public IP が割り当てられないことを確認
      // 【テスト内容】: AssignPublicIp が DISABLED であることを検証
      // 【期待される動作】: AssignPublicIp: 'DISABLED'
      // 🔵 信頼性: architecture.md より

      test('Public IP がデフォルトで無効化されること', () => {
        // 【テストデータ準備】: assignPublicIp を指定しないで EcsServiceConstruct を作成
        // 【初期条件設定】: デフォルトの Public IP 設定確認
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: AssignPublicIp の値確認
        // 【期待値確認】: セキュリティ要件により Private 配置
        template.hasResourceProperties('AWS::ECS::Service', {
          NetworkConfiguration: Match.objectLike({
            AwsvpcConfiguration: Match.objectLike({
              AssignPublicIp: 'DISABLED', // 【確認内容】: Public IP が無効化されている 🔵
            }),
          }),
        });
      });
    });
  });

  // ============================================================================
  // ALB 連携テストケース
  // ============================================================================

  describe('ALB 連携', () => {
    // ALB Target Group のセットアップ
    let targetGroup: elb.ApplicationTargetGroup;

    beforeEach(() => {
      // 【ALB Target Group 作成】: ALB 連携テスト用
      targetGroup = new elb.ApplicationTargetGroup(stack, 'TestTargetGroup', {
        vpc,
        port: 3000,
        protocol: elb.ApplicationProtocol.HTTP,
        targetType: elb.TargetType.IP,
      });
    });

    // ============================================================================
    // TC-SERVICE-11: Target Group 連携確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-11: Target Group 連携確認', () => {
      // 【テスト目的】: targetGroup を指定した場合、LoadBalancers 設定が追加されることを確認
      // 【テスト内容】: LoadBalancers 配列に Target Group が含まれることを検証
      // 【期待される動作】: LoadBalancers 配列に Target Group が含まれる
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('Target Group が LoadBalancers に設定されること', () => {
        // 【テストデータ準備】: targetGroup を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: ALB 連携を有効化
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          targetGroup,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: LoadBalancers の設定確認
        // 【期待値確認】: ALB Target Group との連携
        template.hasResourceProperties('AWS::ECS::Service', {
          LoadBalancers: Match.arrayWith([
            Match.objectLike({
              TargetGroupArn: Match.anyValue(), // 【確認内容】: TargetGroupArn が設定されている 🟡
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-12: Container Name 確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-12: Container Name 確認', () => {
      // 【テスト目的】: LoadBalancers 設定で正しい Container Name が指定されることを確認
      // 【テスト内容】: ContainerName が 'app' であることを検証
      // 【期待される動作】: ContainerName: 'app'
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('Container Name が正しく設定されること', () => {
        // 【テストデータ準備】: targetGroup を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: ALB → app Container 連携
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          targetGroup,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ContainerName の設定確認
        // 【期待値確認】: app コンテナへのトラフィックルーティング
        template.hasResourceProperties('AWS::ECS::Service', {
          LoadBalancers: Match.arrayWith([
            Match.objectLike({
              ContainerName: 'app', // 【確認内容】: ContainerName が 'app' に設定されている 🟡
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-13: Container Port 確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-13: Container Port 確認', () => {
      // 【テスト目的】: LoadBalancers 設定で正しい Container Port が指定されることを確認
      // 【テスト内容】: ContainerPort が 3000（デフォルト）であることを検証
      // 【期待される動作】: ContainerPort: 3000
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('Container Port が正しく設定されること', () => {
        // 【テストデータ準備】: targetGroup を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: デフォルトポートでの連携
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          targetGroup,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ContainerPort の設定確認
        // 【期待値確認】: app コンテナのポート 3000
        template.hasResourceProperties('AWS::ECS::Service', {
          LoadBalancers: Match.arrayWith([
            Match.objectLike({
              ContainerPort: 3000, // 【確認内容】: ContainerPort が 3000 に設定されている 🟡
            }),
          ]),
        });
      });
    });
  });

  // ============================================================================
  // オプションパラメータテストケース
  // ============================================================================

  describe('オプションパラメータ', () => {
    // ============================================================================
    // TC-SERVICE-14: カスタム Desired Count 確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-14: カスタム Desired Count 確認', () => {
      // 【テスト目的】: desiredCount を指定した場合、その値が設定されることを確認
      // 【テスト内容】: カスタム Desired Count が正しく反映されることを検証
      // 【期待される動作】: 指定した desiredCount が設定される
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('カスタム Desired Count が正しく設定されること', () => {
        // 【テストデータ準備】: desiredCount: 4 を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: カスタムタスク数を指定
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          desiredCount: 4,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: DesiredCount プロパティの値確認
        // 【期待値確認】: 指定した値が反映される
        template.hasResourceProperties('AWS::ECS::Service', {
          DesiredCount: 4, // 【確認内容】: 指定した Desired Count 4 が設定されている 🟡
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-15: ECS Exec 無効化確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-15: ECS Exec 無効化確認', () => {
      // 【テスト目的】: enableExecuteCommand: false を指定した場合の動作確認
      // 【テスト内容】: ECS Exec を無効化できることを検証
      // 【期待される動作】: EnableExecuteCommand: false
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('ECS Exec を無効化できること', () => {
        // 【テストデータ準備】: enableExecuteCommand: false を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: ECS Exec を明示的に無効化
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          enableExecuteCommand: false,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: EnableExecuteCommand プロパティの値確認
        // 【期待値確認】: セキュリティ要件で必要な場合に無効化可能
        template.hasResourceProperties('AWS::ECS::Service', {
          EnableExecuteCommand: false, // 【確認内容】: ECS Exec が無効化されている 🟡
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-16: カスタム Service 名確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-16: カスタム Service 名確認', () => {
      // 【テスト目的】: serviceName を指定した場合、その名前が設定されることを確認
      // 【テスト内容】: カスタム Service 名が正しく反映されることを検証
      // 【期待される動作】: ServiceName: 'my-backend-service'
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('カスタム Service 名が正しく設定されること', () => {
        // 【テストデータ準備】: serviceName を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: カスタム Service 名を指定
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          serviceName: 'my-backend-service',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ServiceName プロパティの値確認
        // 【期待値確認】: 指定した名前が反映される
        template.hasResourceProperties('AWS::ECS::Service', {
          ServiceName: 'my-backend-service', // 【確認内容】: 指定した Service 名が設定されている 🟡
        });
      });
    });

    // ============================================================================
    // TC-SERVICE-17: カスタム Rolling Update 設定確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-SERVICE-17: カスタム Rolling Update 設定確認', () => {
      // 【テスト目的】: minimumHealthyPercent と maximumPercent をカスタム値で指定した場合の動作確認
      // 【テスト内容】: カスタム Rolling Update 設定が正しく反映されることを検証
      // 【期待される動作】: 指定した値が DeploymentConfiguration に設定される
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('カスタム Rolling Update 設定が正しく設定されること', () => {
        // 【テストデータ準備】: minimumHealthyPercent と maximumPercent を指定して EcsServiceConstruct を作成
        // 【初期条件設定】: カスタムデプロイ設定を指定
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          minimumHealthyPercent: 100,
          maximumPercent: 150,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: DeploymentConfiguration の値確認
        // 【期待値確認】: 指定した値が反映される
        template.hasResourceProperties('AWS::ECS::Service', {
          DeploymentConfiguration: Match.objectLike({
            MinimumHealthyPercent: 100, // 【確認内容】: 指定した MinimumHealthyPercent 100 が設定されている 🟡
            MaximumPercent: 150, // 【確認内容】: 指定した MaximumPercent 150 が設定されている 🟡
          }),
        });
      });
    });
  });

  // ============================================================================
  // 公開プロパティテストケース
  // ============================================================================

  describe('公開プロパティ', () => {
    // ============================================================================
    // TC-SERVICE-18: service プロパティ確認
    // 🔵 信頼性: note.md より
    // ============================================================================
    describe('TC-SERVICE-18: service プロパティ確認', () => {
      // 【テスト目的】: 公開プロパティ service が正しく定義されていることを確認
      // 【テスト内容】: Construct の公開プロパティとして service が取得できることを検証
      // 【期待される動作】: construct.service が undefined でないこと
      // 🔵 信頼性: note.md より

      test('service プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで EcsServiceConstruct を作成
        // 【初期条件設定】: Construct の出力プロパティを確認
        const construct = new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });

        // 【結果検証】: service プロパティの存在確認
        // 【期待値確認】: 他の Construct から参照するために必要
        expect(construct.service).toBeDefined(); // 【確認内容】: service プロパティが存在する 🔵
      });
    });
  });

  // ============================================================================
  // スナップショットテスト
  // ============================================================================

  describe('スナップショット', () => {
    // ============================================================================
    // TC-SERVICE-19: CloudFormation テンプレートスナップショット確認
    // 🔵 信頼性: 品質保証のため
    // ============================================================================
    describe('TC-SERVICE-19: CloudFormation テンプレートスナップショット確認', () => {
      // 【テスト目的】: 生成される CloudFormation テンプレートが期待通りであることを確認
      // 【テスト内容】: テンプレートの意図しない変更を検出
      // 【期待される動作】: スナップショットと一致すること
      // 🔵 信頼性: 品質保証のため

      test('CloudFormation テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: 固定の設定で EcsServiceConstruct を作成
        // 【初期条件設定】: 一貫したテスト条件
        new EcsServiceConstruct(stack, 'TestService', {
          cluster,
          taskDefinition,
          securityGroup,
          subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          serviceName: 'snapshot-test-service',
          desiredCount: 2,
          enableExecuteCommand: true,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの一致確認
        // 【期待値確認】: 意図しない変更の検出
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: CloudFormation テンプレートがスナップショットと一致する 🔵
      });
    });
  });
});
