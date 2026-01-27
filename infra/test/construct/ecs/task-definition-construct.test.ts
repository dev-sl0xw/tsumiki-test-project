/**
 * Task Definition Construct テスト
 *
 * TASK-0014: Task Definition Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-TASKDEF-01: Task Definition リソース作成確認
 * - TC-TASKDEF-02: CPU 設定確認（デフォルト値）
 * - TC-TASKDEF-03: Memory 設定確認（デフォルト値）
 * - TC-TASKDEF-04: Network Mode 確認
 * - TC-TASKDEF-05: App Container 作成確認
 * - TC-TASKDEF-06: Sidecar Container 作成確認
 * - TC-TASKDEF-07: App Container Essential フラグ確認
 * - TC-TASKDEF-08: Sidecar Container Essential フラグ確認
 * - TC-TASKDEF-09: App Container ポートマッピング確認
 * - TC-TASKDEF-10: Logging 設定確認（awslogs ドライバー）
 * - TC-TASKDEF-11: Task Role 参照確認
 * - TC-TASKDEF-12: Execution Role 参照確認
 * - TC-TASKDEF-13: Sidecar TARGET_HOST 環境変数確認
 * - TC-TASKDEF-14: Sidecar TARGET_PORT 環境変数確認
 * - TC-TASKDEF-15: Sidecar MODE 環境変数確認
 * - TC-TASKDEF-16: 公開プロパティ taskDefinition 確認
 * - TC-TASKDEF-17: 公開プロパティ appContainer 確認
 * - TC-TASKDEF-18: 公開プロパティ sidecarContainer 確認
 *
 * 🔵 信頼性: 要件定義書 REQ-014〜018, REQ-035 に基づくテスト
 *
 * @module task-definition-construct.test
 */

import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { TaskDefinitionConstruct } from '../../../lib/construct/ecs/task-definition-construct';

