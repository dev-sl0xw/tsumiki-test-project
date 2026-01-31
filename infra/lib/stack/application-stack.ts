/**
 * Application Stack 実装
 *
 * TASK-0017: Application Stack 統合
 * フェーズ: TDD Refactor Phase - 品質改善とリファクタリング完了
 *
 * 【機能概要】: ECS Cluster、Task Definition、Service、ALB を統合した Application Stack を作成する
 * 【実装方針】: 既存の Construct を使用し、他の Stack から参照可能なプロパティを公開
 * 【セキュリティ】: HTTPS 強制、Private Subnet 配置によるセキュアな構成
 * 【テスト対応】: TC-AS-01 〜 TC-AS-36 の全テストケースに対応
 * 【リファクタ内容】: 定数定義の追加、型定義の改善、フェーズ名更新
 * 🔵 信頼性レベル: 要件定義書 REQ-012 〜 REQ-021、REQ-028 〜 REQ-030 に基づく実装
 *
 * 構成内容:
 * - ECS Cluster (REQ-012)
 * - Container Insights 有効化 (REQ-013)
 * - Task Definition (Frontend + Backend) (REQ-014〜018)
 * - ECS Service (Frontend + Backend) (REQ-019〜021)
 * - ALB with HTTPS (REQ-028〜030)
 *
 * @module ApplicationStack
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../parameter';
import { EcsClusterConstruct } from '../construct/ecs/ecs-cluster-construct';
import { TaskDefinitionConstruct } from '../construct/ecs/task-definition-construct';
import { EcsServiceConstruct } from '../construct/ecs/ecs-service-construct';
import { AlbConstruct } from '../construct/alb/alb-construct';

// ============================================================================
// 【型定義】
// 🔵 信頼性: AWS Fargate Task Definition 仕様より
// ============================================================================

/**
 * Fargate Task Definition で使用可能な CPU 値
 *
 * 【用途】: TaskDefinitionConstruct の cpu パラメータの型安全な指定
 * 【値】: 256 (0.25 vCPU), 512 (0.5 vCPU), 1024 (1 vCPU), 2048 (2 vCPU), 4096 (4 vCPU)
 * 🔵 信頼性: AWS Fargate Task Definition 仕様より
 */
type FargateCpuValue = 256 | 512 | 1024 | 2048 | 4096;

// ============================================================================
// 【定数定義】
// 🔵 信頼性: アーキテクチャ設計・AWS ベストプラクティスより
// ============================================================================

/**
 * Frontend コンテナのポート番号
 *
 * 【値】: 80 (HTTP)
 * 【用途】: Frontend Service のコンテナポートおよび Target Group のターゲットポート
 * 🔵 信頼性: アーキテクチャ設計より
 */
const FRONTEND_CONTAINER_PORT = 80;

/**
 * Backend コンテナのポート番号
 *
 * 【値】: 8080
 * 【用途】: Backend Service のコンテナポート（内部 API）
 * 🔵 信頼性: アーキテクチャ設計より
 */
const BACKEND_CONTAINER_PORT = 8080;

/**
 * ヘルスチェックパス
 *
 * 【値】: '/health'
 * 【用途】: ALB Target Group のヘルスチェックエンドポイント
 * 🔵 信頼性: アーキテクチャ設計・ヘルスチェックベストプラクティスより
 */
const HEALTH_CHECK_PATH = '/health';

/**
 * Sidecar コンテナのモード
 *
 * 【値】: 'proxy'
 * 【用途】: TaskDefinitionConstruct に渡す Sidecar の動作モード
 * 🔵 信頼性: TASK-0013 Sidecar Container 設計より
 */
const SIDECAR_MODE = 'proxy';

// ============================================================================
// 【インターフェース定義】
// 🔵 信頼性: タスク定義書・設計文書より
// ============================================================================

/**
 * ApplicationStack の Props インターフェース
 *
 * 【設計方針】: VPC、Security Group、IAM Role、ECR Repository、EnvironmentConfig を
 *              必須パラメータとして受け取り、Stack の設定を行う
 * 【再利用性】: 異なる環境（Dev/Prod）で柔軟に設定可能
 * 🔵 信頼性: タスク定義書 TASK-0017 より
 *
 * @interface ApplicationStackProps
 * @extends cdk.StackProps
 */
