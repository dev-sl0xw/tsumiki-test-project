/**
 * VPC Construct 実装
 *
 * TASK-0002: VPC Construct 実装
 * フェーズ: Refactor フェーズ - コード品質改善
 *
 * 【機能概要】: Multi-AZ 構成の 3層サブネットを持つ VPC を作成する
 * 【実装方針】: AWS CDK の ec2.Vpc コンストラクトを使用し、テスト要件を満たす設定を適用
 * 【テスト対応】: TC-VPC-01 〜 TC-VPC-07 の全24テストケースを通すための実装
 * 【リファクタ内容】: 定数抽出、JSDoc強化、DNS設定明示化
 * 🔵 信頼性レベル: 要件定義書 REQ-001 〜 REQ-007 に基づく実装
 *
 * @module VpcConstruct
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: VPC 構成のデフォルト値
// 🔵 信頼性: REQ-001 〜 REQ-007 より
// ============================================================================

/**
 * 【デフォルトVPC CIDR】: VPC のデフォルト IP アドレス範囲
 * 🔵 信頼性: REQ-001 より (65,536 IP アドレス)
 */
const DEFAULT_VPC_CIDR = '10.0.0.0/16';

/**
 * 【デフォルトAZ数】: 使用する可用性ゾーンのデフォルト数
 * 🔵 信頼性: REQ-002 より (ap-northeast-1a, ap-northeast-1c)
 */
const DEFAULT_MAX_AZS = 2;

/**
 * 【デフォルトNAT Gateway数】: NAT Gateway のデフォルト数
 * 🔵 信頼性: REQ-007 より (各 AZ に 1 つずつ配置)
 */
const DEFAULT_NAT_GATEWAYS = 2;

/**
 * 【デフォルトPublic Subnet CIDRマスク】: Public Subnet のデフォルト CIDR マスク
 * 🔵 信頼性: REQ-003 より (256 IP アドレス/サブネット)
 */
const DEFAULT_PUBLIC_SUBNET_CIDR_MASK = 24;

/**
 * 【デフォルトPrivate App Subnet CIDRマスク】: Private App Subnet のデフォルト CIDR マスク
 * 🔵 信頼性: REQ-004 より (512 IP アドレス/サブネット)
 */
const DEFAULT_PRIVATE_APP_SUBNET_CIDR_MASK = 23;

/**
 * 【デフォルトPrivate DB Subnet CIDRマスク】: Private DB Subnet のデフォルト CIDR マスク
 * 🔵 信頼性: REQ-005 より (256 IP アドレス/サブネット)
 */
const DEFAULT_PRIVATE_DB_SUBNET_CIDR_MASK = 24;

// ============================================================================
// 【サブネット名定数】: サブネット識別用の名前
// 🔵 信頼性: CDK ベストプラクティスより
// ============================================================================

/** Public Subnet の識別名 */
const SUBNET_NAME_PUBLIC = 'Public';

/** Private App Subnet の識別名 */
const SUBNET_NAME_PRIVATE_APP = 'PrivateApp';

/** Private DB Subnet の識別名 */
const SUBNET_NAME_PRIVATE_DB = 'PrivateDb';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * VpcConstruct の Props インターフェース
 *
 * 【設計方針】: すべてのパラメータをオプショナルとし、デフォルト値を提供
 * 【再利用性】: 異なる環境（開発/ステージング/本番）で柔軟に設定可能
 * 🔵 信頼性: テストファイルおよび要件定義書から
 *
 * @interface VpcConstructProps
 */
export interface VpcConstructProps {
  /**
   * VPC CIDR Block
   * @default '10.0.0.0/16' (65,536 IP アドレス)
   * @example '10.0.0.0/16', '172.16.0.0/16'
   */
  readonly vpcCidr?: string;

  /**
   * 使用する可用性ゾーン数
   * @default 2 (高可用性のため Multi-AZ 構成)
   * @example 1, 2, 3 (東京リージョンでは最大 3)
   */
  readonly maxAzs?: number;

  /**
   * NAT Gateway の数
   * @default 2 (各 AZ に 1 つずつ配置)
   * @example 0 (コスト削減), 1 (単一障害点あり), 2 (高可用性)
   */
  readonly natGateways?: number;

