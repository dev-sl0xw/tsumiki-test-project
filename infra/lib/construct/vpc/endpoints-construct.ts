/**
 * VPC Endpoints Construct 実装
 *
 * TASK-0003: VPC Endpoints Construct 実装
 * フェーズ: TDD Refactor Phase - コード品質の改善
 *
 * 【機能概要】: VPC Endpoint を一元管理する CDK Construct
 * 【設計方針】: AWS サービスへの VPC 内部通信を最適化し、NAT Gateway 経由のコストを削減
 * 【テスト対応】: TC-VPCE-01 〜 TC-VPCE-18 の 29 テストケースに対応
 * 【改善内容】: Endpoint ID の定数化、JSDoc コメントの強化
 * 🔵 信頼性レベル: 要件定義書 REQ-008 〜 REQ-011 に基づく実装
 *
 * @module EndpointsConstruct
 */

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: Endpoint ID の定数化 (DRY 原則)
// 🔵 信頼性: Refactor フェーズで追加した保守性向上のための定数
// ============================================================================

/**
 * VPC Endpoint の CDK Construct ID を定義する定数オブジェクト
 *
 * 【設計方針】: ハードコーディングを避け、一元管理することで保守性を向上
 * 【用途】: vpc.addInterfaceEndpoint() / vpc.addGatewayEndpoint() の ID パラメータ
 * 🔵 信頼性: Refactor フェーズで追加
 */
const ENDPOINT_IDS = {
  /** SSM Session Manager API 用 Endpoint ID */
  SSM: 'SsmEndpoint',
  /** SSM Session Manager メッセージ用 Endpoint ID */
  SSM_MESSAGES: 'SsmMessagesEndpoint',
  /** SSM エージェントメッセージ用 Endpoint ID */
  EC2_MESSAGES: 'Ec2MessagesEndpoint',
  /** ECR API 用 Endpoint ID */
  ECR_API: 'EcrApiEndpoint',
  /** ECR Docker レジストリ用 Endpoint ID */
  ECR_DKR: 'EcrDkrEndpoint',
  /** CloudWatch Logs 用 Endpoint ID */
  LOGS: 'LogsEndpoint',
  /** S3 Gateway Endpoint ID */
  S3: 'S3Endpoint',
} as const;

/**
 * EndpointsConstruct の Props インターフェース
 *
 * 【設計方針】: VPC を必須とし、各 Endpoint の有効化フラグをオプションで提供
 * 【デフォルト値】: すべてのフラグはデフォルトで true（全 Endpoint を作成）
 * 🔵 信頼性: note.md の実装インターフェースより
 *
 * @interface EndpointsConstructProps
 */
export interface EndpointsConstructProps {
  /**
   * VPC への参照（必須）
   * 🔵 信頼性: 要件定義書より必須パラメータ
   */
  readonly vpc: ec2.IVpc;

  /**
   * SSM Endpoints を作成するかどうか
   * @default true
   * 🟡 信頼性: 実装設計から妥当な推測
   */
  readonly enableSsm?: boolean;

  /**
   * ECR Endpoints を作成するかどうか
   * @default true
   * 🟡 信頼性: 実装設計から妥当な推測
   */
  readonly enableEcr?: boolean;

  /**
   * CloudWatch Logs Endpoint を作成するかどうか
   * @default true
   * 🟡 信頼性: 実装設計から妥当な推測
   */
  readonly enableLogs?: boolean;

  /**
   * S3 Gateway Endpoint を作成するかどうか
   * @default true
   * 🟡 信頼性: 実装設計から妥当な推測
   */
  readonly enableS3?: boolean;
}

/**
 * VPC Endpoints Construct
 *
 * 【機能概要】: VPC Endpoint を一元管理する Construct
 * 【実装方針】: AWS CDK の VPC メソッドを使用して各種 Endpoint を作成
 * 【テスト対応】: TC-VPCE-01 〜 TC-VPCE-18 の全テストケースに対応
 *
 * 作成する Endpoint:
 * - SSM Interface Endpoints: ssm, ssmmessages, ec2messages (REQ-008)
 * - ECR Interface Endpoints: ecr.api, ecr.dkr (REQ-009)
 * - CloudWatch Logs Interface Endpoint: logs (REQ-010)
 * - S3 Gateway Endpoint (REQ-011)
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class EndpointsConstruct
 * @extends Construct
 */
export class EndpointsConstruct extends Construct {
  // ==========================================================================
  // 【公開プロパティ】: 作成された VPC Endpoint への参照
  // 【設計方針】: 外部から各 Endpoint を参照可能にし、追加の設定を可能にする
  // 🔵 信頼性: note.md の実装インターフェースより
  // ==========================================================================

