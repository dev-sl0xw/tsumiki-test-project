/**
 * Security Group Construct 実装
 *
 * TASK-0005: Security Group Construct 実装
 * フェーズ: Refactor フェーズ - コード品質改善
 *
 * 【機能概要】: AWS CDK サーバーレスアーキテクチャにおける Security Group を一元管理する
 * 【実装方針】: 最小権限の原則に基づき、3つの Security Group を作成
 * 【テスト対応】: TC-SG-01 〜 TC-SG-22 の全20テストケースを通すための実装
 * 【リファクタ内容】: 定数抽出、JSDoc強化、セクション区切りコメント追加
 *
 * 構成内容:
 * - ALB Security Group: Internet-facing ALB 用。HTTP(80) と HTTPS(443) のインバウンドを許可
 * - ECS Security Group: ECS Fargate タスク用。ALB からのトラフィックのみを許可
 * - Aurora Security Group: Aurora MySQL 用。ECS からの 3306 ポートアクセスのみを許可
 *
 * 参照した要件:
 * - REQ-024: Aurora SG で外部からの直接アクセスを遮断
 * - REQ-025: Aurora SG で ECS SG からの 3306 のみ許可
 * - REQ-028: ALB を Public Subnet に配置、Internet-facing
 * - REQ-029: HTTP→HTTPS リダイレクト対応
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @module SecurityGroupConstruct
 */

import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// ============================================================================
// 【定数定義】: ポート番号
// 🔵 信頼性: 要件定義書 REQ-024, REQ-025, REQ-028, REQ-029 より
// ============================================================================

/**
 * 【デフォルト ECS コンテナポート】: ALB から ECS へのトラフィックで使用するデフォルトポート
 * 🔵 信頼性: note.md 型定義より (デフォルト値 80)
 */
const DEFAULT_CONTAINER_PORT = 80;

/**
 * 【HTTP ポート】: HTTP トラフィック用ポート番号
 * 🔵 信頼性: REQ-029 より (HTTP リクエストを受け入れ)
 */
const PORT_HTTP = 80;

/**
 * 【HTTPS ポート】: HTTPS トラフィック用ポート番号
 * 🔵 信頼性: REQ-028 より (HTTPS を受け入れ)
 */
const PORT_HTTPS = 443;

/**
 * 【MySQL ポート】: Aurora MySQL 接続用ポート番号
 * 🔵 信頼性: REQ-025 より (3306 ポートアクセス)
 */
const PORT_MYSQL = 3306;

// ============================================================================
// 【定数定義】: Security Group 説明文
// 🔵 信頼性: CDK ベストプラクティスより（監査・トラブルシューティング時に役立つ）
// ============================================================================

/**
 * 【ALB Security Group 説明】: ALB 用 Security Group の説明文
 */
const DESCRIPTION_ALB_SG = 'Security Group for ALB - allows HTTP and HTTPS from internet';

/**
 * 【ECS Security Group 説明】: ECS Fargate タスク用 Security Group の説明文
 */
const DESCRIPTION_ECS_SG = 'Security Group for ECS Fargate tasks';

/**
 * 【Aurora Security Group 説明】: Aurora MySQL 用 Security Group の説明文
 */
const DESCRIPTION_AURORA_SG = 'Security Group for Aurora MySQL Database';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * SecurityGroupConstruct の Props インターフェース
 *
 * 【設計方針】: VPC は必須、containerPort はオプショナルでデフォルト値を提供
 * 【再利用性】: 異なるコンテナポートに対応可能
 * 🔵 信頼性: TASK-0005.md、note.md 型定義より
 *
 * @interface SecurityGroupConstructProps
 */
export interface SecurityGroupConstructProps {
  /**
   * VPC (必須)
   *
   * 【用途】: Security Group を作成する VPC
   * 【制約】: VPC Stack で作成された VPC を指定
   * 🔵 信頼性: 要件定義書より
   *
   * @type {ec2.IVpc}
   */
  readonly vpc: ec2.IVpc;

  /**
   * ECS コンテナポート (オプション)
   *
   * 【用途】: ALB から ECS へのトラフィックで使用するポート
   * 【デフォルト】: 80 (HTTP)
   * 【範囲】: 1-65535
   * 🔵 信頼性: note.md 型定義より
   *
   * @default 80
   * @type {number}
   */
  readonly containerPort?: number;
}

/**
 * Security Group Construct
 *
 * 【機能概要】: 3つの Security Group (ALB, ECS, Aurora) を作成する Construct
 * 【実装方針】: 最小権限の原則に基づき、必要最小限のルールのみ設定
 * 【テスト対応】: TC-SG-01 〜 TC-SG-22 の全テストケースに対応
 * 【改善内容】: 定数抽出、JSDoc強化、セクション区切りコメント追加
 *
 * セキュリティ設計:
 * - ALB SG: 0.0.0.0/0 から HTTP(80)/HTTPS(443) を許可、allowAllOutbound: true
 * - ECS SG: ALB SG からの containerPort のみ許可、allowAllOutbound: true
 * - Aurora SG: ECS SG からの 3306 のみ許可、allowAllOutbound: false
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class SecurityGroupConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * // デフォルト設定での使用
 * const securityGroups = new SecurityGroupConstruct(stack, 'SecurityGroups', {
 *   vpc,
 * });
 *
 * // カスタム containerPort での使用
 * const securityGroups = new SecurityGroupConstruct(stack, 'SecurityGroups', {
 *   vpc,
 *   containerPort: 8080,
 * });
 *
 * // 後続の Construct での参照
 * const albSg = securityGroups.albSecurityGroup;
 * const ecsSg = securityGroups.ecsSecurityGroup;
 * const auroraSg = securityGroups.auroraSecurityGroup;
 * ```
 */