  /**
   * Public Subnet の CIDR マスク
   * @default 24 (256 IP アドレス/サブネット)
   * @example 24 (256 IPs), 25 (128 IPs), 26 (64 IPs)
   */
  readonly publicSubnetCidrMask?: number;

  /**
   * Private App Subnet の CIDR マスク
   * @default 23 (512 IP アドレス/サブネット)
   * @example 23 (512 IPs), 22 (1024 IPs)
   */
  readonly privateAppSubnetCidrMask?: number;

  /**
   * Private DB Subnet の CIDR マスク
   * @default 24 (256 IP アドレス/サブネット)
   * @example 24 (256 IPs), 25 (128 IPs)
   */
  readonly privateDbSubnetCidrMask?: number;
}

/**
 * VPC Construct
 *
 * 【機能概要】: Multi-AZ 構成の VPC を作成する Construct
 * 【実装方針】: CDK の ec2.Vpc を使用し、3層サブネット構成を実現
 * 【テスト対応】: TC-VPC-01 〜 TC-VPC-07 の全テストケースに対応
 * 【改善内容】: 定数抽出、JSDoc強化、DNS設定の明示化
 *
 * 構成内容:
 * - VPC CIDR: 10.0.0.0/16 (REQ-001)
 * - Max AZs: 2 (REQ-002)
 * - Public Subnet: /24 x 2 (REQ-003)
 * - Private App Subnet: /23 x 2 (REQ-004)
 * - Private DB Subnet: /24 x 2 (REQ-005)
 * - Internet Gateway: 1 (REQ-006)
 * - NAT Gateway: 2 (REQ-007)
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class VpcConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * // デフォルト設定での使用
 * const vpcConstruct = new VpcConstruct(stack, 'Vpc');
 *
 * // カスタム設定での使用
 * const vpcConstruct = new VpcConstruct(stack, 'Vpc', {
 *   vpcCidr: '10.0.0.0/16',
 *   maxAzs: 2,
 *   natGateways: 2,
 * });
 * ```
 */
export class VpcConstruct extends Construct {
  /**
   * 【プロパティ】: 作成された VPC
   *
   * 【用途】: 他の Construct や Stack から VPC を参照する際に使用
   * 【例】: Security Group、Lambda、ECS などのリソース作成時に参照
   * 🔵 信頼性: interfaces.ts および要件定義書から
   *
   * @readonly
   * @type {ec2.IVpc}
   */
  public readonly vpc: ec2.IVpc;

  /**
   * 【プロパティ】: Public Subnet の配列
   *
   * 【用途】: ALB、NAT Gateway、Bastion Host などの配置に使用
   * 【特性】: Internet Gateway へのルートを持ち、パブリック IP が自動割り当て
   * 🔵 信頼性: interfaces.ts から
   *
   * @readonly
   * @type {ec2.ISubnet[]}
   */
  public readonly publicSubnets: ec2.ISubnet[];

  /**
   * 【プロパティ】: Private App Subnet の配列
   *
   * 【用途】: ECS Fargate、Lambda などのアプリケーションリソース配置に使用
   * 【特性】: NAT Gateway 経由でインターネットアクセス可能（Egress のみ）
   * 🔵 信頼性: interfaces.ts から
   *
   * @readonly
   * @type {ec2.ISubnet[]}
   */
  public readonly privateAppSubnets: ec2.ISubnet[];

  /**
   * 【プロパティ】: Private DB Subnet の配列
   *
   * 【用途】: Aurora、RDS、ElastiCache などのデータストア配置に使用
   * 【特性】: 完全に隔離され、インターネットへのルートなし（セキュリティ最大化）
   * 🔵 信頼性: interfaces.ts から
   *
   * @readonly
   * @type {ec2.ISubnet[]}
   */
  public readonly privateDbSubnets: ec2.ISubnet[];

