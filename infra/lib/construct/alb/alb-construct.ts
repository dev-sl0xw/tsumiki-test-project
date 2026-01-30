/**
 * ALB Construct 実装
 *
 * TASK-0016: ALB Construct 実装
 * フェーズ: TDD Green Phase - テストを通すための最小実装
 *
 * 【機能概要】: Internet-facing ALB を作成し、ECS Service にトラフィックをルーティング
 * 【実装方針】: HTTPS 強制、ACM 証明書による TLS 終端、ヘルスチェック設定
 * 【テスト対応】: TC-ALB-01 〜 TC-ALB-24 の全24テストケースに対応
 *
 * 構成内容:
 * - Internet-facing ALB (Public Subnet 配置) (REQ-028)
 * - HTTP → HTTPS リダイレクト (REQ-029)
 * - ACM 証明書による TLS 終端 (REQ-030)
 * - Target Group (IP ベース、Fargate 用)
 * - ヘルスチェック設定
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-028〜030, NFR-001, NFR-105 に基づく実装
 *
 * @module alb/alb-construct
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: ALB 構成のデフォルト値
// 🔵 信頼性: REQ-028, REQ-029, REQ-030 より
// ============================================================================

/**
 * 【HTTP ポート番号】: HTTP Listener のポート
 *
 * 【設定値】: 80
 * 【根拠】: REQ-029 により HTTP リクエストを受け付け、HTTPS へリダイレクト
 *
 * 🔵 信頼性: REQ-029 より
 */
const PORT_HTTP = 80;

/**
 * 【HTTPS ポート番号】: HTTPS Listener のポート
 *
 * 【設定値】: 443
 * 【根拠】: REQ-028 により HTTPS で TLS 終端
 *
 * 🔵 信頼性: REQ-028 より
 */
const PORT_HTTPS = 443;

/**
 * 【デフォルト Target Port】: Target Group のポート
 *
 * 【設定値】: 80
 * 【根拠】: 要件定義書で指定されたデフォルトポート
 *
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_TARGET_PORT = 80;

/**
 * 【デフォルト Health Check Path】: ヘルスチェックパス
 *
 * 【設定値】: '/health'
 * 【根拠】: 一般的なヘルスチェックエンドポイント
 *
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_HEALTH_CHECK_PATH = '/health';

/**
 * 【デフォルト Healthy Threshold】: ヘルシー判定閾値
 *
 * 【設定値】: 2
 * 【根拠】: AWS デフォルト値
 *
 * 🟡 信頼性: AWS デフォルト値から妥当な推測
 */
const DEFAULT_HEALTHY_THRESHOLD = 2;

/**
 * 【デフォルト Unhealthy Threshold】: アンヘルシー判定閾値
 *
 * 【設定値】: 2
 * 【根拠】: AWS デフォルト値
 *
 * 🟡 信頼性: AWS デフォルト値から妥当な推測
 */
const DEFAULT_UNHEALTHY_THRESHOLD = 2;

/**
 * 【デフォルト Health Check Timeout】: ヘルスチェックタイムアウト（秒）
 *
 * 【設定値】: 5
 * 【根拠】: AWS デフォルト値
 *
 * 🟡 信頼性: AWS デフォルト値から妥当な推測
 */
const DEFAULT_HEALTH_CHECK_TIMEOUT = 5;

/**
 * 【デフォルト Health Check Interval】: ヘルスチェックインターバル（秒）
 *
 * 【設定値】: 30
 * 【根拠】: AWS デフォルト値
 *
 * 🟡 信頼性: AWS デフォルト値から妥当な推測
 */
const DEFAULT_HEALTH_CHECK_INTERVAL = 30;

/**
 * 【デフォルト Internet Facing】: Internet-facing 設定
 *
 * 【設定値】: true
 * 【根拠】: REQ-028 により Internet-facing ALB
 *
 * 🔵 信頼性: REQ-028 より
 */
const DEFAULT_INTERNET_FACING = true;

/**
 * 【デフォルト HTTP to HTTPS Redirect】: HTTP→HTTPS リダイレクト
 *
 * 【設定値】: true
 * 【根拠】: REQ-029 により HTTP リクエストは HTTPS へリダイレクト
 *
 * 🔵 信頼性: REQ-029 より
 */
