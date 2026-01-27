/**
 * Task Definition Construct 実装
 *
 * TASK-0014: Task Definition Construct 実装
 * フェーズ: TDD Refactor Phase - コード品質改善
 *
 * 【機能概要】: ECS Fargate Task Definition を作成する CDK Construct
 * 【実装方針】: App Container + Sidecar Container のマルチコンテナ構成（Sidecar Pattern）
 * 【テスト対応】: TC-TASKDEF-01 〜 TC-TASKDEF-28 の全28テストケースに対応
 *
 * 構成内容:
 * - Task Definition: Fargate Task Definition (REQ-014)
 * - App Container: メインアプリケーションコンテナ (REQ-015)
 * - Sidecar Container: プロキシ/デバッグ用コンテナ (REQ-015, REQ-016, REQ-017)
 * - Task Role: ECS Exec 用 (REQ-018)
 * - CloudWatch Logs: awslogs ドライバー (REQ-035)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-014〜018, REQ-035 に基づく実装
 *
 * @module ecs/task-definition-construct
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: Task Definition 構成のデフォルト値
// 🔵 信頼性: REQ-014, REQ-017 より
// ============================================================================

/** デフォルト CPU: 512 (0.5 vCPU) 🔵 REQ-014 */
const DEFAULT_CPU = 512;

/** デフォルト Memory: 1024 MiB (1 GB) 🔵 REQ-014 */
const DEFAULT_MEMORY_MIB = 1024;

/** デフォルト App Container ポート: 3000 🔵 note.md */
const DEFAULT_APP_CONTAINER_PORT = 3000;

/** デフォルト Aurora ポート: 3306 🔵 REQ-017 */
const DEFAULT_AURORA_PORT = 3306;

/** デフォルト Sidecar モード: 'proxy' 🔵 REQ-016, REQ-017 */
const DEFAULT_SIDECAR_MODE = 'proxy';

/** App Container 名: 'app' 🔵 TC-TASKDEF-05 */
const APP_CONTAINER_NAME = 'app';

/** Sidecar Container 名: 'sidecar' 🔵 TC-TASKDEF-06 */
const SIDECAR_CONTAINER_NAME = 'sidecar';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * TaskDefinitionConstruct の Props インターフェース
 *
 * 【設計方針】: 必須パラメータ + オプショナルパラメータ（デフォルト値提供）
 * 【再利用性】: 異なる環境（開発/ステージング/本番）で柔軟に設定可能
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface TaskDefinitionConstructProps
 */
export interface TaskDefinitionConstructProps {
  /**
   * App Container イメージの ECR リポジトリ (必須)
   * 🔵 信頼性: REQ-015 より
   */
  readonly appRepository: ecr.IRepository;

  /**
   * Sidecar Container イメージの ECR リポジトリ (必須)
   * 🔵 信頼性: REQ-015, REQ-016 より
   */
  readonly sidecarRepository: ecr.IRepository;

  /**
   * CloudWatch Logs Log Group (必須)
   * 🔵 信頼性: REQ-035 より
   */
  readonly logGroup: logs.ILogGroup;

  /**
   * Aurora Cluster Endpoint (必須) - Sidecar の TARGET_HOST
   * 🔵 信頼性: REQ-017 より
   */
  readonly auroraEndpoint: string;

  /**
   * Aurora Port - Sidecar の TARGET_PORT
   * @default 3306 🔵 REQ-017
   */
  readonly auroraPort?: number;

  /**
   * Task Role (オプション)
   * @default 自動作成 🔵 REQ-018
   */
  readonly taskRole?: iam.IRole;

  /**
   * Execution Role (オプション)
   * @default 自動作成 🔵 CDK ベストプラクティス
   */
  readonly executionRole?: iam.IRole;

  /**
   * CPU (vCPU 単位)
   * @default 512 (0.5 vCPU) 🔵 REQ-014
   */
  readonly cpu?: 256 | 512 | 1024 | 2048 | 4096;

  /**
   * Memory (MiB 単位)
   * @default 1024 (1 GB) 🔵 REQ-014
   */
  readonly memoryMiB?: number;

  /**
   * App Container のポート
   * @default 3000 🔵 note.md
   */
  readonly appContainerPort?: number;

  /**
   * App Container の環境変数
   * 🟡 信頼性: interfaces.ts から妥当な推測
   */
  readonly appEnvironment?: Record<string, string>;

