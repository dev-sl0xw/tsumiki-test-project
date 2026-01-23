/**
 * ECS Cluster Construct 実装
 *
 * TASK-0012: ECS Cluster Construct 実装
 * フェーズ: TDD Refactor Phase - コード品質改善
 *
 * 【機能概要】: ECS Fargate Cluster を作成する CDK Construct
 * 【実装方針】: AWS CDK の ecs.Cluster コンストラクトを使用し、Container Insights を有効化
 * 【テスト対応】: TC-ECS-CLUSTER-01 〜 TC-ECS-CLUSTER-15 の全15テストケースに対応
 * 【リファクタ内容】: containerInsightsV2 への移行、JSDoc強化、フェーズ名更新
 *
 * 構成内容:
 * - ECS Cluster: Fargate 専用クラスター (REQ-012)
 * - Container Insights: デフォルト有効（Enhanced モード）(REQ-013, NFR-301)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-012, REQ-013 に基づく実装
 *
 * @module ecs/ecs-cluster-construct
 */

import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: ECS Cluster 構成のデフォルト値
// 🔵 信頼性: REQ-012, REQ-013 より
// ============================================================================

/**
 * 【デフォルト Container Insights 設定】: Container Insights の有効/無効
 *
 * 【設定値】: true（有効）
 * 【根拠】: REQ-013, NFR-301 により Container Insights 有効化が必須
 * 【補足】: containerInsightsV2 では true = ENHANCED, false = DISABLED
 *
 * 🔵 信頼性: REQ-013, NFR-301 より (有効化が必須)
 */
const DEFAULT_CONTAINER_INSIGHTS_ENABLED = true;

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * EcsClusterConstruct の Props インターフェース
 *
 * 【設計方針】: VPC は必須、その他はオプショナルでデフォルト値を提供
 * 【再利用性】: 異なる環境（開発/ステージング/本番）で柔軟に設定可能
 * 【改善内容】: JSDoc強化、VpcConstructパターンに準拠
 *
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface EcsClusterConstructProps
 */
export interface EcsClusterConstructProps {
  /**
   * VPC (必須)
   *
   * 【用途】: ECS クラスターを作成する VPC
   * 【制約】: VPC Stack で作成された VPC を指定
   * 【参照元】: VpcConstruct.vpc プロパティから取得
   *
   * 🔵 信頼性: REQ-012 より
   *
   * @type {ec2.IVpc}
   * @example
   * ```typescript
   * const ecsCluster = new EcsClusterConstruct(stack, 'EcsCluster', {
   *   vpc: vpcConstruct.vpc,
   * });
   * ```
   */
  readonly vpc: ec2.IVpc;

  /**
   * クラスター名 (オプション)
   *
   * 【用途】: ECS クラスターの識別名
   * 【デフォルト】: 自動生成（CDK が論理 ID から生成）
   * 【制約】: 1〜255文字、英数字・ハイフン・アンダースコアが使用可能
   * 【命名規則】: `${envName}-cluster` 形式を推奨
   *
   * 🔵 信頼性: 設計文書 note.md より
   *
   * @default 自動生成（CDK が論理 ID から生成）
   * @type {string}
   * @example 'dev-cluster', 'prod-cluster', 'my-app-cluster'
   */
  readonly clusterName?: string;

  /**
   * Container Insights 有効化 (オプション)
   *
   * 【用途】: コンテナメトリクス収集とログ分析の有効化
   * 【デフォルト】: true（ENHANCED モード）
   * 【推奨】: 本番環境では true を強く推奨（モニタリング必須）
   * 【注意】: false 設定は REQ-013 に反するため非推奨
   * 【コスト】: CloudWatch の追加料金が発生（詳細はAWS料金表参照）
   *
   * 🔵 信頼性: REQ-013, NFR-301 より
   *
   * @default true（ENHANCED モード）
   * @type {boolean}
   */
  readonly containerInsights?: boolean;
}