const DEFAULT_HTTP_TO_HTTPS_REDIRECT = true;

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * Health Check 設定インターフェース
 *
 * 【設計方針】: オプショナルパラメータ（デフォルト値提供）
 *
 * 🟡 信頼性: interfaces.ts から妥当な推測
 *
 * @interface HealthCheckConfig
 */
export interface HealthCheckConfig {
  /**
   * ヘルシー判定閾値
   *
   * 🟡 信頼性: AWS デフォルト値から妥当な推測
   *
   * @default 2
   */
  readonly healthyThresholdCount?: number;

  /**
   * アンヘルシー判定閾値
   *
   * 🟡 信頼性: AWS デフォルト値から妥当な推測
   *
   * @default 2
   */
  readonly unhealthyThresholdCount?: number;

  /**
   * タイムアウト（秒）
   *
   * 🟡 信頼性: AWS デフォルト値から妥当な推測
   *
   * @default 5
   */
  readonly timeout?: number;

  /**
   * インターバル（秒）
   *
   * 🟡 信頼性: AWS デフォルト値から妥当な推測
   *
   * @default 30
   */
  readonly interval?: number;
}

/**
 * AlbConstruct の Props インターフェース
 *
 * 【設計方針】: 必須パラメータ + オプショナルパラメータ（デフォルト値提供）
 * 【再利用性】: 様々な ALB 構成に対応
 *
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface AlbConstructProps
 */
export interface AlbConstructProps {
  /**
   * VPC (必須)
   *
   * 【用途】: ALB を配置する VPC
   * 【参照元】: VpcConstruct.vpc プロパティから取得
   *
   * 🔵 信頼性: REQ-028 より
   *
   * @type {ec2.IVpc}
   */
  readonly vpc: ec2.IVpc;

  /**
   * Security Group (必須)
   *
   * 【用途】: ALB のネットワークセキュリティ設定
   * 【参照元】: SecurityGroupConstruct.albSecurityGroup プロパティから取得
   *
   * 🔵 信頼性: TASK-0005 より
   *
   * @type {ec2.ISecurityGroup}
   */
  readonly securityGroup: ec2.ISecurityGroup;

  /**
   * ACM Certificate ARN (必須)
   *
   * 【用途】: HTTPS Listener の TLS 証明書
   * 【制約】: ALB と同じリージョンに存在する ACM 証明書
   *
   * 🔵 信頼性: REQ-030 より
   *
   * @type {string}
   */
  readonly certificateArn: string;

  /**
   * Load Balancer 名 (オプション)
   *
   * 【用途】: ALB の識別名
   * 【デフォルト】: 自動生成（CDK が論理 ID から生成）
   *
   * 🟡 信頼性: interfaces.ts から妥当な推測
   *
   * @default 自動生成
   * @type {string}
   */
  readonly loadBalancerName?: string;

  /**
   * Target Port (オプション)
   *
   * 【用途】: Target Group のポート
   * 【デフォルト】: 80
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @default 80
   */
  readonly targetPort?: number;

  /**
   * Health Check Path (オプション)
   *
   * 【用途】: ヘルスチェックのパス
   * 【デフォルト】: '/health'
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @default '/health'
   */
  readonly healthCheckPath?: string;

  /**
   * Health Check 詳細設定 (オプション)
   *
   * 【用途】: ヘルスチェックの詳細パラメータ
   *
   * 🟡 信頼性: interfaces.ts から妥当な推測
   *
   * @default デフォルト値適用
   */
  readonly healthCheck?: HealthCheckConfig;

  /**
   * HTTP → HTTPS リダイレクト有効化 (オプション)
   *
   * 【用途】: HTTP リクエストを HTTPS へリダイレクト
   * 【デフォルト】: true
   *
   * 🔵 信頼性: REQ-029 より
   *
   * @default true
   */
  readonly enableHttpToHttpsRedirect?: boolean;

  /**
   * Internet Facing (オプション)
   *
   * 【用途】: ALB を Internet-facing にするか
   * 【デフォルト】: true
   *
   * 🔵 信頼性: REQ-028 より
   *
   * @default true
   */
  readonly internetFacing?: boolean;
}