describe('TaskDefinitionConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  // 【環境初期化】: 前のテストの状態が影響しないよう、新しいインスタンスを使用
  let app: cdk.App;
  let stack: cdk.Stack;
  let appRepository: ecr.IRepository;
  let sidecarRepository: ecr.IRepository;
  let logGroup: logs.ILogGroup;

  // 【テスト用定数】: Aurora Endpoint のモック値
  const TEST_AURORA_ENDPOINT = 'aurora.cluster-xxxxxxxxxxxx.ap-northeast-1.rds.amazonaws.com';
  const TEST_AURORA_PORT = 3306;

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

    // 【モックリポジトリ作成】: App Container 用 ECR リポジトリ
    appRepository = ecr.Repository.fromRepositoryName(stack, 'AppRepo', 'app-repository');

    // 【モックリポジトリ作成】: Sidecar Container 用 ECR リポジトリ
    sidecarRepository = ecr.Repository.fromRepositoryName(stack, 'SidecarRepo', 'sidecar-repository');

    // 【モック Log Group 作成】: CloudWatch Logs
    logGroup = logs.LogGroup.fromLogGroupName(stack, 'LogGroup', 'test-log-group');
  });

  afterEach(() => {
    // 【テスト後処理】: 明示的なクリーンアップは不要
    // 【状態復元】: Jest が自動的にテスト間の分離を保証
  });

  // ============================================================================
  // 正常系テストケース
  // ============================================================================

  describe('正常系', () => {
    // ============================================================================
    // TC-TASKDEF-01: Task Definition リソース作成確認
    // 🔵 信頼性: REQ-014 より
    // ============================================================================
    describe('TC-TASKDEF-01: Task Definition リソース作成確認', () => {
      // 【テスト目的】: Task Definition が正しく作成されることを確認
      // 【テスト内容】: TaskDefinitionConstruct をデフォルト設定でインスタンス化し、生成される CloudFormation テンプレートを検証
      // 【期待される動作】: AWS::ECS::TaskDefinition リソースが 1 つ作成される
      // 🔵 信頼性: REQ-014 より

      test('Task Definition が作成されること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: デフォルト設定を使用
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Task Definition リソースの存在確認
        // 【期待値確認】: 1つの Task Definition が作成されること
        template.resourceCountIs('AWS::ECS::TaskDefinition', 1); // 【確認内容】: Task Definition リソースが1つ存在する 🔵
      });
    });

    // ============================================================================
    // TC-TASKDEF-02: CPU 設定確認（デフォルト値）
    // 🔵 信頼性: REQ-014、ユーザヒアリングより
    // ============================================================================
    describe('TC-TASKDEF-02: CPU 設定確認（デフォルト値）', () => {
      // 【テスト目的】: CPU を指定しない場合、デフォルト値 512（0.5 vCPU）が設定されることを確認
      // 【テスト内容】: cpu パラメータを指定しない場合のデフォルト動作を検証
      // 【期待される動作】: Task Definition の Cpu プロパティが '512' に設定される
      // 🔵 信頼性: REQ-014、ユーザヒアリングより

      test('CPU デフォルト値が 512 に設定されること', () => {
        // 【テストデータ準備】: cpu を指定しないで TaskDefinitionConstruct を作成
        // 【初期条件設定】: デフォルト CPU 設定の確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Cpu プロパティの値確認
        // 【期待値確認】: 要件定義書で 0.5 vCPU (512) を指定
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          Cpu: '512', // 【確認内容】: デフォルト CPU が 512 (0.5 vCPU) 🔵
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-03: Memory 設定確認（デフォルト値）
    // 🔵 信頼性: REQ-014、ユーザヒアリングより
    // ============================================================================
    describe('TC-TASKDEF-03: Memory 設定確認（デフォルト値）', () => {
      // 【テスト目的】: Memory を指定しない場合、デフォルト値 1024（1 GB）が設定されることを確認
      // 【テスト内容】: memoryMiB パラメータを指定しない場合のデフォルト動作を検証
      // 【期待される動作】: Task Definition の Memory プロパティが '1024' に設定される
      // 🔵 信頼性: REQ-014、ユーザヒアリングより

      test('Memory デフォルト値が 1024 に設定されること', () => {
        // 【テストデータ準備】: memoryMiB を指定しないで TaskDefinitionConstruct を作成
        // 【初期条件設定】: デフォルト Memory 設定の確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Memory プロパティの値確認
        // 【期待値確認】: 要件定義書で 1 GB (1024 MiB) を指定
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          Memory: '1024', // 【確認内容】: デフォルト Memory が 1024 (1 GB) 🔵
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-04: Network Mode 確認
    // 🔵 信頼性: Fargate 必須要件より
    // ============================================================================
    describe('TC-TASKDEF-04: Network Mode 確認', () => {
      // 【テスト目的】: Fargate Task Definition は必ず awsvpc モードであることを確認
      // 【テスト内容】: Fargate の必須設定を検証
      // 【期待される動作】: Task Definition の NetworkMode プロパティが 'awsvpc' に設定される
      // 🔵 信頼性: Fargate 必須要件より

      test('Network Mode が awsvpc に設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: Fargate の必須設定を確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: NetworkMode プロパティの値確認
        // 【期待値確認】: Fargate は awsvpc モードのみサポート
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          NetworkMode: 'awsvpc', // 【確認内容】: Fargate 必須の awsvpc モード 🔵
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-05: App Container 作成確認
    // 🔵 信頼性: REQ-015 より
    // ============================================================================
    describe('TC-TASKDEF-05: App Container 作成確認', () => {
      // 【テスト目的】: Task Definition に App Container が正しく追加されることを確認
      // 【テスト内容】: ContainerDefinitions 配列に 'app' という名前のコンテナが含まれることを検証
      // 【期待される動作】: ContainerDefinitions に Name: 'app' のコンテナが存在
      // 🔵 信頼性: REQ-015 より

      test('App Container が ContainerDefinitions に含まれること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: App Container の存在を確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ContainerDefinitions に app コンテナが含まれること
        // 【期待値確認】: メインアプリケーションコンテナが必要
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'app', // 【確認内容】: app コンテナが存在する 🔵
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-06: Sidecar Container 作成確認
    // 🔵 信頼性: REQ-015, REQ-016 より
    // ============================================================================
    describe('TC-TASKDEF-06: Sidecar Container 作成確認', () => {
      // 【テスト目的】: Task Definition に Sidecar Container が正しく追加されることを確認
      // 【テスト内容】: ContainerDefinitions 配列に 'sidecar' という名前のコンテナが含まれることを検証
      // 【期待される動作】: ContainerDefinitions に Name: 'sidecar' のコンテナが存在
      // 🔵 信頼性: REQ-015, REQ-016 より

      test('Sidecar Container が ContainerDefinitions に含まれること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: Sidecar Container の存在を確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ContainerDefinitions に sidecar コンテナが含まれること
        // 【期待値確認】: DB 接続用の Sidecar コンテナが必要
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'sidecar', // 【確認内容】: sidecar コンテナが存在する 🔵
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-07: App Container Essential フラグ確認
    // 🔵 信頼性: REQ-015 より
    // ============================================================================
    describe('TC-TASKDEF-07: App Container Essential フラグ確認', () => {
      // 【テスト目的】: App Container がメインコンテナとして設定されることを確認
      // 【テスト内容】: App Container の Essential プロパティが true であることを検証
      // 【期待される動作】: app コンテナの Essential: true
      // 🔵 信頼性: REQ-015 より

      test('App Container の Essential が true であること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: App Container の重要度設定を確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: app コンテナの Essential フラグ確認
        // 【期待値確認】: App Container が停止するとタスク全体を終了すべき
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'app',
              Essential: true, // 【確認内容】: app コンテナは Essential: true 🔵
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-08: Sidecar Container Essential フラグ確認
    // 🔵 信頼性: REQ-016 より
    // ============================================================================
    describe('TC-TASKDEF-08: Sidecar Container Essential フラグ確認', () => {
      // 【テスト目的】: Sidecar Container が補助コンテナとして設定されることを確認
      // 【テスト内容】: Sidecar Container の Essential プロパティが false であることを検証
      // 【期待される動作】: sidecar コンテナの Essential: false
      // 🔵 信頼性: REQ-016 より

      test('Sidecar Container の Essential が false であること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: Sidecar Container の重要度設定を確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: sidecar コンテナの Essential フラグ確認
        // 【期待値確認】: Sidecar Container が停止してもタスクは継続すべき
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'sidecar',
              Essential: false, // 【確認内容】: sidecar コンテナは Essential: false 🔵
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-09: App Container ポートマッピング確認
    // 🔵 信頼性: note.md、設計文書より
    // ============================================================================
    describe('TC-TASKDEF-09: App Container ポートマッピング確認', () => {
      // 【テスト目的】: App Container のコンテナポートが正しく設定されることを確認
      // 【テスト内容】: PortMappings に ContainerPort: 3000（デフォルト）が含まれることを検証
      // 【期待される動作】: PortMappings に ContainerPort: 3000
      // 🔵 信頼性: note.md、設計文書より

      test('App Container のポートマッピングが正しく設定されること', () => {
        // 【テストデータ準備】: appContainerPort を指定しないで TaskDefinitionConstruct を作成
        // 【初期条件設定】: デフォルトポートの確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: PortMappings の ContainerPort 確認
        // 【期待値確認】: デフォルトポートは 3000
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'app',
              PortMappings: Match.arrayWith([
                Match.objectLike({
                  ContainerPort: 3000, // 【確認内容】: app コンテナのデフォルトポートは 3000 🔵
                }),
              ]),
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-10: Logging 設定確認（awslogs ドライバー）
    // 🔵 信頼性: REQ-035 より
    // ============================================================================
    describe('TC-TASKDEF-10: Logging 設定確認（awslogs ドライバー）', () => {
      // 【テスト目的】: コンテナログが CloudWatch Logs に出力される設定になっていることを確認
      // 【テスト内容】: LogConfiguration に awslogs ドライバーが設定されることを検証
      // 【期待される動作】: LogConfiguration.LogDriver: 'awslogs'
      // 🔵 信頼性: REQ-035 より

      test('awslogs ドライバーが設定されること', () => {
        // 【テストデータ準備】: logGroup を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: ログ出力先の Log Group を指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: LogConfiguration の LogDriver 確認
        // 【期待値確認】: CloudWatch Logs へのログ出力が要件
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'app',
              LogConfiguration: Match.objectLike({
                LogDriver: 'awslogs', // 【確認内容】: awslogs ドライバーが設定されている 🔵
              }),
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-11: Task Role 参照確認
    // 🔵 信頼性: REQ-018 より
    // ============================================================================
    describe('TC-TASKDEF-11: Task Role 参照確認', () => {
      // 【テスト目的】: Task Definition に Task Role が関連付けられることを確認
      // 【テスト内容】: TaskRoleArn プロパティが設定されることを検証
      // 【期待される動作】: TaskRoleArn が定義されている
      // 🔵 信頼性: REQ-018 より

      test('TaskRoleArn が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成（自動作成）
        // 【初期条件設定】: Task Role の設定を確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: TaskRoleArn の存在確認
        // 【期待値確認】: ECS Exec、Secrets Manager アクセスに Task Role が必要
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          TaskRoleArn: Match.anyValue(), // 【確認内容】: TaskRoleArn が設定されている 🔵
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-12: Execution Role 参照確認
    // 🔵 信頼性: CDK ベストプラクティスより
    // ============================================================================
    describe('TC-TASKDEF-12: Execution Role 参照確認', () => {
      // 【テスト目的】: Task Definition に Execution Role が関連付けられることを確認
      // 【テスト内容】: ExecutionRoleArn プロパティが設定されることを検証
      // 【期待される動作】: ExecutionRoleArn が定義されている
      // 🔵 信頼性: CDK ベストプラクティスより

      test('ExecutionRoleArn が設定されること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成（自動作成）
        // 【初期条件設定】: Execution Role の設定を確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: ExecutionRoleArn の存在確認
        // 【期待値確認】: ECR Pull、CloudWatch Logs 書き込みに Execution Role が必要
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ExecutionRoleArn: Match.anyValue(), // 【確認内容】: ExecutionRoleArn が設定されている 🔵
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-13: Sidecar TARGET_HOST 環境変数確認
    // 🔵 信頼性: REQ-017、docker/sidecar/entrypoint.sh より
    // ============================================================================
    describe('TC-TASKDEF-13: Sidecar TARGET_HOST 環境変数確認', () => {
      // 【テスト目的】: Sidecar Container が Aurora Endpoint を TARGET_HOST として持つことを確認
      // 【テスト内容】: sidecar コンテナの Environment に TARGET_HOST が含まれることを検証
      // 【期待される動作】: Environment に { Name: 'TARGET_HOST', Value: 'aurora...' }
      // 🔵 信頼性: REQ-017、docker/sidecar/entrypoint.sh より

      test('Sidecar Container に TARGET_HOST 環境変数が設定されること', () => {
        // 【テストデータ準備】: auroraEndpoint を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: Aurora Cluster の Endpoint を指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: sidecar コンテナの Environment に TARGET_HOST が含まれること
        // 【期待値確認】: Sidecar が Aurora に接続するために必要
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'sidecar',
              Environment: Match.arrayWith([
                Match.objectLike({
                  Name: 'TARGET_HOST',
                  Value: TEST_AURORA_ENDPOINT, // 【確認内容】: TARGET_HOST に Aurora Endpoint が設定されている 🔵
                }),
              ]),
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-14: Sidecar TARGET_PORT 環境変数確認
    // 🔵 信頼性: REQ-017、docker/sidecar/entrypoint.sh より
    // ============================================================================
    describe('TC-TASKDEF-14: Sidecar TARGET_PORT 環境変数確認', () => {
      // 【テスト目的】: Sidecar Container が Aurora Port を TARGET_PORT として持つことを確認
      // 【テスト内容】: sidecar コンテナの Environment に TARGET_PORT が含まれることを検証
      // 【期待される動作】: Environment に { Name: 'TARGET_PORT', Value: '3306' }
      // 🔵 信頼性: REQ-017、docker/sidecar/entrypoint.sh より

      test('Sidecar Container に TARGET_PORT 環境変数が設定されること', () => {
        // 【テストデータ準備】: auroraPort を指定（または省略してデフォルト値 3306 を使用）
        // 【初期条件設定】: Aurora の MySQL ポートを指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          auroraPort: TEST_AURORA_PORT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: sidecar コンテナの Environment に TARGET_PORT が含まれること
        // 【期待値確認】: Sidecar が Aurora に接続するために必要
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'sidecar',
              Environment: Match.arrayWith([
                Match.objectLike({
                  Name: 'TARGET_PORT',
                  Value: '3306', // 【確認内容】: TARGET_PORT に Aurora Port が設定されている 🔵
                }),
              ]),
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-15: Sidecar MODE 環境変数確認
    // 🔵 信頼性: REQ-016, REQ-017、docker/sidecar/entrypoint.sh より
    // ============================================================================
    describe('TC-TASKDEF-15: Sidecar MODE 環境変数確認', () => {
      // 【テスト目的】: Sidecar Container の動作モード（proxy/sleep）が設定されることを確認
      // 【テスト内容】: sidecar コンテナの Environment に MODE が含まれることを検証
      // 【期待される動作】: Environment に { Name: 'MODE', Value: 'proxy' }
      // 🔵 信頼性: REQ-016, REQ-017、docker/sidecar/entrypoint.sh より

      test('Sidecar Container に MODE 環境変数が設定されること（デフォルト: proxy）', () => {
        // 【テストデータ準備】: sidecarMode を指定しないで TaskDefinitionConstruct を作成
        // 【初期条件設定】: デフォルトのモード (proxy) を確認
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: sidecar コンテナの Environment に MODE が含まれること
        // 【期待値確認】: デフォルトは proxy モード
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'sidecar',
              Environment: Match.arrayWith([
                Match.objectLike({
                  Name: 'MODE',
                  Value: 'proxy', // 【確認内容】: MODE にデフォルト値 'proxy' が設定されている 🔵
                }),
              ]),
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-16: 公開プロパティ taskDefinition 確認
    // 🔵 信頼性: note.md、設計文書より
    // ============================================================================
    describe('TC-TASKDEF-16: 公開プロパティ taskDefinition 確認', () => {
      // 【テスト目的】: 公開プロパティ taskDefinition が正しく定義されていることを確認
      // 【テスト内容】: Construct の公開プロパティとして taskDefinition が取得できることを検証
      // 【期待される動作】: construct.taskDefinition が undefined でないこと
      // 🔵 信頼性: note.md、設計文書より

      test('taskDefinition プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: Construct の出力プロパティを確認
        const construct = new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });

        // 【結果検証】: taskDefinition プロパティの存在確認
        // 【期待値確認】: ECS Service から参照するために必要
        expect(construct.taskDefinition).toBeDefined(); // 【確認内容】: taskDefinition プロパティが存在する 🔵
      });
    });

    // ============================================================================
    // TC-TASKDEF-17: 公開プロパティ appContainer 確認
    // 🔵 信頼性: note.md、設計文書より
    // ============================================================================
    describe('TC-TASKDEF-17: 公開プロパティ appContainer 確認', () => {
      // 【テスト目的】: 公開プロパティ appContainer が正しく定義されていることを確認
      // 【テスト内容】: Construct の公開プロパティとして appContainer が取得できることを検証
      // 【期待される動作】: construct.appContainer が undefined でないこと
      // 🔵 信頼性: note.md、設計文書より

      test('appContainer プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: Construct の出力プロパティを確認
        const construct = new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });

        // 【結果検証】: appContainer プロパティの存在確認
        // 【期待値確認】: 他の Construct から参照するために必要
        expect(construct.appContainer).toBeDefined(); // 【確認内容】: appContainer プロパティが存在する 🔵
      });
    });

    // ============================================================================
    // TC-TASKDEF-18: 公開プロパティ sidecarContainer 確認
    // 🔵 信頼性: note.md、設計文書より
    // ============================================================================
    describe('TC-TASKDEF-18: 公開プロパティ sidecarContainer 確認', () => {
      // 【テスト目的】: 公開プロパティ sidecarContainer が正しく定義されていることを確認
      // 【テスト内容】: Construct の公開プロパティとして sidecarContainer が取得できることを検証
      // 【期待される動作】: construct.sidecarContainer が undefined でないこと
      // 🔵 信頼性: note.md、設計文書より

      test('sidecarContainer プロパティが定義されていること', () => {
        // 【テストデータ準備】: 必須パラメータで TaskDefinitionConstruct を作成
        // 【初期条件設定】: Construct の出力プロパティを確認
        const construct = new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
        });

        // 【結果検証】: sidecarContainer プロパティの存在確認
        // 【期待値確認】: 他の Construct から参照するために必要
        expect(construct.sidecarContainer).toBeDefined(); // 【確認内容】: sidecarContainer プロパティが存在する 🔵
      });
    });
  });

  // ============================================================================
  // オプションパラメータテストケース
  // ============================================================================

  describe('オプションパラメータ', () => {
    // ============================================================================
    // TC-TASKDEF-19: カスタム CPU 設定確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-TASKDEF-19: カスタム CPU 設定確認', () => {
      // 【テスト目的】: cpu パラメータを指定した場合、その値が設定されることを確認
      // 【テスト内容】: カスタム CPU 値が正しく反映されることを検証
      // 【期待される動作】: Task Definition の Cpu プロパティが指定値に設定される
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('カスタム CPU 値が正しく設定されること', () => {
        // 【テストデータ準備】: cpu: 1024 を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: 1 vCPU を指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          cpu: 1024,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Cpu プロパティの値確認
        // 【期待値確認】: 指定した CPU 値が反映される
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          Cpu: '1024', // 【確認内容】: 指定した CPU 値 1024 が設定されている 🟡
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-20: カスタム Memory 設定確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-TASKDEF-20: カスタム Memory 設定確認', () => {
      // 【テスト目的】: memoryMiB パラメータを指定した場合、その値が設定されることを確認
      // 【テスト内容】: カスタム Memory 値が正しく反映されることを検証
      // 【期待される動作】: Task Definition の Memory プロパティが指定値に設定される
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('カスタム Memory 値が正しく設定されること', () => {
        // 【テストデータ準備】: memoryMiB: 2048 を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: 2 GB を指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          memoryMiB: 2048,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Memory プロパティの値確認
        // 【期待値確認】: 指定した Memory 値が反映される
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          Memory: '2048', // 【確認内容】: 指定した Memory 値 2048 が設定されている 🟡
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-21: カスタムポート設定確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-TASKDEF-21: カスタムポート設定確認', () => {
      // 【テスト目的】: appContainerPort パラメータを指定した場合、ポートマッピングに反映されることを確認
      // 【テスト内容】: カスタム App Container ポートが正しく設定されることを検証
      // 【期待される動作】: PortMappings に指定したポートが含まれる
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('カスタム App Container ポートが正しく設定されること', () => {
        // 【テストデータ準備】: appContainerPort: 8080 を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: カスタムポートを指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          appContainerPort: 8080,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: PortMappings の ContainerPort 確認
        // 【期待値確認】: 指定したポートが反映される
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'app',
              PortMappings: Match.arrayWith([
                Match.objectLike({
                  ContainerPort: 8080, // 【確認内容】: 指定したポート 8080 が設定されている 🟡
                }),
              ]),
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-22: sidecarMode sleep 設定確認
    // 🟡 信頼性: interfaces.ts、docker/sidecar/entrypoint.sh から妥当な推測
    // ============================================================================
    describe('TC-TASKDEF-22: sidecarMode sleep 設定確認', () => {
      // 【テスト目的】: sidecarMode: 'sleep' を指定した場合の動作確認
      // 【テスト内容】: sidecar コンテナの MODE 環境変数が 'sleep' になることを検証
      // 【期待される動作】: Environment に { Name: 'MODE', Value: 'sleep' }
      // 🟡 信頼性: interfaces.ts、docker/sidecar/entrypoint.sh から妥当な推測

      test('sidecarMode が sleep の場合、MODE 環境変数が sleep になること', () => {
        // 【テストデータ準備】: sidecarMode: 'sleep' を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: デバッグ用待機モードを指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          sidecarMode: 'sleep',
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: sidecar コンテナの Environment に MODE: sleep が含まれること
        // 【期待値確認】: 指定したモードが反映される
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'sidecar',
              Environment: Match.arrayWith([
                Match.objectLike({
                  Name: 'MODE',
                  Value: 'sleep', // 【確認内容】: MODE が 'sleep' に設定されている 🟡
                }),
              ]),
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-23: App Container 環境変数設定確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-TASKDEF-23: App Container 環境変数設定確認', () => {
      // 【テスト目的】: appEnvironment パラメータを指定した場合、App Container に反映されることを確認
      // 【テスト内容】: 指定した環境変数が app コンテナに設定されることを検証
      // 【期待される動作】: Environment に指定した環境変数が含まれる
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('appEnvironment で指定した環境変数が設定されること', () => {
        // 【テストデータ準備】: appEnvironment を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: アプリケーション用の環境変数を指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          appEnvironment: {
            NODE_ENV: 'production',
            APP_PORT: '3000',
          },
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: app コンテナの Environment に指定した環境変数が含まれること
        // 【期待値確認】: 指定した環境変数が反映される
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'app',
              Environment: Match.arrayWith([
                Match.objectLike({
                  Name: 'NODE_ENV',
                  Value: 'production', // 【確認内容】: NODE_ENV が 'production' に設定されている 🟡
                }),
              ]),
            }),
          ]),
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-24: 既存 Task Role 使用確認
    // 🟡 信頼性: iam-role-construct.ts から妥当な推測
    // ============================================================================
    describe('TC-TASKDEF-24: 既存 Task Role 使用確認', () => {
      // 【テスト目的】: taskRole パラメータを指定した場合の動作確認
      // 【テスト内容】: 指定した Task Role が使用されることを検証
      // 【期待される動作】: 指定した Task Role の ARN が TaskRoleArn に設定される
      // 🟡 信頼性: iam-role-construct.ts から妥当な推測

      test('既存の Task Role を指定した場合、その Role が使用されること', () => {
        // 【テストデータ準備】: 既存の IAM Role を作成して TaskDefinitionConstruct に渡す
        // 【初期条件設定】: 外部で作成した Task Role を使用
        const existingTaskRole = new iam.Role(stack, 'ExistingTaskRole', {
          assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });

        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          taskRole: existingTaskRole,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: TaskRoleArn が指定した Role を参照していること
        // 【期待値確認】: 指定した Role が使用される
        // Note: CDK は論理 ID にハッシュ接尾辞を追加するため、stringLikeRegexp を使用
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          TaskRoleArn: Match.objectLike({
            'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('^ExistingTaskRole.*')]), // 【確認内容】: 指定した TaskRole が使用されている 🟡
          }),
        });
      });
    });
  });

  // ============================================================================
  // 境界値テストケース
  // ============================================================================

  describe('境界値', () => {
    // ============================================================================
    // TC-TASKDEF-25: CPU 最小値確認（256）
    // 🟡 信頼性: Fargate CPU/Memory 制約より
    // ============================================================================
    describe('TC-TASKDEF-25: CPU 最小値確認（256）', () => {
      // 【テスト目的】: CPU の最小値を使用した場合の動作確認
      // 【テスト内容】: CPU 256 (0.25 vCPU) が正しく設定されることを検証
      // 【期待される動作】: Cpu: '256'
      // 🟡 信頼性: Fargate CPU/Memory 制約より

      test('CPU 最小値（256）が正しく設定されること', () => {
        // 【テストデータ準備】: cpu: 256 を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: Fargate の最小 CPU 値
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          cpu: 256,
          memoryMiB: 512, // 256 CPU に対応する最小メモリ
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Cpu プロパティの値確認
        // 【期待値確認】: 最小 CPU 値でリソースが作成される
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          Cpu: '256', // 【確認内容】: CPU 最小値 256 が設定されている 🟡
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-26: CPU 最大値確認（4096）
    // 🟡 信頼性: Fargate CPU/Memory 制約より
    // ============================================================================
    describe('TC-TASKDEF-26: CPU 最大値確認（4096）', () => {
      // 【テスト目的】: CPU の最大値を使用した場合の動作確認
      // 【テスト内容】: CPU 4096 (4 vCPU) が正しく設定されることを検証
      // 【期待される動作】: Cpu: '4096'
      // 🟡 信頼性: Fargate CPU/Memory 制約より

      test('CPU 最大値（4096）が正しく設定されること', () => {
        // 【テストデータ準備】: cpu: 4096 を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: Fargate の最大 CPU 値
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          cpu: 4096,
          memoryMiB: 8192, // 4096 CPU に対応する最小メモリ
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: Cpu プロパティの値確認
        // 【期待値確認】: 最大 CPU 値でリソースが作成される
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          Cpu: '4096', // 【確認内容】: CPU 最大値 4096 が設定されている 🟡
        });
      });
    });

    // ============================================================================
    // TC-TASKDEF-27: auroraPort カスタム値確認
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ============================================================================
    describe('TC-TASKDEF-27: auroraPort カスタム値確認', () => {
      // 【テスト目的】: auroraPort パラメータを指定した場合の動作確認
      // 【テスト内容】: カスタム Aurora ポートが正しく設定されることを検証
      // 【期待される動作】: TARGET_PORT が指定値に設定される
      // 🟡 信頼性: interfaces.ts から妥当な推測

      test('カスタム Aurora ポートが正しく設定されること', () => {
        // 【テストデータ準備】: auroraPort: 3307 を指定して TaskDefinitionConstruct を作成
        // 【初期条件設定】: MySQL の代替ポートを指定
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          auroraPort: 3307,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: sidecar コンテナの Environment に TARGET_PORT が含まれること
        // 【期待値確認】: カスタムポートが正しく設定される
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
              Name: 'sidecar',
              Environment: Match.arrayWith([
                Match.objectLike({
                  Name: 'TARGET_PORT',
                  Value: '3307', // 【確認内容】: カスタム Aurora ポート 3307 が設定されている 🟡
                }),
              ]),
            }),
          ]),
        });
      });
    });
  });

  // ============================================================================
  // スナップショットテスト
  // ============================================================================

  describe('スナップショット', () => {
    // ============================================================================
    // TC-TASKDEF-28: CloudFormation テンプレートスナップショット確認
    // 🔵 信頼性: 品質保証のため
    // ============================================================================
    describe('TC-TASKDEF-28: CloudFormation テンプレートスナップショット確認', () => {
      // 【テスト目的】: 生成される CloudFormation テンプレートが期待通りであることを確認
      // 【テスト内容】: テンプレートの意図しない変更を検出
      // 【期待される動作】: スナップショットと一致すること
      // 🔵 信頼性: 品質保証のため

      test('CloudFormation テンプレートがスナップショットと一致すること', () => {
        // 【テストデータ準備】: 固定の設定で TaskDefinitionConstruct を作成
        // 【初期条件設定】: 一貫したテスト条件
        new TaskDefinitionConstruct(stack, 'TestTaskDef', {
          appRepository,
          sidecarRepository,
          logGroup,
          auroraEndpoint: TEST_AURORA_ENDPOINT,
          auroraPort: TEST_AURORA_PORT,
        });
        const template = Template.fromStack(stack);

        // 【結果検証】: スナップショットとの一致確認
        // 【期待値確認】: 意図しない変更の検出
        expect(template.toJSON()).toMatchSnapshot(); // 【確認内容】: CloudFormation テンプレートがスナップショットと一致する 🔵
      });
    });
  });
});