export interface ApplicationStackProps extends cdk.StackProps {
  /**
   * VPC への参照（必須）
   *
   * 【用途】: ECS Service、ALB を VPC 内に配置するために必要
   * 【ECS 配置先】: Private App Subnet
   * 【ALB 配置先】: Public Subnet
   * 🔵 信頼性: REQ-028、architecture.md より必須パラメータ
   */
  readonly vpc: ec2.IVpc;

  /**
   * ECS 用 Security Group（必須）
   *
   * 【用途】: ECS Service のネットワークアクセス制御
   * 【設定内容】: ALB からのトラフィックのみ許可
   * 🔵 信頼性: architecture.md より必須パラメータ
   */
  readonly ecsSecurityGroup: ec2.ISecurityGroup;

  /**
   * ALB 用 Security Group（必須）
   *
   * 【用途】: ALB のネットワークアクセス制御
   * 【設定内容】: インターネットからの HTTP/HTTPS トラフィック許可
   * 🔵 信頼性: architecture.md より必須パラメータ
   */
  readonly albSecurityGroup: ec2.ISecurityGroup;

  /**
   * ECS Task Role（必須）
   *
   * 【用途】: ECS タスクが AWS サービスにアクセスするための IAM Role
   * 【必要権限】: SSM (ECS Exec)、S3、その他アプリ必要権限
   * 🔵 信頼性: REQ-019 (ECS Exec)、architecture.md より必須パラメータ
   */
  readonly ecsTaskRole: iam.IRole;

  /**
   * ECS Task Execution Role（必須）
   *
   * 【用途】: ECS Agent がタスクを起動するための IAM Role
   * 【必要権限】: ECR Pull、CloudWatch Logs、Secrets Manager
   * 🔵 信頼性: architecture.md より必須パラメータ
   */
  readonly ecsTaskExecutionRole: iam.IRole;

  /**
   * DB エンドポイント（必須）
   *
   * 【用途】: Aurora クラスターの Writer エンドポイント
   * 【参照元】: DatabaseStack.dbEndpoint
   * 🔵 信頼性: architecture.md Stack 依存関係より
   */
  readonly dbEndpoint: string;

  /**
   * DB ポート（必須）
   *
   * 【用途】: Aurora クラスターの接続ポート (3306)
   * 【参照元】: DatabaseStack.dbPort
   * 🔵 信頼性: architecture.md Stack 依存関係より
   */
  readonly dbPort: number;

  /**
   * App Container 用 ECR Repository（必須）
   *
   * 【用途】: アプリケーションコンテナイメージの格納先
   * 🔵 信頼性: TASK-0014 Task Definition 要件より
   */
  readonly appRepository: ecr.IRepository;

  /**
   * Sidecar Container 用 ECR Repository（必須）
   *
   * 【用途】: Sidecar コンテナイメージの格納先
   * 🔵 信頼性: TASK-0014 Task Definition 要件より
   */
  readonly sidecarRepository: ecr.IRepository;

  /**
   * CloudWatch Logs Log Group（必須）
   *
   * 【用途】: ECS タスクのログ出力先
   * 🔵 信頼性: TASK-0014 Task Definition 要件より
   */
  readonly logGroup: logs.ILogGroup;

  /**
   * ACM 証明書 ARN（必須）
   *
   * 【用途】: ALB HTTPS Listener の TLS 終端
   * 🔵 信頼性: REQ-030 より必須パラメータ
   */
  readonly certificateArn: string;

  /**
   * 環境設定（必須）
   *
   * 【用途】: 環境名、タスク設定などを提供
   * 【設定項目】: envName、taskCpu、taskMemory、desiredCount
   * 🔵 信頼性: タスク定義書より必須パラメータ
   */
  readonly config: EnvironmentConfig;
}