/**
 * ALB Construct
 *
 * 【機能概要】: Internet-facing ALB を作成する Construct
 * 【実装方針】: HTTPS 強制、ACM 証明書による TLS 終端
 *
 * アーキテクチャ位置づけ:
 * ```
 * VPC Stack → Security Stack → Application Stack
 *                               ↓
 *                           ECS Cluster → Task Definition → Service
 *                               ↓                            ↑
 *                              ALB ←────────────────────────┘
 *                               ↑       本 Construct
 *                           CloudFront (Distribution Stack)
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-028〜030 に基づく実装
 *
 * @class AlbConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * const albConstruct = new AlbConstruct(this, 'Alb', {
 *   vpc: vpcConstruct.vpc,
 *   securityGroup: securityGroupConstruct.albSecurityGroup,
 *   certificateArn: 'arn:aws:acm:ap-northeast-1:123456789012:certificate/xxx',
 * });
 *
 * // ECS Service との連携
 * const ecsService = new EcsServiceConstruct(this, 'Service', {
 *   targetGroup: albConstruct.targetGroup,
 *   // ...
 * });
 * ```
 */
export class AlbConstruct extends Construct {
  /**
   * 【プロパティ】: Application Load Balancer
   *
   * 【用途】: CloudFront Origin、DNS 設定など後続処理で参照
   *
   * 🔵 信頼性: 要件定義書より
   *
   * @readonly
   * @type {elb.IApplicationLoadBalancer}
   */
  public readonly loadBalancer: elb.IApplicationLoadBalancer;

  /**
   * 【プロパティ】: Target Group
   *
   * 【用途】: ECS Service 連携で参照
   *
   * 🔵 信頼性: 要件定義書より
   *
   * @readonly
   * @type {elb.IApplicationTargetGroup}
   */
  public readonly targetGroup: elb.IApplicationTargetGroup;

  /**
   * 【プロパティ】: HTTPS Listener
   *
   * 【用途】: 追加ルール設定などで参照
   *
   * 🔵 信頼性: 要件定義書より
   *
   * @readonly
   * @type {elb.IApplicationListener}
   */
  public readonly httpsListener: elb.IApplicationListener;

  /**
   * 【プロパティ】: HTTP Listener
   *
   * 【用途】: リダイレクト設定の参照
   *
   * 🔵 信頼性: 要件定義書より
   *
   * @readonly
   * @type {elb.IApplicationListener}
   */
  public readonly httpListener: elb.IApplicationListener;

  /**
   * 【プロパティ】: DNS Name
   *
   * 【用途】: CloudFront Origin 設定で参照
   *
   * 🔵 信頼性: 要件定義書より
   *
   * @readonly
   * @type {string}
   */
  public readonly dnsName: string;

  /**
   * AlbConstruct のコンストラクタ
   *
   * 【処理概要】: Internet-facing ALB を作成し、Listener と Target Group を設定
   * 【設計方針】: デフォルト値を適用しつつ、カスタマイズ可能に
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {AlbConstructProps} props - ALB 設定
   */
  constructor(scope: Construct, id: string, props: AlbConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: REQ-028, REQ-029, REQ-030 より
    // ========================================================================
    const internetFacing = props.internetFacing ?? DEFAULT_INTERNET_FACING;
    const enableHttpToHttpsRedirect =
      props.enableHttpToHttpsRedirect ?? DEFAULT_HTTP_TO_HTTPS_REDIRECT;
    const targetPort = props.targetPort ?? DEFAULT_TARGET_PORT;
    const healthCheckPath = props.healthCheckPath ?? DEFAULT_HEALTH_CHECK_PATH;

    // Health Check 設定のデフォルト値適用
    const healthyThresholdCount =
      props.healthCheck?.healthyThresholdCount ?? DEFAULT_HEALTHY_THRESHOLD;
    const unhealthyThresholdCount =
      props.healthCheck?.unhealthyThresholdCount ?? DEFAULT_UNHEALTHY_THRESHOLD;
    const healthCheckTimeout =
      props.healthCheck?.timeout ?? DEFAULT_HEALTH_CHECK_TIMEOUT;
    const healthCheckInterval =
      props.healthCheck?.interval ?? DEFAULT_HEALTH_CHECK_INTERVAL;

    // ========================================================================
    // 【ACM Certificate 参照】: 指定された ARN から証明書を取得
    // 🔵 信頼性: REQ-030 より
    // ========================================================================
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      props.certificateArn
    );