/**
 * ECS Cluster Construct
 *
 * 【機能概要】: Fargate 専用の ECS クラスターを作成する Construct
 * 【実装方針】: CDK の ecs.Cluster を使用し、Container Insights をデフォルト有効化
 * 【テスト対応】: TC-ECS-CLUSTER-01 〜 TC-ECS-CLUSTER-15 の全テストケースに対応
 * 【改善内容】: containerInsightsV2 への移行、JSDoc強化、コメント品質向上
 *
 * 構成内容:
 * - 起動タイプ: Fargate 専用（EC2 Capacity Provider なし） (REQ-012)
 * - Container Insights: デフォルト有効（ENHANCED モード） (REQ-013, NFR-301)
 *
 * アーキテクチャ位置づけ:
 * ```
 * VPC Stack → Security Stack → Application Stack (ECS Cluster) ← 本 Construct
 *                               ↓
 *                           Task Definition → Service
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class EcsClusterConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * // デフォルト設定での使用（Container Insights ENHANCED モード）
 * const ecsCluster = new EcsClusterConstruct(stack, 'EcsCluster', {
 *   vpc: vpcConstruct.vpc,
 * });
 *
 * // カスタム設定での使用（本番環境向け）
 * const ecsCluster = new EcsClusterConstruct(stack, 'EcsCluster', {
 *   vpc: vpcConstruct.vpc,
 *   clusterName: 'prod-cluster',
 *   containerInsights: true,
 * });
 *
 * // 後続の Task Definition で参照
 * const cluster = ecsCluster.cluster;
 * const clusterName = ecsCluster.cluster.clusterName;
 * ```
 */
export class EcsClusterConstruct extends Construct {
  /**
   * 【プロパティ】: ECS クラスター
   *
   * 【用途】: Task Definition、Service 作成時に参照
   * 【参照元】: Application Stack の Task Definition、Service 作成時に使用
   * 🔵 信頼性: 設計文書 note.md より
   *
   * @readonly
   * @type {ecs.ICluster}
   */
  public readonly cluster: ecs.ICluster;

  /**
   * EcsClusterConstruct のコンストラクタ
   *
   * 【処理概要】: Fargate 専用の ECS クラスターを作成
   * 【設計方針】: containerInsights 未指定時は DEFAULT_CONTAINER_INSIGHTS_ENABLED を使用
   * 【改善内容】: containerInsightsV2 への移行（deprecated API の置換）
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {EcsClusterConstructProps} props - ECS Cluster 設定
   */
  constructor(scope: Construct, id: string, props: EcsClusterConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: REQ-013 より（Container Insights デフォルト有効）
    // ========================================================================
    const containerInsightsEnabled = props.containerInsights ?? DEFAULT_CONTAINER_INSIGHTS_ENABLED;

    // ========================================================================
    // 【Container Insights 設定変換】: boolean から ContainerInsights 列挙型へ変換
    // 【改善ポイント】: containerInsightsV2 を使用（deprecated API の置換）
    // 🔵 信頼性: AWS CDK ベストプラクティスより（最新 API の使用）
    // ========================================================================
    const containerInsightsV2Setting = containerInsightsEnabled
      ? ecs.ContainerInsights.ENHANCED
      : ecs.ContainerInsights.DISABLED;

    // ========================================================================
    // 【ECS Cluster 作成】: Fargate 専用クラスターを作成
    // 🔵 信頼性: REQ-012, REQ-013 より
    // ========================================================================
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      // 【VPC 設定】: クラスターを作成する VPC
      // 【用途】: ECS タスクが実行される VPC を指定
      // 🔵 信頼性: REQ-012 より
      vpc: props.vpc,

      // 【クラスター名設定】: 指定された名前または undefined（CDK が自動生成）
      // 【命名規則】: 指定しない場合は CDK が論理 ID から一意の名前を生成
      // 🔵 信頼性: 設計文書 note.md より
      clusterName: props.clusterName,

      // 【Container Insights 設定】: メトリクス収集の有効/無効
      // 【改善ポイント】: containerInsightsV2 を使用（deprecated containerInsights の置換）
      // 【設定値】: ENHANCED（有効）または DISABLED（無効）
      // 🔵 信頼性: REQ-013, NFR-301 より（デフォルト有効 = ENHANCED）
      containerInsightsV2: containerInsightsV2Setting,
    });
  }
}
