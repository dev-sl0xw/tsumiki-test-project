/**
 * ECS Service Construct 実装
 *
 * TASK-0015: ECS Service Construct 実装
 * フェーズ: TDD Refactor Phase - コード品質改善
 *
 * 【機能概要】: ECS Fargate Service を作成する CDK Construct
 * 【実装方針】: Frontend/Backend 両対応の汎用 Service Construct
 * 【テスト対応】: TC-SERVICE-01 〜 TC-SERVICE-19 の全19テストケースに対応
 * 【リファクタ内容】: JSDoc強化、使用例の追加、コメント品質向上
 *
 * 構成内容:
 * - ECS Service: Fargate Launch Type (REQ-019)
 * - ECS Exec: デフォルト有効化 (REQ-019)
 * - 高可用性: Desired Count 2 以上 (REQ-020)
 * - ネットワーク: awsvpc モード、Private Subnet (REQ-021)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-019〜021 に基づく実装
 *
 * @module ecs/ecs-service-construct
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: ECS Service 構成のデフォルト値
// 🔵 信頼性: REQ-019, REQ-020, REQ-021 より
// ============================================================================

/**
 * 【デフォルト Desired Count】: 高可用性のためのタスク数
 *
 * 【設定値】: 2
 * 【根拠】: REQ-020, NFR-004 により Multi-AZ 配置で高可用性を確保
 *
 * 🔵 信頼性: REQ-020, NFR-004 より
 */
const DEFAULT_DESIRED_COUNT = 2;

/**
 * 【デフォルト ECS Exec 有効化】: コンテナ接続機能
 *
 * 【設定値】: true（有効）
 * 【根拠】: REQ-019 により運用・デバッグ目的でのコンテナアクセスが必要
 *
 * 🔵 信頼性: REQ-019 より
 */
const DEFAULT_ENABLE_EXECUTE_COMMAND = true;

/**
 * 【デフォルト Minimum Healthy Percent】: Rolling Update 時の最小タスク維持率
 *
 * 【設定値】: 50%
 * 【根拠】: デプロイ中のサービス可用性を維持しつつ、リソース効率を考慮
 *
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_MIN_HEALTHY_PERCENT = 50;

/**
 * 【デフォルト Maximum Percent】: Rolling Update 時の最大タスク許可率
 *
 * 【設定値】: 200%
 * 【根拠】: Blue-Green 風デプロイのため、新旧タスクの同時起動を許可
 *
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_MAX_PERCENT = 200;

/**
 * 【デフォルト Public IP 割り当て】: セキュリティ設定
 *
 * 【設定値】: false（無効）
 * 【根拠】: Private Subnet 配置のため、Public IP は不要
 *
 * 🔵 信頼性: architecture.md より
 */
const DEFAULT_ASSIGN_PUBLIC_IP = false;

/**
 * 【App Container 名】: ALB 連携時のターゲットコンテナ名
 *
 * 【設定値】: 'app'
 * 【根拠】: TaskDefinitionConstruct と整合性を取る
 * 【補足】: attachToApplicationTargetGroup() 使用時、CDK が TaskDefinition から
 *          最初の essential=true コンテナを自動検出するため、
 *          現在の実装では明示的に使用していない。将来の拡張用に保持。
 *
 * 🔵 信頼性: TC-SERVICE-12 より
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const APP_CONTAINER_NAME = 'app';

/**
 * 【デフォルト Container Port】: ALB 連携時のターゲットポート
 *
 * 【設定値】: 3000
 * 【根拠】: note.md で指定されたデフォルトポート
 *
 * 🔵 信頼性: note.md より
 */
const DEFAULT_CONTAINER_PORT = 3000;

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * EcsServiceConstruct の Props インターフェース
 *
 * 【設計方針】: 必須パラメータ + オプショナルパラメータ（デフォルト値提供）
 * 【再利用性】: Frontend/Backend 両サービスに対応
 * 【改善内容】: JSDoc強化、各プロパティの使用例追加
 *
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface EcsServiceConstructProps
 */
export interface EcsServiceConstructProps {
  /**
   * ECS Cluster (必須)
   *
   * 【用途】: Service を配置する Cluster
   * 【参照元】: EcsClusterConstruct.cluster プロパティから取得
   *
   * 🔵 信頼性: REQ-019〜021 より
   *
   * @type {ecs.ICluster}
   * @example
   * ```typescript
   * const service = new EcsServiceConstruct(stack, 'Service', {
   *   cluster: ecsClusterConstruct.cluster,
   *   // ...
   * });
   * ```
   */
  readonly cluster: ecs.ICluster;