  /**
   * Sidecar の動作モード ('proxy' | 'sleep')
   * @default 'proxy' 🔵 REQ-016, REQ-017
   */
  readonly sidecarMode?: 'proxy' | 'sleep';
}

/**
 * Task Definition Construct
 *
 * 【機能概要】: ECS Fargate Task Definition を作成する Construct
 * 【実装方針】: App Container + Sidecar Container のマルチコンテナ構成
 *
 * アーキテクチャ位置づけ:
 * ```
 * VPC Stack → Security Stack → Application Stack
 *                               ↓
 *                           ECS Cluster → Task Definition → Service
 *                                         ↑
 *                                         本 Construct
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class TaskDefinitionConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * const taskDef = new TaskDefinitionConstruct(stack, 'TaskDef', {
 *   appRepository: appEcrRepository,
 *   sidecarRepository: sidecarEcrRepository,
 *   logGroup: cloudWatchLogGroup,
 *   auroraEndpoint: auroraCluster.clusterEndpoint.hostname,
 * });
 * ```
 */
export class TaskDefinitionConstruct extends Construct {
  /** Task Definition 🔵 note.md */
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  /** App Container Definition 🔵 note.md */
  public readonly appContainer: ecs.ContainerDefinition;

  /** Sidecar Container Definition 🔵 note.md */
  public readonly sidecarContainer: ecs.ContainerDefinition;

  /**
   * TaskDefinitionConstruct のコンストラクタ
   *
   * @param scope - 親となる Construct
   * @param id - この Construct の識別子
   * @param props - Task Definition 設定
   */
  constructor(scope: Construct, id: string, props: TaskDefinitionConstructProps) {
    super(scope, id);

    // 【パラメータ解凍】: デフォルト値を適用 🔵 REQ-014, REQ-017
    const cpu = props.cpu ?? DEFAULT_CPU;
    const memoryMiB = props.memoryMiB ?? DEFAULT_MEMORY_MIB;
    const appContainerPort = props.appContainerPort ?? DEFAULT_APP_CONTAINER_PORT;
    const auroraPort = props.auroraPort ?? DEFAULT_AURORA_PORT;
    const sidecarMode = props.sidecarMode ?? DEFAULT_SIDECAR_MODE;

    // 【Task Role 作成/取得】🔵 REQ-018
    const taskRole = props.taskRole ?? this.createTaskRole();

    // 【Task Definition 作成】🔵 REQ-014
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: cpu,
      memoryLimitMiB: memoryMiB,
      taskRole: taskRole,
      executionRole: props.executionRole,
    });

    // 【ログ設定作成】🔵 REQ-035
    const appLogDriver = new ecs.AwsLogDriver({
      logGroup: props.logGroup,
      streamPrefix: 'app',
    });

    const sidecarLogDriver = new ecs.AwsLogDriver({
      logGroup: props.logGroup,
      streamPrefix: 'sidecar',
    });

    // 【App Container 環境変数】🟡 interfaces.ts
    const appEnvironment: Record<string, string> = props.appEnvironment ?? {};

    // 【App Container 作成】: メインアプリケーション 🔵 REQ-015
    this.appContainer = this.taskDefinition.addContainer(APP_CONTAINER_NAME, {
      image: ecs.ContainerImage.fromEcrRepository(props.appRepository),
      essential: true,
      logging: appLogDriver,
      environment: appEnvironment,
      portMappings: [{ containerPort: appContainerPort }],
    });

    // 【Sidecar Container 作成】: プロキシ/デバッグ用 🔵 REQ-015, REQ-016, REQ-017
    this.sidecarContainer = this.taskDefinition.addContainer(SIDECAR_CONTAINER_NAME, {
      image: ecs.ContainerImage.fromEcrRepository(props.sidecarRepository),
      essential: false,
      logging: sidecarLogDriver,
      environment: {
        TARGET_HOST: props.auroraEndpoint,
        TARGET_PORT: auroraPort.toString(),
        MODE: sidecarMode,
      },
    });
  }

  /**
   * 【Task Role 作成】: ECS Exec 用の Task Role を作成
   *
   * 最小権限の原則に基づき、AmazonSSMManagedInstanceCore のみ付与
   * 🔵 信頼性: REQ-018 より
   *
   * @private
   * @returns 作成された Task Role
   */
  private createTaskRole(): iam.IRole {
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Task Role for ECS Fargate Task Definition',
    });

    // ECS Exec 用ポリシー 🔵 REQ-018
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
    );

    return taskRole;
  }
}