  /**
   * VpcConstruct のコンストラクタ
   *
   * 【処理概要】: 3層サブネット構成の VPC を作成し、プロパティとして公開
   * 【設計方針】: Props が未指定の場合はデフォルト定数を使用
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - このConstruct の識別子
   * @param {VpcConstructProps} [props] - VPC 設定（オプション）
   */
  constructor(scope: Construct, id: string, props?: VpcConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【デフォルト値適用】: Props のデフォルト値を定数から適用
    // 🔵 信頼性: 要件定義書 REQ-001 〜 REQ-007 から
    // ========================================================================
    const vpcCidr: string = props?.vpcCidr ?? DEFAULT_VPC_CIDR;
    const maxAzs: number = props?.maxAzs ?? DEFAULT_MAX_AZS;
    const natGateways: number = props?.natGateways ?? DEFAULT_NAT_GATEWAYS;
    const publicSubnetCidrMask: number = props?.publicSubnetCidrMask ?? DEFAULT_PUBLIC_SUBNET_CIDR_MASK;
    const privateAppSubnetCidrMask: number = props?.privateAppSubnetCidrMask ?? DEFAULT_PRIVATE_APP_SUBNET_CIDR_MASK;
    const privateDbSubnetCidrMask: number = props?.privateDbSubnetCidrMask ?? DEFAULT_PRIVATE_DB_SUBNET_CIDR_MASK;

    // ========================================================================
    // 【VPC 作成】: 3層サブネット構成の VPC を作成
    // 🔵 信頼性: 要件定義書に基づく実装
    // ========================================================================
    const vpc = new ec2.Vpc(this, 'Vpc', {
      // 【CIDR 設定】: VPC の IP アドレス範囲を指定
      // 🔵 信頼性: REQ-001 より (10.0.0.0/16)
      ipAddresses: ec2.IpAddresses.cidr(vpcCidr),

      // 【AZ 設定】: 使用する可用性ゾーン数を指定
      // 🔵 信頼性: REQ-002 より (2 AZ)
      maxAzs: maxAzs,

      // 【NAT Gateway 設定】: NAT Gateway の数を指定
      // 🔵 信頼性: REQ-007 より (2 NAT Gateway)
      natGateways: natGateways,

      // 【DNS 設定】: VPC 内での DNS 解決を有効化
      // 🔵 信頼性: AWS ベストプラクティスより（明示的な設定で意図を明確化）
      enableDnsHostnames: true,
      enableDnsSupport: true,

      // 【サブネット設定】: 3層サブネット構成を定義
      // 🔵 信頼性: REQ-003, REQ-004, REQ-005 より
      subnetConfiguration: [
        {
          // 【Public Subnet】: インターネットアクセス用サブネット
          // 【用途】: ALB、NAT Gateway、Bastion Host の配置
          // 🔵 信頼性: REQ-003 より (/24 x 2 AZ)
          name: SUBNET_NAME_PUBLIC,
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: publicSubnetCidrMask,
        },
        {
          // 【Private App Subnet】: アプリケーション用サブネット
          // 【用途】: ECS Fargate、Lambda の配置（NAT 経由でインターネットアクセス可能）
          // 🔵 信頼性: REQ-004 より (/23 x 2 AZ)
          name: SUBNET_NAME_PRIVATE_APP,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: privateAppSubnetCidrMask,
        },
        {
          // 【Private DB Subnet】: データベース用サブネット（完全隔離）
          // 【用途】: Aurora、RDS の配置（外部アクセス不可でセキュリティ最大化）
          // 🔵 信頼性: REQ-005 より (/24 x 2 AZ)
          name: SUBNET_NAME_PRIVATE_DB,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: privateDbSubnetCidrMask,
        },
      ],
    });

    // ========================================================================
    // 【プロパティ設定】: 外部からアクセス可能なプロパティを設定
    // 🔵 信頼性: interfaces.ts から
    // ========================================================================

    // 【VPC 参照】: 作成した VPC への参照を保持
    this.vpc = vpc;

    // 【Public Subnet 参照】: PUBLIC タイプのサブネットを取得
    // 🔵 信頼性: テストケース TC-VPC-02 から
    this.publicSubnets = vpc.publicSubnets;

    // 【Private App Subnet 参照】: PRIVATE_WITH_EGRESS タイプのサブネットを取得
    // 🔵 信頼性: テストケース TC-VPC-03 から
    this.privateAppSubnets = vpc.privateSubnets;

    // 【Private DB Subnet 参照】: PRIVATE_ISOLATED タイプのサブネットを取得
    // 🔵 信頼性: テストケース TC-VPC-04 から
    this.privateDbSubnets = vpc.isolatedSubnets;
  }
}