  /**
   * Fargate Task Definition (必須)
   *
   * 【用途】: Service が使用する Task Definition
   * 【参照元】: TaskDefinitionConstruct.taskDefinition プロパティから取得
   * 【制約】: ECS Exec を使用する場合、Task Role に AmazonSSMManagedInstanceCore が必要
   *
   * 🔵 信頼性: REQ-019〜021 より
   *
   * @type {ecs.FargateTaskDefinition}
   */
  readonly taskDefinition: ecs.FargateTaskDefinition;

  /**
   * Security Group (必須)
   *
   * 【用途】: Service のネットワークセキュリティ設定
   * 【制約】: 最小権限の原則に基づき、必要なポートのみ許可
   * 【推奨】: ALB Security Group からのインバウンドのみ許可
   *
   * 🔵 信頼性: architecture.md より
   *
   * @type {ec2.ISecurityGroup}
   */
  readonly securityGroup: ec2.ISecurityGroup;

  /**
   * Subnet Selection (必須)
   *
   * 【用途】: Service を配置する Subnet
   * 【推奨】: Private Subnet に配置（セキュリティ確保）
   * 【注意】: Public Subnet 配置時は assignPublicIp: true を検討
   *
   * 🔵 信頼性: architecture.md より
   *
   * @type {ec2.SubnetSelection}
   * @example
   * ```typescript
   * subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
   * ```
   */
  readonly subnets: ec2.SubnetSelection;

  /**
   * Service 名 (オプション)
   *
   * 【用途】: ECS Service の識別名
   * 【デフォルト】: 自動生成（CDK が論理 ID から生成）
   * 【制約】: 1〜255文字、英数字・ハイフン・アンダースコアが使用可能
   * 【命名規則】: `${envName}-${serviceName}` 形式を推奨
   *
   * 🟡 信頼性: interfaces.ts から妥当な推測
   *
   * @default 自動生成
   * @type {string}
   * @example 'frontend-service', 'backend-service', 'dev-api-service'
   */
  readonly serviceName?: string;

  /**
   * Desired Count (オプション)
   *
   * 【用途】: 起動するタスク数
   * 【デフォルト】: 2（高可用性のため）
   * 【推奨】: 本番環境では 2 以上を推奨
   *
   * 🔵 信頼性: REQ-020, NFR-004 より
   *
   * @default 2
   */
  readonly desiredCount?: number;

  /**
   * ECS Exec 有効化 (オプション)
   *
   * 【用途】: コンテナへの接続を許可
   * 【デフォルト】: true（運用・デバッグ目的）
   * 【注意】: 本番環境ではセキュリティポリシーに応じて無効化を検討
   *
   * 🔵 信頼性: REQ-019 より
   *
   * @default true
   */
  readonly enableExecuteCommand?: boolean;

  /**
   * Minimum Healthy Percent (オプション)
   *
   * 【用途】: Rolling Update 時の最小タスク維持率
   * 【デフォルト】: 50%
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @default 50
   */
  readonly minimumHealthyPercent?: number;

  /**
   * Maximum Percent (オプション)
   *
   * 【用途】: Rolling Update 時の最大タスク許可率
   * 【デフォルト】: 200%
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @default 200
   */
  readonly maximumPercent?: number;

  /**
   * ALB Target Group (オプション)
   *
   * 【用途】: ALB からのトラフィックを受け取る設定
   * 【制約】: 指定時は LoadBalancers 設定が追加される
   *
   * 🟡 信頼性: interfaces.ts から妥当な推測
   *
   * @default undefined（ALB 連携なし）
   */
  readonly targetGroup?: elb.IApplicationTargetGroup;

  /**
   * Public IP 割り当て (オプション)
   *
   * 【用途】: タスクに Public IP を割り当てるか
   * 【デフォルト】: false（Private Subnet 配置のため不要）
   * 【注意】: Public Subnet 配置時のみ true を検討
   *
   * 🔵 信頼性: architecture.md より
   *
   * @default false
   */
  readonly assignPublicIp?: boolean;

  /**
   * Container Port (オプション)
   *
   * 【用途】: ALB 連携時のターゲットポート
   * 【デフォルト】: 3000
   * 【制約】: targetGroup 指定時に使用
   *
   * 🟡 信頼性: note.md より
   *
   * @default 3000
   */
  readonly containerPort?: number;
}

