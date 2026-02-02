/**
 * CI/CD Pipeline Construct テスト
 *
 * TASK-0023: CI/CD Pipeline 構築
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-CICD-001〜005: CodeCommit Repository テスト
 * - TC-CICD-006〜015: CodeBuild Project テスト
 * - TC-CICD-016〜025: CodePipeline テスト
 * - TC-CICD-026〜028: Notification テスト
 * - TC-CICD-032〜034: Snapshot テスト
 *
 * 🟡 信頼性: 要件定義書 REQ-040, REQ-041 に基づくテスト（詳細設計は推測）
 *
 * @module cicd-pipeline-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CodeCommitConstruct } from '../../../lib/construct/cicd/codecommit-construct';
import { CodeBuildConstruct } from '../../../lib/construct/cicd/codebuild-construct';
import { CodePipelineConstruct } from '../../../lib/construct/cicd/codepipeline-construct';

// ============================================================================
// CodeCommit Repository テスト
// ============================================================================

describe('CodeCommitConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
  });

  // ============================================================================
  // TC-CICD-001: CodeCommit リポジトリ作成確認
  // 🔵 信頼性: REQ-040 より
  // ============================================================================
  describe('TC-CICD-001: CodeCommit リポジトリ作成確認', () => {
    // 【テスト目的】: CodeCommit リポジトリが正常に作成されることを確認
    // 【テスト内容】: AWS::CodeCommit::Repository リソースの存在を検証
    // 【期待される動作】: リポジトリが 1 つ作成される
    // 🔵 信頼性: REQ-040 より

    test('CodeCommit リポジトリが 1 つ作成されること', () => {
      // 【テストデータ準備】: CodeCommitConstruct を作成
      new CodeCommitConstruct(stack, 'TestRepository', {
        repositoryName: 'test-app-repository',
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: リポジトリリソースの存在確認
      // 【検証項目】: AWS::CodeCommit::Repository が 1 つ存在する 🔵
      template.resourceCountIs('AWS::CodeCommit::Repository', 1);
    });
  });

  // ============================================================================
  // TC-CICD-002: CodeCommit リポジトリ名設定確認
  // 🔵 信頼性: TASK-0023 より
  // ============================================================================
  describe('TC-CICD-002: CodeCommit リポジトリ名設定確認', () => {
    // 【テスト目的】: リポジトリ名が正しく設定されることを確認
    // 【テスト内容】: RepositoryName プロパティの値を検証
    // 【期待される動作】: 指定した名前が設定される
    // 🔵 信頼性: TASK-0023 より

    test('リポジトリ名が正しく設定されること', () => {
      // 【テストデータ準備】: 特定のリポジトリ名で Construct を作成
      const repositoryName = 'dev-app-repository';
      new CodeCommitConstruct(stack, 'TestRepository', {
        repositoryName,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: リポジトリ名の確認
      // 【検証項目】: RepositoryName が正しく設定されている 🔵
      template.hasResourceProperties('AWS::CodeCommit::Repository', {
        RepositoryName: repositoryName,
      });
    });
  });

  // ============================================================================
  // TC-CICD-003: CodeCommit リポジトリ説明設定確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-003: CodeCommit リポジトリ説明設定確認', () => {
    // 【テスト目的】: リポジトリの説明が設定されることを確認
    // 【テスト内容】: RepositoryDescription プロパティの値を検証
    // 【期待される動作】: 指定した説明が設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('リポジトリの説明が正しく設定されること', () => {
      // 【テストデータ準備】: 説明付きで Construct を作成
      const description = 'Application source code repository';
      new CodeCommitConstruct(stack, 'TestRepository', {
        repositoryName: 'test-app-repository',
        description,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: 説明の確認
      // 【検証項目】: RepositoryDescription が正しく設定されている 🟡
      template.hasResourceProperties('AWS::CodeCommit::Repository', {
        RepositoryDescription: description,
      });
    });
  });

  // ============================================================================
  // TC-CICD-004: CodeCommit repository プロパティ公開確認
  // 🔵 信頼性: CDK ベストプラクティスより
  // ============================================================================
  describe('TC-CICD-004: CodeCommit repository プロパティ公開確認', () => {
    // 【テスト目的】: repository プロパティが公開されることを確認
    // 【テスト内容】: repository プロパティの存在と型を検証
    // 【期待される動作】: IRepository 型のプロパティがアクセス可能
    // 🔵 信頼性: CDK ベストプラクティスより

    test('repository プロパティが定義されていること', () => {
      // 【テストデータ準備】: Construct を作成
      const codecommit = new CodeCommitConstruct(stack, 'TestRepository', {
        repositoryName: 'test-app-repository',
      });

      // 【結果検証】: プロパティ存在確認
      // 【検証項目】: repository プロパティが存在する 🔵
      expect(codecommit.repository).toBeDefined();
      expect(codecommit.repository.repositoryArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-CICD-005: CodeCommit cloneUrlHttp プロパティ公開確認
  // 🟡 信頼性: CDK 実装パターンから推測
  // ============================================================================
  describe('TC-CICD-005: CodeCommit cloneUrlHttp プロパティ公開確認', () => {
    // 【テスト目的】: cloneUrlHttp プロパティが公開されることを確認
    // 【テスト内容】: cloneUrlHttp プロパティの存在と型を検証
    // 【期待される動作】: string 型のプロパティがアクセス可能
    // 🟡 信頼性: CDK 実装パターンから推測

    test('cloneUrlHttp プロパティが定義されていること', () => {
      // 【テストデータ準備】: Construct を作成
      const codecommit = new CodeCommitConstruct(stack, 'TestRepository', {
        repositoryName: 'test-app-repository',
      });

      // 【結果検証】: プロパティ存在確認
      // 【検証項目】: cloneUrlHttp プロパティが存在する 🟡
      expect(codecommit.cloneUrlHttp).toBeDefined();
      expect(typeof codecommit.cloneUrlHttp).toBe('string');
    });
  });

  // ============================================================================
  // TC-CICD-032: CodeCommit CloudFormation スナップショット
  // 🔵 信頼性: CDK ベストプラクティスより
  // ============================================================================
  describe('TC-CICD-032: CodeCommit CloudFormation スナップショット', () => {
    // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する
    // 🔵 信頼性: CDK ベストプラクティスより

    test('CloudFormation テンプレートがスナップショットと一致すること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodeCommitConstruct(stack, 'TestRepository', {
        repositoryName: 'test-app-repository',
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: スナップショットとの比較
      // 【検証項目】: CloudFormation テンプレート全体 🔵
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// CodeBuild Project テスト
// ============================================================================

describe('CodeBuildConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  let app: cdk.App;
  let stack: cdk.Stack;
  let ecrRepository: ecr.IRepository;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });

    // 【ECR リポジトリ作成】: CodeBuild でプッシュ先として使用
    ecrRepository = new ecr.Repository(stack, 'TestEcrRepository', {
      repositoryName: 'test-repository',
    });
  });

  // ============================================================================
  // TC-CICD-006: CodeBuild プロジェクト作成確認
  // 🟡 信頼性: REQ-041 より推測
  // ============================================================================
  describe('TC-CICD-006: CodeBuild プロジェクト作成確認', () => {
    // 【テスト目的】: CodeBuild プロジェクトが正常に作成されることを確認
    // 【テスト内容】: AWS::CodeBuild::Project リソースの存在を検証
    // 【期待される動作】: プロジェクトが 1 つ作成される
    // 🟡 信頼性: REQ-041 より推測

    test('CodeBuild プロジェクトが 1 つ作成されること', () => {
      // 【テストデータ準備】: CodeBuildConstruct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: プロジェクトリソースの存在確認
      // 【検証項目】: AWS::CodeBuild::Project が 1 つ存在する 🟡
      template.resourceCountIs('AWS::CodeBuild::Project', 1);
    });
  });

  // ============================================================================
  // TC-CICD-007: CodeBuild ビルドイメージ設定確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-007: CodeBuild ビルドイメージ設定確認', () => {
    // 【テスト目的】: ビルドイメージが正しく設定されることを確認
    // 【テスト内容】: Environment.Image プロパティの値を検証
    // 【期待される動作】: Standard 7.0 イメージが設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('ビルドイメージが STANDARD_7_0 に設定されること', () => {
      // 【テストデータ準備】: デフォルト設定で Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: ビルドイメージの確認
      // 【検証項目】: Image が aws/codebuild/standard:7.0 🟡
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          Image: Match.stringLikeRegexp('aws/codebuild/standard:7.0'),
        }),
      });
    });
  });

  // ============================================================================
  // TC-CICD-008: CodeBuild コンピュートタイプ設定確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-008: CodeBuild コンピュートタイプ設定確認', () => {
    // 【テスト目的】: コンピュートタイプが正しく設定されることを確認
    // 【テスト内容】: Environment.ComputeType プロパティの値を検証
    // 【期待される動作】: BUILD_GENERAL1_SMALL が設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('コンピュートタイプが BUILD_GENERAL1_SMALL に設定されること', () => {
      // 【テストデータ準備】: デフォルト設定で Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: コンピュートタイプの確認
      // 【検証項目】: ComputeType が BUILD_GENERAL1_SMALL 🟡
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          ComputeType: 'BUILD_GENERAL1_SMALL',
        }),
      });
    });
  });

  // ============================================================================
  // TC-CICD-009: CodeBuild 特権モード設定確認
  // 🟡 信頼性: Docker ビルド要件より推測
  // ============================================================================
  describe('TC-CICD-009: CodeBuild 特権モード設定確認', () => {
    // 【テスト目的】: 特権モードが有効化されることを確認
    // 【テスト内容】: Environment.PrivilegedMode プロパティの値を検証
    // 【期待される動作】: Docker ビルド用に特権モードが有効
    // 🟡 信頼性: Docker ビルド要件より推測

    test('特権モードが有効化されていること', () => {
      // 【テストデータ準備】: デフォルト設定で Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: 特権モードの確認
      // 【検証項目】: PrivilegedMode が true 🟡
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          PrivilegedMode: true,
        }),
      });
    });
  });

  // ============================================================================
  // TC-CICD-010: CodeBuild IAM ロール作成確認
  // 🔵 信頼性: CodeBuild 必須要件
  // ============================================================================
  describe('TC-CICD-010: CodeBuild IAM ロール作成確認', () => {
    // 【テスト目的】: CodeBuild 用 IAM ロールが作成されることを確認
    // 【テスト内容】: ServiceRole プロパティの存在を検証
    // 【期待される動作】: IAM ロールが自動作成され設定される
    // 🔵 信頼性: CodeBuild 必須要件

    test('IAM ロールが設定されていること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: ServiceRole の確認
      // 【検証項目】: ServiceRole が設定されている 🔵
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        ServiceRole: Match.anyValue(),
      });
    });
  });

  // ============================================================================
  // TC-CICD-011: CodeBuild ECR 権限確認
  // 🟡 信頼性: Docker イメージプッシュ要件より推測
  // ============================================================================
  describe('TC-CICD-011: CodeBuild ECR 権限確認', () => {
    // 【テスト目的】: ECR への Push 権限が付与されることを確認
    // 【テスト内容】: IAM ポリシーの ECR 関連アクション検証
    // 【期待される動作】: ECR Push 権限が付与される
    // 🟡 信頼性: Docker イメージプッシュ要件より推測

    test('ECR への Push 権限が付与されていること', () => {
      // 【テストデータ準備】: ECR リポジトリ付きで Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: IAM ポリシーの確認
      // 【検証項目】: ecr:* アクションが含まれる 🟡
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([Match.stringLikeRegexp('ecr:.*')]),
            }),
          ]),
        }),
      });
    });
  });

  // ============================================================================
  // TC-CICD-012: CodeBuild 環境変数設定確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-012: CodeBuild 環境変数設定確認', () => {
    // 【テスト目的】: 環境変数が正しく設定されることを確認
    // 【テスト内容】: EnvironmentVariables プロパティの値を検証
    // 【期待される動作】: 指定した環境変数が設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('環境変数が正しく設定されること', () => {
      // 【テストデータ準備】: 環境変数付きで Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
        environmentVariables: {
          AWS_DEFAULT_REGION: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: 'ap-northeast-1',
          },
        },
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: 環境変数の確認
      // 【検証項目】: EnvironmentVariables が設定されている 🟡
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.anyValue(),
        }),
      });
    });
  });

  // ============================================================================
  // TC-CICD-013: CodeBuild project プロパティ公開確認
  // 🔵 信頼性: CDK ベストプラクティスより
  // ============================================================================
  describe('TC-CICD-013: CodeBuild project プロパティ公開確認', () => {
    // 【テスト目的】: project プロパティが公開されることを確認
    // 【テスト内容】: project プロパティの存在と型を検証
    // 【期待される動作】: IProject 型のプロパティがアクセス可能
    // 🔵 信頼性: CDK ベストプラクティスより

    test('project プロパティが定義されていること', () => {
      // 【テストデータ準備】: Construct を作成
      const codebuild = new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
      });

      // 【結果検証】: プロパティ存在確認
      // 【検証項目】: project プロパティが存在する 🔵
      expect(codebuild.project).toBeDefined();
      expect(codebuild.project.projectArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-CICD-014: CodeBuild コンピュートタイプカスタム設定確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-014: CodeBuild コンピュートタイプカスタム設定確認', () => {
    // 【テスト目的】: カスタムコンピュートタイプが設定されることを確認
    // 【テスト内容】: カスタム ComputeType の反映を検証
    // 【期待される動作】: MEDIUM サイズが設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('カスタムコンピュートタイプが正しく設定されること', () => {
      // 【テストデータ準備】: MEDIUM サイズで Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
        computeType: codebuild.ComputeType.MEDIUM,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: コンピュートタイプの確認
      // 【検証項目】: ComputeType が BUILD_GENERAL1_MEDIUM 🟡
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          ComputeType: 'BUILD_GENERAL1_MEDIUM',
        }),
      });
    });
  });

  // ============================================================================
  // TC-CICD-015: CodeBuild 特権モード無効化確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-015: CodeBuild 特権モード無効化確認', () => {
    // 【テスト目的】: 特権モードを無効化できることを確認
    // 【テスト内容】: PrivilegedMode: false の反映を検証
    // 【期待される動作】: 特権モードが無効になる
    // 🟡 信頼性: TASK-0023 より推測

    test('特権モードを無効化できること', () => {
      // 【テストデータ準備】: 特権モード無効で Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
        privilegedMode: false,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: 特権モードの確認
      // 【検証項目】: PrivilegedMode が false 🟡
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          PrivilegedMode: false,
        }),
      });
    });
  });

  // ============================================================================
  // TC-CICD-033: CodeBuild CloudFormation スナップショット
  // 🔵 信頼性: CDK ベストプラクティスより
  // ============================================================================
  describe('TC-CICD-033: CodeBuild CloudFormation スナップショット', () => {
    // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する
    // 🔵 信頼性: CDK ベストプラクティスより

    test('CloudFormation テンプレートがスナップショットと一致すること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodeBuildConstruct(stack, 'TestBuild', {
        projectName: 'test-app-build',
        ecrRepository: ecrRepository,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: スナップショットとの比較
      // 【検証項目】: CloudFormation テンプレート全体 🔵
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
});

// ============================================================================
// CodePipeline テスト
// ============================================================================

describe('CodePipelineConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let repository: codecommit.IRepository;
  let buildProject: codebuild.IProject;
  let ecsCluster: ecs.ICluster;
  let ecsService: ecs.IBaseService;
  let snsTopic: sns.ITopic;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App と Stack を作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });

    // 【VPC作成】: ECS Cluster 用
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
    });

    // 【CodeCommit リポジトリ作成】: Source ステージ用
    repository = new codecommit.Repository(stack, 'TestRepository', {
      repositoryName: 'test-repository',
    });

    // 【CodeBuild プロジェクト作成】: Build ステージ用
    buildProject = new codebuild.PipelineProject(stack, 'TestBuildProject', {
      projectName: 'test-build-project',
    });

    // 【ECS Cluster 作成】: Deploy ステージ用
    ecsCluster = new ecs.Cluster(stack, 'TestCluster', {
      vpc,
      clusterName: 'test-cluster',
    });

    // 【ECS Service 作成】: Deploy ステージ用
    const taskDefinition = new ecs.FargateTaskDefinition(
      stack,
      'TestTaskDef',
      {
        cpu: 256,
        memoryLimitMiB: 512,
      }
    );
    taskDefinition.addContainer('TestContainer', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'),
    });
    ecsService = new ecs.FargateService(stack, 'TestService', {
      cluster: ecsCluster,
      taskDefinition,
    });

    // 【SNS Topic 作成】: 通知用
    snsTopic = new sns.Topic(stack, 'TestTopic', {
      topicName: 'test-notifications',
    });
  });

  // ============================================================================
  // TC-CICD-016: CodePipeline 作成確認
  // 🟡 信頼性: REQ-041 より推測
  // ============================================================================
  describe('TC-CICD-016: CodePipeline 作成確認', () => {
    // 【テスト目的】: CodePipeline が正常に作成されることを確認
    // 【テスト内容】: AWS::CodePipeline::Pipeline リソースの存在を検証
    // 【期待される動作】: パイプラインが 1 つ作成される
    // 🟡 信頼性: REQ-041 より推測

    test('CodePipeline が 1 つ作成されること', () => {
      // 【テストデータ準備】: CodePipelineConstruct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: パイプラインリソースの存在確認
      // 【検証項目】: AWS::CodePipeline::Pipeline が 1 つ存在する 🟡
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
    });
  });

  // ============================================================================
  // TC-CICD-017: Source ステージ確認
  // 🔵 信頼性: TASK-0023 より
  // ============================================================================
  describe('TC-CICD-017: Source ステージ確認', () => {
    // 【テスト目的】: Source ステージが CodeCommit を参照することを確認
    // 【テスト内容】: Stages 配列の Source ステージ設定を検証
    // 【期待される動作】: CodeCommit アクションが設定される
    // 🔵 信頼性: TASK-0023 より

    test('Source ステージが CodeCommit を参照していること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: Source ステージの確認
      // 【検証項目】: CodeCommit アクションが含まれる 🔵
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Source',
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Provider: 'CodeCommit',
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-CICD-018: Build ステージ確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-018: Build ステージ確認', () => {
    // 【テスト目的】: Build ステージが CodeBuild を参照することを確認
    // 【テスト内容】: Stages 配列の Build ステージ設定を検証
    // 【期待される動作】: CodeBuild アクションが設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('Build ステージが CodeBuild を参照していること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: Build ステージの確認
      // 【検証項目】: CodeBuild アクションが含まれる 🟡
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Build',
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Provider: 'CodeBuild',
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-CICD-019: Deploy ステージ確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-019: Deploy ステージ確認', () => {
    // 【テスト目的】: Deploy ステージが ECS を参照することを確認
    // 【テスト内容】: Stages 配列の Deploy ステージ設定を検証
    // 【期待される動作】: ECS アクションが設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('Deploy ステージが ECS を参照していること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: Deploy ステージの確認
      // 【検証項目】: ECS アクションが含まれる 🟡
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Deploy',
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Provider: 'ECS',
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-CICD-020: アーティファクトバケット確認
  // 🔵 信頼性: CodePipeline 必須要件
  // ============================================================================
  describe('TC-CICD-020: アーティファクトバケット確認', () => {
    // 【テスト目的】: アーティファクトバケットが設定されることを確認
    // 【テスト内容】: ArtifactStore プロパティの存在を検証
    // 【期待される動作】: S3 バケットがアーティファクトストアとして設定される
    // 🔵 信頼性: CodePipeline 必須要件

    test('アーティファクトバケットが設定されていること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: ArtifactStore の確認
      // 【検証項目】: ArtifactStore が S3 タイプで設定されている 🔵
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        ArtifactStore: Match.objectLike({
          Type: 'S3',
          Location: Match.anyValue(),
        }),
      });
    });
  });

  // ============================================================================
  // TC-CICD-021: ブランチ名デフォルト値確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-021: ブランチ名デフォルト値確認', () => {
    // 【テスト目的】: ブランチ名のデフォルト値が main であることを確認
    // 【テスト内容】: branchName 省略時のデフォルト動作を検証
    // 【期待される動作】: 'main' ブランチが使用される
    // 🟡 信頼性: TASK-0023 より推測

    test('ブランチ名のデフォルト値が main であること', () => {
      // 【テストデータ準備】: branchName を省略して Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
        // branchName を省略
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: デフォルトブランチ名の確認
      // 【検証項目】: BranchName が 'main' 🟡
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Source',
            Actions: Match.arrayWith([
              Match.objectLike({
                Configuration: Match.objectLike({
                  BranchName: 'main',
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-CICD-022: pipeline プロパティ公開確認
  // 🟡 信頼性: CDK ベストプラクティスより推測
  // ============================================================================
  describe('TC-CICD-022: pipeline プロパティ公開確認', () => {
    // 【テスト目的】: pipeline プロパティが公開されることを確認
    // 【テスト内容】: pipeline プロパティの存在と型を検証
    // 【期待される動作】: IPipeline 型のプロパティがアクセス可能
    // 🟡 信頼性: CDK ベストプラクティスより推測

    test('pipeline プロパティが定義されていること', () => {
      // 【テストデータ準備】: Construct を作成
      const pipeline = new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });

      // 【結果検証】: プロパティ存在確認
      // 【検証項目】: pipeline プロパティが存在する 🟡
      expect(pipeline.pipeline).toBeDefined();
      expect(pipeline.pipeline.pipelineArn).toBeDefined();
    });
  });

  // ============================================================================
  // TC-CICD-023: ECS Deploy Action 設定確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-023: ECS Deploy Action 設定確認', () => {
    // 【テスト目的】: ECS Deploy Action が設定されることを確認
    // 【テスト内容】: Deploy ステージの ActionTypeId を検証
    // 【期待される動作】: ECS Provider が使用される
    // 🟡 信頼性: TASK-0023 より推測

    test('ECS Deploy Action が設定されていること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: ECS Deploy Action の確認
      // 【検証項目】: Provider が 'ECS' 🟡
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Deploy',
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Category: 'Deploy',
                  Provider: 'ECS',
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-CICD-024: ECS Service ターゲット確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-024: ECS Service ターゲット確認', () => {
    // 【テスト目的】: 正しい ECS Service をターゲットとすることを確認
    // 【テスト内容】: Deploy アクションの Configuration.ServiceName を検証
    // 【期待される動作】: ServiceName が設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('正しい ECS Service をターゲットとしていること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: ServiceName の確認
      // 【検証項目】: ServiceName が設定されている 🟡
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Deploy',
            Actions: Match.arrayWith([
              Match.objectLike({
                Configuration: Match.objectLike({
                  ServiceName: Match.anyValue(),
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-CICD-025: ECS Cluster ターゲット確認
  // 🟡 信頼性: TASK-0023 より推測
  // ============================================================================
  describe('TC-CICD-025: ECS Cluster ターゲット確認', () => {
    // 【テスト目的】: 正しい ECS Cluster をターゲットとすることを確認
    // 【テスト内容】: Deploy アクションの Configuration.ClusterName を検証
    // 【期待される動作】: ClusterName が設定される
    // 🟡 信頼性: TASK-0023 より推測

    test('正しい ECS Cluster をターゲットとしていること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: ClusterName の確認
      // 【検証項目】: ClusterName が設定されている 🟡
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Deploy',
            Actions: Match.arrayWith([
              Match.objectLike({
                Configuration: Match.objectLike({
                  ClusterName: Match.anyValue(),
                }),
              }),
            ]),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // TC-CICD-026: 通知ルール作成確認
  // 🔵 信頼性: REQ-039 より
  // ============================================================================
  describe('TC-CICD-026: 通知ルール作成確認', () => {
    // 【テスト目的】: 通知ルールが作成されることを確認
    // 【テスト内容】: AWS::CodeStarNotifications::NotificationRule の存在を検証
    // 【期待される動作】: 通知ルールが作成される
    // 🔵 信頼性: REQ-039 より

    test('通知ルールが作成されること', () => {
      // 【テストデータ準備】: SNS Topic 付きで Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
        notificationTopic: snsTopic,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: NotificationRule の存在確認
      // 【検証項目】: AWS::CodeStarNotifications::NotificationRule が存在する 🔵
      template.resourceCountIs(
        'AWS::CodeStarNotifications::NotificationRule',
        1
      );
    });
  });

  // ============================================================================
  // TC-CICD-027: SNS Target 設定確認
  // 🔵 信頼性: REQ-039 より
  // ============================================================================
  describe('TC-CICD-027: SNS Target 設定確認', () => {
    // 【テスト目的】: SNS Topic が通知ターゲットに設定されることを確認
    // 【テスト内容】: NotificationRule の Targets を検証
    // 【期待される動作】: SNS Topic がターゲットに設定される
    // 🔵 信頼性: REQ-039 より

    test('SNS Topic が通知ターゲットに設定されること', () => {
      // 【テストデータ準備】: SNS Topic 付きで Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
        notificationTopic: snsTopic,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: Targets の確認
      // 【検証項目】: SNS TargetType が設定されている 🔵
      template.hasResourceProperties(
        'AWS::CodeStarNotifications::NotificationRule',
        {
          Targets: Match.arrayWith([
            Match.objectLike({
              TargetType: 'SNS',
            }),
          ]),
        }
      );
    });
  });

  // ============================================================================
  // TC-CICD-028: パイプライン通知イベント確認
  // 🔵 信頼性: REQ-039, TASK-0023 より
  // ============================================================================
  describe('TC-CICD-028: パイプライン通知イベント確認', () => {
    // 【テスト目的】: パイプラインイベントが通知対象として設定されることを確認
    // 【テスト内容】: NotificationRule の EventTypeIds を検証
    // 【期待される動作】: パイプライン実行イベントが設定される
    // 🔵 信頼性: REQ-039, TASK-0023 より

    test('パイプライン通知イベントが設定されること', () => {
      // 【テストデータ準備】: SNS Topic 付きで Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
        notificationTopic: snsTopic,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: EventTypeIds の確認
      // 【検証項目】: パイプライン実行イベントが含まれる 🔵
      template.hasResourceProperties(
        'AWS::CodeStarNotifications::NotificationRule',
        {
          EventTypeIds: Match.arrayWith([
            'codepipeline-pipeline-pipeline-execution-started',
            'codepipeline-pipeline-pipeline-execution-succeeded',
            'codepipeline-pipeline-pipeline-execution-failed',
          ]),
        }
      );
    });
  });

  // ============================================================================
  // TC-CICD-034: CodePipeline CloudFormation スナップショット
  // 🔵 信頼性: CDK ベストプラクティスより
  // ============================================================================
  describe('TC-CICD-034: CodePipeline CloudFormation スナップショット', () => {
    // 【テスト目的】: CloudFormation テンプレートの一貫性を保証する
    // 【テスト内容】: テンプレートをスナップショットと比較
    // 【期待される動作】: テンプレートがスナップショットと一致する
    // 🔵 信頼性: CDK ベストプラクティスより

    test('CloudFormation テンプレートがスナップショットと一致すること', () => {
      // 【テストデータ準備】: Construct を作成
      new CodePipelineConstruct(stack, 'TestPipeline', {
        pipelineName: 'test-app-pipeline',
        repository: repository,
        buildProject: buildProject,
        ecsCluster: ecsCluster,
        ecsService: ecsService,
        notificationTopic: snsTopic,
      });
      const template = Template.fromStack(stack);

      // 【結果検証】: スナップショットとの比較
      // 【検証項目】: CloudFormation テンプレート全体 🔵
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
});