  /**
   * SSM Interface Endpoint (ssm)
   *
   * 【機能概要】: AWS Systems Manager Session Manager の API 呼び出し用 Endpoint
   * 【用途】: ECS Exec で Fargate タスクへの SSH ライクな接続を可能にする
   * 【配置先】: Private App Subnet (PRIVATE_WITH_EGRESS)
   * 【関連サービス】: SSM Session Manager, ECS Exec
   * 【課金】: $0.01/時間 + データ処理料金
   *
   * @remarks enableSsm=false の場合は undefined
   * 🔵 信頼性: 要件定義書 REQ-008 に基づく
   */
  public readonly ssmEndpoint?: ec2.IInterfaceVpcEndpoint;

  /**
   * SSM Messages Interface Endpoint (ssmmessages)
   *
   * 【機能概要】: SSM Session Manager のメッセージ送受信用 Endpoint
   * 【用途】: セッション確立後のコマンド送信・出力受信
   * 【配置先】: Private App Subnet (PRIVATE_WITH_EGRESS)
   * 【関連サービス】: SSM Session Manager
   * 【課金】: $0.01/時間 + データ処理料金
   *
   * @remarks enableSsm=false の場合は undefined
   * 🔵 信頼性: 要件定義書 REQ-008 に基づく
   */
  public readonly ssmMessagesEndpoint?: ec2.IInterfaceVpcEndpoint;

  /**
   * EC2 Messages Interface Endpoint (ec2messages)
   *
   * 【機能概要】: SSM エージェントのメッセージ通信用 Endpoint
   * 【用途】: EC2/ECS タスクと SSM サービス間の通信
   * 【配置先】: Private App Subnet (PRIVATE_WITH_EGRESS)
   * 【関連サービス】: SSM Agent
   * 【課金】: $0.01/時間 + データ処理料金
   *
   * @remarks enableSsm=false の場合は undefined
   * 🔵 信頼性: 要件定義書 REQ-008 に基づく
   */
  public readonly ec2MessagesEndpoint?: ec2.IInterfaceVpcEndpoint;

  /**
   * ECR API Interface Endpoint (ecr.api)
   *
   * 【機能概要】: Amazon ECR API 呼び出し用 Endpoint
   * 【用途】: Docker イメージのメタデータ取得、認証トークン取得
   * 【配置先】: Private App Subnet (PRIVATE_WITH_EGRESS)
   * 【関連サービス】: Amazon ECR, ECS Fargate
   * 【課金】: $0.01/時間 + データ処理料金
   *
   * @remarks enableEcr=false の場合は undefined
   * 🔵 信頼性: 要件定義書 REQ-009 に基づく
   */
  public readonly ecrApiEndpoint?: ec2.IInterfaceVpcEndpoint;

  /**
   * ECR Docker Interface Endpoint (ecr.dkr)
   *
   * 【機能概要】: Docker イメージの Pull 用 Endpoint
   * 【用途】: ECS タスク起動時のコンテナイメージ取得
   * 【配置先】: Private App Subnet (PRIVATE_WITH_EGRESS)
   * 【関連サービス】: Amazon ECR, Docker Registry
   * 【課金】: $0.01/時間 + データ処理料金
   *
   * @remarks enableEcr=false の場合は undefined
   * 🔵 信頼性: 要件定義書 REQ-009 に基づく
   */
  public readonly ecrDkrEndpoint?: ec2.IInterfaceVpcEndpoint;

  /**
   * CloudWatch Logs Interface Endpoint (logs)
   *
   * 【機能概要】: CloudWatch Logs へのログ送信用 Endpoint
   * 【用途】: ECS タスクのアプリケーションログを CloudWatch Logs に送信
   * 【配置先】: Private App Subnet (PRIVATE_WITH_EGRESS)
   * 【関連サービス】: Amazon CloudWatch Logs, ECS Fargate
   * 【課金】: $0.01/時間 + データ処理料金
   *
   * @remarks enableLogs=false の場合は undefined
   * 🔵 信頼性: 要件定義書 REQ-010 に基づく
   */
  public readonly logsEndpoint?: ec2.IInterfaceVpcEndpoint;

  /**
   * S3 Gateway Endpoint
   *
   * 【機能概要】: Amazon S3 へのアクセス用 Gateway Endpoint
   * 【用途】: ECR イメージレイヤー取得、アプリケーションの S3 アクセス
   * 【配置先】: Private App Subnet + Private DB Subnet の Route Table
   * 【関連サービス】: Amazon S3, Amazon ECR (イメージレイヤー)
   * 【課金】: 無料（Gateway Endpoint は課金なし）
   * 【コスト効果】: NAT Gateway 経由の S3 データ転送コストを削減
   *
   * @remarks enableS3=false の場合は undefined
   * 🔵 信頼性: 要件定義書 REQ-011 に基づく
   */
  public readonly s3Endpoint?: ec2.IGatewayVpcEndpoint;

