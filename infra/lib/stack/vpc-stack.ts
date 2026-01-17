/**
 * VPC Stack 実装
 *
 * TASK-0004: VPC Stack 統合
 * フェーズ: TDD Refactor Phase - 品質改善とリファクタリング完了
 *
 * 【機能概要】: VpcConstruct と EndpointsConstruct を統合した VPC Stack を作成する
 * 【実装方針】: 既存の Construct を統合し、他の Stack から参照可能なプロパティを公開
 * 【セキュリティ】: VPC Endpoint 使用により AWS サービスへの通信が AWS 内に閉じる
 * 【テスト対応】: TC-VS-01 〜 TC-VS-16 の全テストケースに対応
 * 🔵 信頼性レベル: 要件定義書 REQ-001 〜 REQ-011 に基づく実装
 *
 * @module VpcStack
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VpcConstruct } from '../construct/vpc/vpc-construct';
import { EndpointsConstruct } from '../construct/vpc/endpoints-construct';
import { EnvironmentConfig } from '../../parameter';

// ============================================================================
// 【インターフェース定義】
// 🔵 信頼性: タスク定義書・設計文書より
// ============================================================================

/**
 * VpcStack の Props インターフェース
 *
 * 【設計方針】: EnvironmentConfig を必須パラメータとして受け取り、Stack の設定を行う
 * 【再利用性】: 異なる環境（Dev/Prod）で柔軟に設定可能
 * 🔵 信頼性: タスク定義書より
 *
 * @interface VpcStackProps
 * @extends cdk.StackProps
 */
export interface VpcStackProps extends cdk.StackProps {
  /**
   * 環境設定（必須）
   *
   * 【用途】: VPC CIDR、環境名などの設定を提供
   * 🔵 信頼性: タスク定義書より必須パラメータ
   */
  readonly config: EnvironmentConfig;
}

/**
 * VPC Stack
 *
 * 【機能概要】: VpcConstruct と EndpointsConstruct を統合した CDK Stack
 * 【実装方針】: 既存の Construct を使用し、他の Stack から参照可能なプロパティを公開
 * 【テスト対応】: TC-VS-01 〜 TC-VS-16 の全テストケースに対応
 *
 * 構成内容:
 * - VPC: CIDR 10.0.0.0/16 (REQ-001)
 * - Public Subnet x 2 (REQ-003)
 * - Private App Subnet x 2 (REQ-004)
 * - Private DB Subnet x 2 (REQ-005)
 * - Internet Gateway x 1 (REQ-006)
 * - NAT Gateway x 2 (REQ-007)
 * - VPC Endpoints x 7 (REQ-008 〜 REQ-011)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-001 〜 REQ-011 に基づく実装
 *
 * @class VpcStack
 * @extends cdk.Stack
 *
 * @example
 * ```typescript
 * const vpcStack = new VpcStack(app, 'VpcStack', {
 *   config: devConfig,
 *   env: {
 *     account: config.account,
 *     region: config.region,
 *   },
 * });
 * ```
 */
export class VpcStack extends cdk.Stack {
  // ==========================================================================
  // 【公開プロパティ】: 他の Stack から参照可能なリソース
  // 【設計方針】: IVpc, ISubnet 等のインターフェース型を使用して柔軟性を確保
  // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
  // ==========================================================================

  /**
   * VPC への参照
   *
   * 【用途】: 他の Stack (Security Stack, Database Stack, Application Stack) から VPC を参照
   * 【配置対象】: Security Group、Lambda、ECS、Aurora などのリソース
   * 🔵 信頼性: タスク定義書より
   *
   * @readonly
   * @type {ec2.IVpc}
   */
  public readonly vpc: ec2.IVpc;