/**
 * ECS Service Construct
 *
 * 【機能概要】: ECS Fargate Service を作成する Construct
 * 【実装方針】: Frontend/Backend 両対応の汎用 Service
 *
 * アーキテクチャ位置づけ:
 * ```
 * VPC Stack → Security Stack → Application Stack
 *                               ↓
 *                           ECS Cluster → Task Definition → Service ← 本 Construct
 *                                                          ↓
 *                                                       ALB (optional)
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class EcsServiceConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * // デフォルト設定での使用
 * const ecsService = new EcsServiceConstruct(stack, 'BackendService', {
 *   cluster: ecsCluster.cluster,
 *   taskDefinition: taskDef.taskDefinition,
 *   securityGroup: appSecurityGroup,
 *   subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
 * });
 *
 * // ALB 連携での使用
 * const ecsService = new EcsServiceConstruct(stack, 'FrontendService', {
 *   cluster: ecsCluster.cluster,
 *   taskDefinition: taskDef.taskDefinition,
 *   securityGroup: appSecurityGroup,
 *   subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
 *   targetGroup: albTargetGroup,
 *   serviceName: 'frontend-service',
 * });
 * ```
 */
export class EcsServiceConstruct extends Construct {
  /**
   * 【プロパティ】: ECS Fargate Service
   *
   * 【用途】: Auto Scaling、ALB 連携など、後続処理で参照
   *
   * 🔵 信頼性: note.md より
   *
   * @readonly
   * @type {ecs.FargateService}
   */
  public readonly service: ecs.FargateService;

  /**
   * EcsServiceConstruct のコンストラクタ
   *
   * 【処理概要】: Fargate Service を作成
   * 【設計方針】: デフォルト値を適用しつつ、カスタマイズ可能に
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {EcsServiceConstructProps} props - ECS Service 設定
   */
  constructor(scope: Construct, id: string, props: EcsServiceConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: REQ-019, REQ-020 より
    // ========================================================================
    const desiredCount = props.desiredCount ?? DEFAULT_DESIRED_COUNT;
    const enableExecuteCommand = props.enableExecuteCommand ?? DEFAULT_ENABLE_EXECUTE_COMMAND;
    const minimumHealthyPercent = props.minimumHealthyPercent ?? DEFAULT_MIN_HEALTHY_PERCENT;
    const maximumPercent = props.maximumPercent ?? DEFAULT_MAX_PERCENT;
    const assignPublicIp = props.assignPublicIp ?? DEFAULT_ASSIGN_PUBLIC_IP;
    // 【補足】: containerPort は attachToApplicationTargetGroup() が TaskDefinition から
    // 自動取得するため、現在は使用していない。明示的指定が必要な場合の将来拡張用。
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const containerPort = props.containerPort ?? DEFAULT_CONTAINER_PORT;

    // ========================================================================
    // 【ECS Service 作成】: Fargate Service を作成
    // 🔵 信頼性: REQ-019, REQ-020, REQ-021 より
    // ========================================================================
    this.service = new ecs.FargateService(this, 'Service', {
      // 【Cluster 設定】: Service を配置する Cluster
      // 🔵 信頼性: REQ-019〜021 より
      cluster: props.cluster,

      // 【Task Definition 設定】: Service が使用する Task Definition
      // 🔵 信頼性: REQ-019〜021 より
      taskDefinition: props.taskDefinition,

      // 【Service 名設定】: 指定された名前または undefined（CDK が自動生成）
      // 🟡 信頼性: interfaces.ts から妥当な推測
      serviceName: props.serviceName,

      // 【Desired Count 設定】: 起動するタスク数
      // 【高可用性】: デフォルト 2 で Multi-AZ 配置
      // 🔵 信頼性: REQ-020, NFR-004 より
      desiredCount: desiredCount,

      // 【ECS Exec 設定】: コンテナ接続機能
      // 🔵 信頼性: REQ-019 より
      enableExecuteCommand: enableExecuteCommand,

      // 【デプロイメント設定】: Rolling Update 設定
      // 🟡 信頼性: 設計文書から妥当な推測
      minHealthyPercent: minimumHealthyPercent,
      maxHealthyPercent: maximumPercent,

      // 【Security Group 設定】: ネットワークセキュリティ
      // 🔵 信頼性: architecture.md より
      securityGroups: [props.securityGroup],

      // 【VPC Subnet 設定】: Service を配置する Subnet
      // 🔵 信頼性: architecture.md より
      vpcSubnets: props.subnets,

      // 【Public IP 設定】: Public IP 割り当て
      // 🔵 信頼性: architecture.md より
      assignPublicIp: assignPublicIp,
    });

    // ========================================================================
    // 【ALB 連携設定】: Target Group 指定時のみ LoadBalancer を設定
    // 🟡 信頼性: interfaces.ts から妥当な推測
    // ========================================================================
    if (props.targetGroup) {
      this.service.attachToApplicationTargetGroup(props.targetGroup);

      // Note: attachToApplicationTargetGroup は内部で LoadBalancers を設定するが、
      // CloudFormation テンプレートには明示的な設定が必要な場合がある。
      // CDK L2 Construct が自動的に処理するため、追加設定は不要。
    }
  }
}