/**
 * Application Stack
 *
 * 【機能概要】: ECS Cluster、Task Definition、Service、ALB を統合した CDK Stack
 * 【実装方針】: 既存の Construct を使用し、他の Stack から参照可能なプロパティを公開
 * 【テスト対応】: TC-AS-01 〜 TC-AS-36 の全テストケースに対応
 *
 * 構成内容:
 * - ECS Cluster with Container Insights (REQ-012, REQ-013)
 * - Frontend Task Definition with Sidecar (REQ-014〜018)
 * - Backend Task Definition with Sidecar (REQ-014〜018)
 * - Frontend ECS Service with ECS Exec (REQ-019〜021)
 * - Backend ECS Service with ECS Exec (REQ-019〜021)
 * - Internet-facing ALB with HTTPS (REQ-028〜030)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-012〜021、REQ-028〜030 に基づく実装
 *
 * @class ApplicationStack
 * @extends cdk.Stack
 *
 * @example
 * ```typescript
 * const applicationStack = new ApplicationStack(app, 'ApplicationStack', {
 *   vpc: vpcStack.vpc,
 *   ecsSecurityGroup: securityStack.ecsSecurityGroup,
 *   albSecurityGroup: securityStack.albSecurityGroup,
 *   ecsTaskRole: securityStack.ecsTaskRole,
 *   ecsTaskExecutionRole: securityStack.ecsTaskExecutionRole,
 *   dbEndpoint: databaseStack.dbEndpoint,
 *   dbPort: databaseStack.dbPort,
 *   appRepository: appRepo,
 *   sidecarRepository: sidecarRepo,
 *   logGroup: logGroup,
 *   certificateArn: 'arn:aws:acm:...',
 *   config: devConfig,
 *   env: {
 *     account: config.account,
 *     region: config.region,
 *   },
 * });
 * ```
 */
export class ApplicationStack extends cdk.Stack {
  // ==========================================================================
  // 【公開プロパティ】: 他の Stack から参照可能なリソース
  // 【設計方針】: インターフェース型を使用して柔軟性を確保
  // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
  // ==========================================================================

  /**
   * ECS Cluster
   *
   * 【用途】: 作成された ECS クラスターへの参照
   * 【参照元】: 監視設定、Auto Scaling
   * 🔵 信頼性: タスク定義書 TASK-0017、note.md 公開プロパティより
   *
   * @readonly
   * @type {ecs.ICluster}
   */
  public readonly cluster: ecs.ICluster;

  /**
   * Frontend Task Definition
   *
   * 【用途】: Frontend Service 用の Task Definition
   * 【参照元】: Service 設定、監視設定
   * 🔵 信頼性: タスク定義書 TASK-0017、note.md 公開プロパティより
   *
   * @readonly
   * @type {ecs.FargateTaskDefinition}
   */
  public readonly frontendTaskDefinition: ecs.FargateTaskDefinition;

  /**
   * Backend Task Definition
   *
   * 【用途】: Backend Service 用の Task Definition
   * 【参照元】: Service 設定、監視設定
   * 🔵 信頼性: タスク定義書 TASK-0017、note.md 公開プロパティより
   *
   * @readonly
   * @type {ecs.FargateTaskDefinition}
   */
  public readonly backendTaskDefinition: ecs.FargateTaskDefinition;

  /**
   * Frontend ECS Service
   *
   * 【用途】: Frontend Fargate Service への参照
   * 【参照元】: Auto Scaling、監視設定
   * 🔵 信頼性: タスク定義書 TASK-0017、note.md 公開プロパティより
   *
   * @readonly
   * @type {ecs.FargateService}
   */
  public readonly frontendService: ecs.FargateService;

  /**
   * Backend ECS Service
   *
   * 【用途】: Backend Fargate Service への参照
   * 【参照元】: Auto Scaling、監視設定
   * 🔵 信頼性: タスク定義書 TASK-0017、note.md 公開プロパティより
   *
   * @readonly
   * @type {ecs.FargateService}
   */
  public readonly backendService: ecs.FargateService;

  /**
   * Application Load Balancer
   *
   * 【用途】: Internet-facing ALB への参照
   * 【参照元】: Route 53、WAF、監視設定
   * 🔵 信頼性: タスク定義書 TASK-0017、note.md 公開プロパティより
   *
   * @readonly
   * @type {elb.IApplicationLoadBalancer}
   */
  public readonly loadBalancer: elb.IApplicationLoadBalancer;