  /**
   * Public Subnet 配列
   *
   * 【用途】: ALB (Application Load Balancer) の配置に使用
   * 【特性】: Internet Gateway へのルートを持ち、パブリック IP が自動割り当て
   * 【要素数】: 2 (各 AZ に 1 つずつ)
   * 🔵 信頼性: タスク定義書より (REQ-003)
   *
   * @readonly
   * @type {ec2.ISubnet[]}
   */
  public readonly publicSubnets: ec2.ISubnet[];

  /**
   * Private App Subnet 配列
   *
   * 【用途】: ECS Fargate タスクの配置に使用
   * 【特性】: NAT Gateway 経由でインターネットアクセス可能（Egress のみ）
   * 【要素数】: 2 (各 AZ に 1 つずつ)
   * 🔵 信頼性: タスク定義書より (REQ-004)
   *
   * @readonly
   * @type {ec2.ISubnet[]}
   */
  public readonly privateAppSubnets: ec2.ISubnet[];

  /**
   * Private DB Subnet 配列
   *
   * 【用途】: Aurora Serverless v2 の配置に使用
   * 【特性】: 完全に隔離され、インターネットへのルートなし（セキュリティ最大化）
   * 【要素数】: 2 (各 AZ に 1 つずつ)
   * 🔵 信頼性: タスク定義書より (REQ-005)
   *
   * @readonly
   * @type {ec2.ISubnet[]}
   */
  public readonly privateDbSubnets: ec2.ISubnet[];

  /**
   * VpcStack のコンストラクタ
   *
   * 【処理概要】: VpcConstruct と EndpointsConstruct を作成し、プロパティを公開
   * 【設計方針】: config.vpcCidr を使用して VpcConstruct を作成し、その vpc を EndpointsConstruct に渡す
   *
   * @param {Construct} scope - 親となる Construct (通常は App)
   * @param {string} id - この Stack の識別子
   * @param {VpcStackProps} props - VpcStack の Props
   */
  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    // ========================================================================
    // 【VpcConstruct 作成】: 3層サブネット構成の VPC を作成
    // 【パラメータ】: config.vpcCidr を VpcConstruct に渡す
    // 🔵 信頼性: タスク定義書・要件定義書 REQ-001 〜 REQ-007 より
    // ========================================================================
    const vpcConstruct = new VpcConstruct(this, 'Vpc', {
      // 【CIDR 設定】: 環境設定から VPC CIDR を取得
      // 【フォールバック】: 空文字の場合は VpcConstruct のデフォルト値 '10.0.0.0/16' が使用される
      // 🔵 信頼性: REQ-001 より
      vpcCidr: props.config.vpcCidr || undefined,
    });

    // ========================================================================
    // 【EndpointsConstruct 作成】: VPC Endpoints を作成
    // 【パラメータ】: VpcConstruct.vpc を EndpointsConstruct に渡す
    // 🔵 信頼性: タスク定義書・要件定義書 REQ-008 〜 REQ-011 より
    // ========================================================================
    new EndpointsConstruct(this, 'Endpoints', {
      // 【VPC 参照】: VpcConstruct で作成した VPC を渡す
      // 🔵 信頼性: REQ-008 〜 REQ-011 より
      vpc: vpcConstruct.vpc,
    });

    // ========================================================================
    // 【プロパティ設定】: 外部からアクセス可能なプロパティを設定
    // 【用途】: 他の Stack から VPC リソースを参照するために公開
    // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
    // ========================================================================

    // 【VPC 参照】: VpcConstruct の vpc プロパティを Stack レベルで公開
    this.vpc = vpcConstruct.vpc;

    // 【Public Subnet 参照】: ALB 配置用サブネット
    this.publicSubnets = vpcConstruct.publicSubnets;

    // 【Private App Subnet 参照】: ECS タスク配置用サブネット
    this.privateAppSubnets = vpcConstruct.privateAppSubnets;

    // 【Private DB Subnet 参照】: Aurora 配置用サブネット
    this.privateDbSubnets = vpcConstruct.privateDbSubnets;
  }
}