    // ========================================================================
    // 【ALB 作成】: Application Load Balancer を作成
    // 🔵 信頼性: REQ-028 より
    // ========================================================================
    const alb = new elb.ApplicationLoadBalancer(this, 'Alb', {
      // 【VPC 設定】: ALB を配置する VPC
      // 🔵 信頼性: REQ-028 より
      vpc: props.vpc,

      // 【Internet-facing 設定】: 外部からアクセス可能
      // 🔵 信頼性: REQ-028 より
      internetFacing: internetFacing,

      // 【Security Group 設定】: ネットワークセキュリティ
      // 🔵 信頼性: TASK-0005 より
      securityGroup: props.securityGroup,

      // 【Load Balancer 名設定】: 指定された名前または undefined（CDK が自動生成）
      // 🟡 信頼性: interfaces.ts から妥当な推測
      loadBalancerName: props.loadBalancerName,

      // 【VPC Subnet 設定】: Public Subnet に配置
      // 🔵 信頼性: REQ-028 より
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // ========================================================================
    // 【Target Group 作成】: ECS Service 連携用 Target Group
    // 🔵 信頼性: REQ-028 より
    // ========================================================================
    const targetGroup = new elb.ApplicationTargetGroup(this, 'TargetGroup', {
      // 【VPC 設定】: Target Group を配置する VPC
      vpc: props.vpc,

      // 【ポート設定】: ターゲットポート
      // 🟡 信頼性: 設計文書から妥当な推測
      port: targetPort,

      // 【プロトコル設定】: HTTP プロトコル
      protocol: elb.ApplicationProtocol.HTTP,

      // 【ターゲットタイプ設定】: IP ベース（Fargate 用）
      // 🔵 信頼性: 設計文書より
      targetType: elb.TargetType.IP,

      // 【ヘルスチェック設定】
      // 🟡 信頼性: 設計文書から妥当な推測
      healthCheck: {
        path: healthCheckPath,
        healthyThresholdCount: healthyThresholdCount,
        unhealthyThresholdCount: unhealthyThresholdCount,
        timeout: cdk.Duration.seconds(healthCheckTimeout),
        interval: cdk.Duration.seconds(healthCheckInterval),
      },
    });

    // ========================================================================
    // 【HTTPS Listener 作成】: TLS 終端 Listener
    // 🔵 信頼性: REQ-028, REQ-030 より
    // ========================================================================
    const httpsListener = alb.addListener('HttpsListener', {
      // 【ポート設定】: 443
      // 🔵 信頼性: REQ-028 より
      port: PORT_HTTPS,

      // 【プロトコル設定】: HTTPS
      protocol: elb.ApplicationProtocol.HTTPS,

      // 【証明書設定】: ACM 証明書
      // 🔵 信頼性: REQ-030 より
      certificates: [certificate],

      // 【デフォルトアクション】: Target Group へ転送
      defaultTargetGroups: [targetGroup],

      // 【SSL Policy 設定】: TLS 1.2 以上を使用
      // 🔵 信頼性: NFR-105 より
      sslPolicy: elb.SslPolicy.RECOMMENDED_TLS,
    });

    // ========================================================================
    // 【HTTP Listener 作成】: HTTP → HTTPS リダイレクト Listener
    // 🔵 信頼性: REQ-029 より
    // ========================================================================
    let httpListener: elb.ApplicationListener;

    if (enableHttpToHttpsRedirect) {
      // リダイレクト有効時: HTTPS へリダイレクト
      httpListener = alb.addListener('HttpListener', {
        // 【ポート設定】: 80
        // 🔵 信頼性: REQ-029 より
        port: PORT_HTTP,

        // 【プロトコル設定】: HTTP
        protocol: elb.ApplicationProtocol.HTTP,

        // 【デフォルトアクション】: HTTPS へリダイレクト
        // 🔵 信頼性: REQ-029 より
        defaultAction: elb.ListenerAction.redirect({
          protocol: 'HTTPS',
          port: PORT_HTTPS.toString(),
          permanent: true, // HTTP 301 永続リダイレクト
        }),
      });
    } else {
      // リダイレクト無効時: Target Group へ転送
      httpListener = alb.addListener('HttpListener', {
        port: PORT_HTTP,
        protocol: elb.ApplicationProtocol.HTTP,
        defaultTargetGroups: [targetGroup],
      });
    }

    // ========================================================================
    // 【プロパティ設定】: 公開プロパティに値を設定
    // 🔵 信頼性: 要件定義書より
    // ========================================================================
    this.loadBalancer = alb;
    this.targetGroup = targetGroup;
    this.httpsListener = httpsListener;
    this.httpListener = httpListener;
    this.dnsName = alb.loadBalancerDnsName;
  }
}