  /**
   * ALB Target Group
   *
   * 【用途】: ALB の Target Group への参照
   * 【参照元】: Auto Scaling、監視設定
   * 🔵 信頼性: タスク定義書 TASK-0017、note.md 公開プロパティより
   *
   * @readonly
   * @type {elb.IApplicationTargetGroup}
   */
  public readonly targetGroup: elb.IApplicationTargetGroup;

  /**
   * ALB DNS Name
   *
   * 【用途】: ALB の DNS 名
   * 【参照元】: Route 53 CNAME、CloudFront Origin
   * 🔵 信頼性: タスク定義書 TASK-0017、note.md 公開プロパティより
   *
   * @readonly
   * @type {string}
   */
  public readonly dnsName: string;

  /**
   * ApplicationStack のコンストラクタ
   *
   * 【処理概要】: ECS Cluster、Task Definition、Service、ALB Construct を作成し、
   *              プロパティを公開、CfnOutput を生成
   * 【設計方針】: 既存 Construct を組み合わせて Stack を構成
   *
   * @param {Construct} scope - 親となる Construct (通常は App)
   * @param {string} id - この Stack の識別子
   * @param {ApplicationStackProps} props - ApplicationStack の Props
   */
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    // ========================================================================
    // 【ECS Cluster 作成】: Fargate 専用 ECS クラスターを作成
    // 【設定】: Container Insights 有効化
    // 🔵 信頼性: REQ-012、REQ-013 より
    // ========================================================================
    const ecsCluster = new EcsClusterConstruct(this, 'EcsCluster', {
      vpc: props.vpc,
      clusterName: `${props.config.envName}-cluster`,
      containerInsights: true,
    });

    this.cluster = ecsCluster.cluster;

    // ========================================================================
    // 【Frontend Task Definition 作成】: App + Sidecar コンテナ構成
    // 【設定】: CPU 0.5 vCPU、Memory 1 GB
    // 🔵 信頼性: REQ-014〜018 より
    // ========================================================================
    // 【CPU 値の型安全な変換】🔵 AWS Fargate 仕様より
    const taskCpu = props.config.taskCpu as FargateCpuValue;

    const frontendTaskDefinition = new TaskDefinitionConstruct(this, 'FrontendTaskDefinition', {
      appRepository: props.appRepository,
      sidecarRepository: props.sidecarRepository,
      logGroup: props.logGroup,
      auroraEndpoint: props.dbEndpoint,
      auroraPort: props.dbPort,
      taskRole: props.ecsTaskRole,
      executionRole: props.ecsTaskExecutionRole,
      cpu: taskCpu,
      memoryMiB: props.config.taskMemory,
      appContainerPort: FRONTEND_CONTAINER_PORT,
      sidecarMode: SIDECAR_MODE,
    });

    this.frontendTaskDefinition = frontendTaskDefinition.taskDefinition;

    // ========================================================================
    // 【Backend Task Definition 作成】: App + Sidecar コンテナ構成
    // 【設定】: CPU 0.5 vCPU、Memory 1 GB
    // 🔵 信頼性: REQ-014〜018 より
    // ========================================================================
    const backendTaskDefinition = new TaskDefinitionConstruct(this, 'BackendTaskDefinition', {
      appRepository: props.appRepository,
      sidecarRepository: props.sidecarRepository,
      logGroup: props.logGroup,
      auroraEndpoint: props.dbEndpoint,
      auroraPort: props.dbPort,
      taskRole: props.ecsTaskRole,
      executionRole: props.ecsTaskExecutionRole,
      cpu: taskCpu,
      memoryMiB: props.config.taskMemory,
      appContainerPort: BACKEND_CONTAINER_PORT,
      sidecarMode: SIDECAR_MODE,
    });

    this.backendTaskDefinition = backendTaskDefinition.taskDefinition;