  /**
   * コンストラクタ
   *
   * 【処理概要】: Props に基づいて VPC Endpoints を作成
   * 【設計方針】: フラグが true（またはデフォルト）の場合に Endpoint を作成
   *
   * @param scope - 親となる Construct
   * @param id - このConstruct の識別子
   * @param props - EndpointsConstruct の Props
   */
  constructor(scope: Construct, id: string, props: EndpointsConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【デフォルト値適用】: Props のデフォルト値を適用
    // 🟡 信頼性: 実装設計から妥当な推測
    // ========================================================================
    const enableSsm = props.enableSsm ?? true;
    const enableEcr = props.enableEcr ?? true;
    const enableLogs = props.enableLogs ?? true;
    const enableS3 = props.enableS3 ?? true;

    // 【VPC 参照】: 渡された VPC を使用
    const vpc = props.vpc;

    // 【Interface Endpoint 配置先】: Private App Subnet (PRIVATE_WITH_EGRESS)
    // 🔵 信頼性: note.md の配置設計より
    const interfaceEndpointSubnets: ec2.SubnetSelection = {
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    };

    // ========================================================================
    // 【SSM Interface Endpoints 作成】: enableSsm=true の場合に作成
    // 【対応要件】: REQ-008 - Systems Manager 用 VPC Endpoint を作成
    // 🔵 信頼性: 要件定義書 REQ-008 に基づく
    // ========================================================================
    if (enableSsm) {
      // 【ssm Endpoint】: SSM Session Manager API 用
      this.ssmEndpoint = vpc.addInterfaceEndpoint(ENDPOINT_IDS.SSM, {
        service: ec2.InterfaceVpcEndpointAwsService.SSM,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });

      // 【ssmmessages Endpoint】: SSM Session Manager メッセージ用
      this.ssmMessagesEndpoint = vpc.addInterfaceEndpoint(ENDPOINT_IDS.SSM_MESSAGES, {
        service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });

      // 【ec2messages Endpoint】: SSM エージェントメッセージ用
      this.ec2MessagesEndpoint = vpc.addInterfaceEndpoint(ENDPOINT_IDS.EC2_MESSAGES, {
        service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
    }

    // ========================================================================
    // 【ECR Interface Endpoints 作成】: enableEcr=true の場合に作成
    // 【対応要件】: REQ-009 - ECR 用 VPC Endpoint を作成
    // 🔵 信頼性: 要件定義書 REQ-009 に基づく
    // ========================================================================
    if (enableEcr) {
      // 【ecr.api Endpoint】: ECR API 用（イメージメタデータ取得）
      this.ecrApiEndpoint = vpc.addInterfaceEndpoint(ENDPOINT_IDS.ECR_API, {
        service: ec2.InterfaceVpcEndpointAwsService.ECR,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });

      // 【ecr.dkr Endpoint】: Docker イメージ Pull 用
      this.ecrDkrEndpoint = vpc.addInterfaceEndpoint(ENDPOINT_IDS.ECR_DKR, {
        service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
    }

    // ========================================================================
    // 【CloudWatch Logs Interface Endpoint 作成】: enableLogs=true の場合に作成
    // 【対応要件】: REQ-010 - CloudWatch Logs 用 VPC Endpoint を作成
    // 🔵 信頼性: 要件定義書 REQ-010 に基づく
    // ========================================================================
    if (enableLogs) {
      // 【logs Endpoint】: ECS タスクのログ送信用
      this.logsEndpoint = vpc.addInterfaceEndpoint(ENDPOINT_IDS.LOGS, {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: interfaceEndpointSubnets,
        privateDnsEnabled: true,
      });
    }

    // ========================================================================
    // 【S3 Gateway Endpoint 作成】: enableS3=true の場合に作成
    // 【対応要件】: REQ-011 - S3 用 Gateway Endpoint を作成
    // 【コスト効果】: Gateway Endpoint は無料、NAT Gateway 経由の転送コスト削減
    // 🔵 信頼性: 要件定義書 REQ-011 に基づく
    // ========================================================================
    if (enableS3) {
      // 【s3 Gateway Endpoint】: ECR イメージレイヤー取得 & S3 アクセス用
      // 【Route Table 関連付け】: Private App Subnet と Private DB Subnet 両方に関連付け
      this.s3Endpoint = vpc.addGatewayEndpoint(ENDPOINT_IDS.S3, {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        subnets: [
          { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
          { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        ],
      });
    }
  }
}