export class SecurityGroupConstruct extends Construct {
  /**
   * 【プロパティ】: ALB 用 Security Group
   *
   * 【用途】: Internet-facing ALB に割り当て
   * 【ルール】: HTTP(80) と HTTPS(443) のインバウンドを 0.0.0.0/0 から許可
   * 【参照元】: Application Stack の ALB 作成時に使用
   * 🔵 信頼性: REQ-028, REQ-029 より
   *
   * @readonly
   * @type {ec2.ISecurityGroup}
   */
  public readonly albSecurityGroup: ec2.ISecurityGroup;

  /**
   * 【プロパティ】: ECS 用 Security Group
   *
   * 【用途】: ECS Fargate タスクに割り当て
   * 【ルール】: ALB Security Group からの containerPort のみ許可
   * 【参照元】: Application Stack の ECS Service 作成時に使用
   * 🔵 信頼性: dataflow.md セキュリティ境界設計より
   *
   * @readonly
   * @type {ec2.ISecurityGroup}
   */
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;

  /**
   * 【プロパティ】: Aurora 用 Security Group
   *
   * 【用途】: Aurora MySQL データベースに割り当て
   * 【ルール】: ECS Security Group からの 3306 のみ許可、アウトバウンド制限
   * 【参照元】: Database Stack の Aurora 作成時に使用
   * 🔵 信頼性: REQ-024, REQ-025 より
   *
   * @readonly
   * @type {ec2.ISecurityGroup}
   */
  public readonly auroraSecurityGroup: ec2.ISecurityGroup;

  /**
   * SecurityGroupConstruct のコンストラクタ
   *
   * 【処理概要】: 3つの Security Group を作成し、最小権限のルールを設定
   * 【設計方針】: containerPort 未指定時は DEFAULT_CONTAINER_PORT を使用
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {SecurityGroupConstructProps} props - Security Group 設定
   */
  constructor(scope: Construct, id: string, props: SecurityGroupConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: note.md 型定義より
    // ========================================================================
    const { vpc, containerPort = DEFAULT_CONTAINER_PORT } = props;

    // ========================================================================
    // 【ALB Security Group 作成】: Internet-facing ALB 用
    // 🔵 信頼性: REQ-028, REQ-029 より
    // ========================================================================
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      // 【VPC 設定】: Security Group を作成する VPC
      vpc,

      // 【説明設定】: 監査・トラブルシューティング用の説明文
      description: DESCRIPTION_ALB_SG,

      // 【アウトバウンド設定】: 全てのアウトバウンドトラフィックを許可
      // 🔵 信頼性: note.md CDKベストプラクティスより（VPC Endpoint 経由の通信に必要）
      allowAllOutbound: true,
    });

    // 【HTTP インバウンドルール】: HTTP(80) を 0.0.0.0/0 から許可
    // 🔵 信頼性: REQ-029 より（HTTP リクエストを受け入れ、HTTPS にリダイレクト）
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(PORT_HTTP),
      'Allow HTTP from anywhere'
    );

    // 【HTTPS インバウンドルール】: HTTPS(443) を 0.0.0.0/0 から許可
    // 🔵 信頼性: REQ-028 より（HTTPS を受け入れ）
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(PORT_HTTPS),
      'Allow HTTPS from anywhere'
    );

    // ========================================================================
    // 【ECS Security Group 作成】: ECS Fargate タスク用
    // 🔵 信頼性: dataflow.md セキュリティ境界設計より
    // ========================================================================
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      // 【VPC 設定】: Security Group を作成する VPC
      vpc,

      // 【説明設定】: 監査・トラブルシューティング用の説明文
      description: DESCRIPTION_ECS_SG,

      // 【アウトバウンド設定】: 全てのアウトバウンドトラフィックを許可
      // 🔵 信頼性: note.md CDKベストプラクティスより（VPC Endpoint 経由の通信に必要）
      allowAllOutbound: true,
    });

    // 【ALB からのインバウンドルール】: ALB SG からの containerPort のみ許可
    // 🔵 信頼性: dataflow.md より（ALB から ECS への通信）
    // 【セキュリティ設計】: CIDR ベースではなく SG 参照を使用（動的 IP 変更に対応）
    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(containerPort),
      `Allow traffic from ALB on port ${containerPort}`
    );

    // ========================================================================
    // 【Aurora Security Group 作成】: Aurora MySQL データベース用
    // 🔵 信頼性: REQ-024, REQ-025 より
    // ========================================================================
    this.auroraSecurityGroup = new ec2.SecurityGroup(this, 'AuroraSecurityGroup', {
      // 【VPC 設定】: Security Group を作成する VPC
      vpc,

      // 【説明設定】: 監査・トラブルシューティング用の説明文
      description: DESCRIPTION_AURORA_SG,

      // 【アウトバウンド制限】: 外向きトラフィックを完全に制限
      // 🔵 信頼性: REQ-024 より（外部アクセス遮断）
      // 【セキュリティ強化】: データ漏洩リスクを軽減
      allowAllOutbound: false,
    });

    // 【ECS からのインバウンドルール】: ECS SG からの 3306 のみ許可
    // 🔵 信頼性: REQ-025 より（ECS SG からの 3306 のみ許可）
    // 【セキュリティ設計】: CIDR ベースではなく SG 参照を使用（動的 IP 変更に対応）
    this.auroraSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(PORT_MYSQL),
      'Allow MySQL connection from ECS only'
    );
  }
}