    // ========================================================================
    // 【ALB 作成】: Internet-facing ALB with HTTPS
    // 【設定】: HTTP→HTTPS リダイレクト、ACM 証明書 TLS 終端
    // 🔵 信頼性: REQ-028〜030 より
    // ========================================================================
    const alb = new AlbConstruct(this, 'Alb', {
      vpc: props.vpc,
      securityGroup: props.albSecurityGroup,
      certificateArn: props.certificateArn,
      loadBalancerName: `${props.config.envName}-alb`,
      targetPort: FRONTEND_CONTAINER_PORT,
      healthCheckPath: HEALTH_CHECK_PATH,
      enableHttpToHttpsRedirect: true,
      internetFacing: true,
    });

    this.loadBalancer = alb.loadBalancer;
    this.targetGroup = alb.targetGroup;
    this.dnsName = alb.dnsName;

    // ========================================================================
    // 【Frontend ECS Service 作成】: Fargate Service with ECS Exec
    // 【設定】: Desired Count 2 以上、Private Subnet 配置、ALB Target Group 連携
    // 🔵 信頼性: REQ-019〜021 より
    // ========================================================================
    const frontendService = new EcsServiceConstruct(this, 'FrontendService', {
      cluster: ecsCluster.cluster,
      taskDefinition: frontendTaskDefinition.taskDefinition,
      securityGroup: props.ecsSecurityGroup,
      subnets: props.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }),
      serviceName: `${props.config.envName}-frontend-service`,
      desiredCount: props.config.desiredCount,
      enableExecuteCommand: true,
      targetGroup: alb.targetGroup,
      assignPublicIp: false,
      containerPort: FRONTEND_CONTAINER_PORT,
    });

    this.frontendService = frontendService.service;

    // ========================================================================
    // 【Backend ECS Service 作成】: Fargate Service with ECS Exec
    // 【設定】: Desired Count 2 以上、Private Subnet 配置
    // 🔵 信頼性: REQ-019〜021 より
    // ========================================================================
    const backendService = new EcsServiceConstruct(this, 'BackendService', {
      cluster: ecsCluster.cluster,
      taskDefinition: backendTaskDefinition.taskDefinition,
      securityGroup: props.ecsSecurityGroup,
      subnets: props.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }),
      serviceName: `${props.config.envName}-backend-service`,
      desiredCount: props.config.desiredCount,
      enableExecuteCommand: true,
      assignPublicIp: false,
      containerPort: BACKEND_CONTAINER_PORT,
    });

    this.backendService = backendService.service;

    // ========================================================================
    // 【CfnOutput 生成】: クロススタック参照用エクスポートを作成
    // 【用途】: 他の Stack からの参照、CloudFormation Outputs 確認
    // 🔵 信頼性: CDK ベストプラクティスより
    // ========================================================================

    // 【ALB DNS Name エクスポート】
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: this.dnsName,
      description: 'ALB DNS name',
      exportName: `${props.config.envName}-AlbDnsName`,
    });

    // 【ALB ARN エクスポート】
    new cdk.CfnOutput(this, 'AlbArn', {
      value: this.loadBalancer.loadBalancerArn,
      description: 'ALB ARN',
      exportName: `${props.config.envName}-AlbArn`,
    });

    // 【ECS Cluster ARN エクスポート】
    new cdk.CfnOutput(this, 'EcsClusterArn', {
      value: this.cluster.clusterArn,
      description: 'ECS Cluster ARN',
      exportName: `${props.config.envName}-EcsClusterArn`,
    });

    // 【Frontend Service ARN エクスポート】
    new cdk.CfnOutput(this, 'FrontendServiceArn', {
      value: this.frontendService.serviceArn,
      description: 'Frontend ECS Service ARN',
      exportName: `${props.config.envName}-FrontendServiceArn`,
    });

    // 【Backend Service ARN エクスポート】
    new cdk.CfnOutput(this, 'BackendServiceArn', {
      value: this.backendService.serviceArn,
      description: 'Backend ECS Service ARN',
      exportName: `${props.config.envName}-BackendServiceArn`,
    });

    // 【Target Group ARN エクスポート】
    new cdk.CfnOutput(this, 'TargetGroupArn', {
      value: this.targetGroup.targetGroupArn,
      description: 'ALB Target Group ARN',
      exportName: `${props.config.envName}-TargetGroupArn`,
    });
  }
}
