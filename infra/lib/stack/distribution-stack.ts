/**
 * Distribution Stack 実装
 *
 * TASK-0020: Distribution Stack 統合
 * フェーズ: TDD Refactor Phase - コード品質改善
 *
 * 【機能概要】: CloudFront Distribution、S3 バケット、WAF を統合する Stack
 * 【実装方針】: S3BucketConstruct、CloudFrontConstruct、WafConstruct を組み合わせて構成
 * 【テスト対応】: TC-DS-01 〜 TC-DS-36 の全41テストケースに対応
 *
 * 【改善内容】(Refactor Phase):
 * - 未使用 import の削除
 * - PriceClass マッピングの定数化によるパフォーマンス向上
 * - Construct 生成ロジックのメソッド分離による可読性向上
 * - コメントと文書の充実
 *
 * 構成内容:
 * - S3 Bucket + OAC (静的コンテンツ配信)
 * - CloudFront Distribution (Multi-Origin: S3 + ALB)
 * - WAF WebACL (CLOUDFRONT スコープ、オプション)
 *
 * 参照した要件:
 * - REQ-031: S3 バケット、OAC、暗号化
 * - REQ-032: CloudFront Distribution、OAC 統合
 * - REQ-033: WAF WebACL (CLOUDFRONT スコープ)
 * - REQ-034: AWS Managed Rules
 * - REQ-043: Multi-Origin 構成
 * - NFR-103: WAF による保護
 * - NFR-104: パブリックアクセスブロック
 * - NFR-105: HTTPS 強制
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @module stack/distribution-stack
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import type * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../parameter';
import { S3BucketConstruct } from '../construct/storage/s3-bucket-construct';
import { CloudFrontConstruct } from '../construct/distribution/cloudfront-construct';
import { WafConstruct } from '../construct/security/waf-construct';

// ============================================================================
// 【定数定義】: バリデーションとデフォルト値
// ============================================================================

/**
 * 【envName 最大長】: 環境名の最大文字数
 *
 * 🟡 信頼性: 既存 Construct パターンから妥当な推測
 */
const MAX_ENV_NAME_LENGTH = 20;

/**
 * 【envName 正規表現】: 環境名の許可文字パターン
 *
 * 🟡 信頼性: 既存 Construct パターンから妥当な推測
 */
const ENV_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * 【デフォルト WAF 有効化】: WAF の有効/無効デフォルト値
 *
 * 🔵 信頼性: 要件定義書 REQ-033 より（デフォルトで有効）
 */
const DEFAULT_ENABLE_WAF = true;

/**
 * 【デフォルト PriceClass】: CloudFront PriceClass デフォルト値
 *
 * 🔵 信頼性: architecture.md より
 */
const DEFAULT_PRICE_CLASS = 'PriceClass_200';

/**
 * 【デフォルト エラーページ有効化】: エラーページのデフォルト値
 *
 * 🔵 信頼性: 要件定義書 REQ-031 より
 */
const DEFAULT_ENABLE_ERROR_PAGES = true;

// ============================================================================
// 【PriceClass マッピング】: 文字列から PriceClass 列挙型への変換マップ
// 🟡 信頼性: 既存 Construct パターンから妥当な推測
// 【改善】: メソッド内で毎回生成していたオブジェクトを定数として外出し
// ============================================================================

/**
 * 【PriceClass マッピング定数】: CloudFront PriceClass の文字列→列挙型変換用
 *
 * 【パフォーマンス改善】: 毎回のオブジェクト生成を回避
 * 【保守性】: 新しい PriceClass 追加時はここに追加
 *
 * 🟡 信頼性: CloudFront 仕様より
 */
const PRICE_CLASS_MAP: Readonly<Record<string, cloudfront.PriceClass>> = {
  PriceClass_100: cloudfront.PriceClass.PRICE_CLASS_100,
  PriceClass_200: cloudfront.PriceClass.PRICE_CLASS_200,
  PriceClass_All: cloudfront.PriceClass.PRICE_CLASS_ALL,
} as const;

// ============================================================================
// 【バリデーションエラーメッセージ】
// 🟡 信頼性: 既存 Construct パターンから妥当な推測
// ============================================================================

/**
 * 【エラーメッセージ: envName 空文字】
 */
const ERROR_ENV_NAME_EMPTY = 'envName は必須です。空文字列は指定できません。';

/**
 * 【エラーメッセージ: envName 長さ超過】
 */
const ERROR_ENV_NAME_LENGTH = `envName は ${MAX_ENV_NAME_LENGTH} 文字以下である必要があります。`;

/**
 * 【エラーメッセージ: envName 不正形式】
 */
const ERROR_ENV_NAME_INVALID_FORMAT =
  'envName は小文字英数字とハイフンのみで構成され、ハイフンで開始・終了できません。';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * DistributionStack の Props インターフェース
 *
 * 【設計方針】: Application Stack から ALB を受け取り、配信層を構成
 *
 * 🔵 信頼性: 要件定義書 Props インターフェースより
 *
 * @interface DistributionStackProps
 * @extends cdk.StackProps
 */
export interface DistributionStackProps extends cdk.StackProps {
  /**
   * ALB (必須)
   *
   * 【用途】: CloudFront Origin として設定
   * 【提供元】: Application Stack (TASK-0017)
   *
   * 🔵 信頼性: 要件定義書 入力インターフェースより
   */
  readonly alb: elb.IApplicationLoadBalancer;

  /**
   * ALB Security Group (必須)
   *
   * 【用途】: CloudFront からのアクセス許可設定用
   * 【提供元】: Security Stack
   *
   * 🔵 信頼性: 要件定義書 入力インターフェースより
   */
  readonly albSecurityGroup: ec2.ISecurityGroup;

  /**
   * 環境設定 (必須)
   *
   * 【用途】: envName などの環境固有設定
   * 【提供元】: parameter.ts
   *
   * 🔵 信頼性: 要件定義書 入力インターフェースより
   */
  readonly config: EnvironmentConfig;

  /**
   * WAF 有効化フラグ (オプション)
   *
   * 【用途】: WAF WebACL の作成有無
   * 【デフォルト】: true
   *
   * 🟡 信頼性: 要件定義書 オプションパラメータより
   */
  readonly enableWaf?: boolean;

  /**
   * CloudFront PriceClass (オプション)
   *
   * 【用途】: CloudFront エッジロケーション範囲
   * 【デフォルト】: 'PriceClass_200'
   *
   * 🟡 信頼性: 要件定義書 オプションパラメータより
   */
  readonly priceClass?: string;

  /**
   * エラーページ有効化フラグ (オプション)
   *
   * 【用途】: カスタムエラーレスポンスの有効/無効
   * 【デフォルト】: true
   *
   * 🟡 信頼性: 要件定義書 オプションパラメータより
   */
  readonly enableErrorPages?: boolean;
}

/**
 * Distribution Stack
 *
 * 【機能概要】: CloudFront Distribution、S3 バケット、WAF を統合する Stack
 * 【アーキテクチャ位置づけ】:
 * ```
 * VPC Stack → Security Stack → Application Stack → Distribution Stack
 *                                    ↓                    ↓
 *                                   ALB    →    CloudFront + S3 + WAF
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-031〜034, REQ-043, NFR-103〜105 に基づく実装
 *
 * @class DistributionStack
 * @extends cdk.Stack
 */
export class DistributionStack extends cdk.Stack {
  // ==========================================================================
  // 【公開プロパティ】: 他の Stack から参照可能なリソース
  // ==========================================================================

  /**
   * CloudFront Distribution
   *
   * 【用途】: Distribution 参照、キャッシュ無効化
   *
   * 🔵 信頼性: 要件定義書 出力インターフェースより
   */
  public readonly distribution: cloudfront.IDistribution;

  /**
   * Distribution ドメイン名
   *
   * 【用途】: アクセス URL
   *
   * 🔵 信頼性: 要件定義書 出力インターフェースより
   */
  public readonly distributionDomainName: string;

  /**
   * Distribution ID
   *
   * 【用途】: キャッシュ無効化、識別
   *
   * 🔵 信頼性: 要件定義書 出力インターフェースより
   */
  public readonly distributionId: string;

  /**
   * S3 Bucket
   *
   * 【用途】: 静的コンテンツアップロード
   *
   * 🔵 信頼性: 要件定義書 出力インターフェースより
   */
  public readonly bucket: s3.IBucket;

  /**
   * S3 Bucket ARN
   *
   * 【用途】: IAM ポリシー、CI/CD 設定
   *
   * 🔵 信頼性: 要件定義書 出力インターフェースより
   */
  public readonly bucketArn: string;

  /**
   * WAF WebACL (条件付き)
   *
   * 【用途】: WAF 参照（enableWaf: true の場合のみ）
   *
   * 🟡 信頼性: 要件定義書 出力インターフェースより
   */
  public readonly webAcl?: wafv2.CfnWebACL;

  /**
   * DistributionStack のコンストラクタ
   *
   * 【処理概要】: S3、CloudFront、WAF を統合して配信層を構成
   * 【設計方針】: 循環参照を解決しつつ、必要なリソースを順番に作成
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Stack の識別子
   * @param {DistributionStackProps} props - Stack 設定
   */
  constructor(scope: Construct, id: string, props: DistributionStackProps) {
    super(scope, id, props);

    // ========================================================================
    // 【Props バリデーション】: 入力パラメータの検証
    // 🟡 信頼性: 既存 Construct パターンから妥当な推測
    // ========================================================================
    this.validateEnvName(props.config.envName);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // ========================================================================
    const envName = props.config.envName;
    const enableWaf = props.enableWaf ?? DEFAULT_ENABLE_WAF;
    const priceClass = this.getPriceClass(props.priceClass);
    const enableErrorPages = props.enableErrorPages ?? DEFAULT_ENABLE_ERROR_PAGES;

    // ========================================================================
    // 【Step 1: S3BucketConstruct 作成】
    // S3 バケット + OAC を作成（循環参照解決のため先に作成）
    // 🔵 信頼性: REQ-031, REQ-032 より
    // ========================================================================
    const s3BucketConstruct = new S3BucketConstruct(this, 'S3Bucket', {
      envName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ========================================================================
    // 【Step 2: CloudFrontConstruct 作成】
    // CloudFront Distribution を作成（S3 + ALB Origin）
    // 🔵 信頼性: REQ-032, REQ-043, NFR-105 より
    // ========================================================================
    const cloudFrontConstruct = new CloudFrontConstruct(this, 'CloudFront', {
      envName,
      s3Bucket: s3BucketConstruct.bucket,
      originAccessControl: s3BucketConstruct.originAccessControl,
      alb: props.alb,
      priceClass,
      enableErrorPages,
    });

    // ========================================================================
    // 【Step 3: 循環参照解決】
    // CloudFront Distribution ARN を使って S3 バケットポリシーを追加
    // 🟡 信頼性: note.md 循環参照対応より
    // ========================================================================
    s3BucketConstruct.addCloudFrontBucketPolicy(cloudFrontConstruct.distributionArn);

    // ========================================================================
    // 【Step 4: WafConstruct 作成（条件付き）】
    // WAF WebACL を作成（CLOUDFRONT スコープ）
    // 🔵 信頼性: REQ-033, REQ-034, NFR-103 より
    // ========================================================================
    let wafConstruct: WafConstruct | undefined;
    if (enableWaf) {
      wafConstruct = new WafConstruct(this, 'Waf', {
        envName,
        scope: 'CLOUDFRONT',
        enableLogging: true,
        logRetentionDays: props.config.logRetentionDays,
      });

      // WAF と CloudFront Distribution の関連付け
      // 注意: CLOUDFRONT スコープの WAF は CfnDistribution で直接指定する必要がある
      const cfnDistribution = cloudFrontConstruct.distribution.node
        .defaultChild as cloudfront.CfnDistribution;
      cfnDistribution.addPropertyOverride(
        'DistributionConfig.WebACLId',
        wafConstruct.webAclArn
      );
    }

    // ========================================================================
    // 【公開プロパティ設定】
    // 🔵 信頼性: 要件定義書 出力インターフェースより
    // ========================================================================
    this.distribution = cloudFrontConstruct.distribution;
    this.distributionDomainName = cloudFrontConstruct.distributionDomainName;
    this.distributionId = cloudFrontConstruct.distributionId;
    this.bucket = s3BucketConstruct.bucket;
    this.bucketArn = s3BucketConstruct.bucketArn;
    this.webAcl = wafConstruct?.webAcl;

    // ========================================================================
    // 【CfnOutput 定義】
    // 他の Stack から参照可能な出力値を定義
    // 【改善】: ヘルパーメソッドに分離し、コンストラクタの可読性を向上
    // 🔵 信頼性: 要件定義書 CfnOutput より
    // ========================================================================
    this.createCfnOutputs(envName, s3BucketConstruct);
  }

  // ==========================================================================
  // 【プライベートメソッド】
  // ==========================================================================

  /**
   * envName バリデーション
   *
   * 【用途】: 環境名の妥当性検証
   * 【検証項目】:
   * - 必須チェック (空文字列不可)
   * - 長さチェック (1-20文字)
   * - 形式チェック (小文字英数字とハイフンのみ)
   *
   * @private
   * @param {string} envName - 検証対象の環境名
   * @throws {Error} バリデーションエラー
   */
  private validateEnvName(envName: string): void {
    if (!envName || envName.length === 0) {
      throw new Error(ERROR_ENV_NAME_EMPTY);
    }

    if (envName.length > MAX_ENV_NAME_LENGTH) {
      throw new Error(ERROR_ENV_NAME_LENGTH);
    }

    if (!ENV_NAME_PATTERN.test(envName)) {
      throw new Error(ERROR_ENV_NAME_INVALID_FORMAT);
    }
  }

  /**
   * PriceClass 文字列から CloudFront PriceClass 列挙型を取得
   *
   * 【用途】: 文字列から PriceClass への変換
   * 【改善内容】: マッピングオブジェクトを定数として外出しし、毎回の生成を回避
   * 【パフォーマンス】: 定数参照のみで高速
   *
   * @private
   * @param {string | undefined} priceClassStr - PriceClass 文字列
   * @returns {cloudfront.PriceClass} CloudFront PriceClass
   *
   * 🟡 信頼性: CloudFront 仕様より（定数抽出による改善）
   */
  private getPriceClass(priceClassStr: string | undefined): cloudfront.PriceClass {
    // 【マッピング参照】: 外部定義した定数マッピングを使用
    // 【フォールバック】: 無効な値の場合は PRICE_CLASS_200 をデフォルトとして使用
    return PRICE_CLASS_MAP[priceClassStr ?? DEFAULT_PRICE_CLASS] ?? cloudfront.PriceClass.PRICE_CLASS_200;
  }

  // ==========================================================================
  // 【Construct 生成ヘルパーメソッド】
  // 【改善】: Construct 生成ロジックを分離し、コンストラクタの可読性を向上
  // ==========================================================================

  /**
   * CfnOutput を一括生成する
   *
   * 【用途】: 複数の CfnOutput をまとめて生成
   * 【可読性向上】: コンストラクタから出力定義を分離
   *
   * @private
   * @param {string} envName - 環境名
   * @param {S3BucketConstruct} s3BucketConstruct - S3 バケット Construct
   *
   * 🔵 信頼性: 要件定義書 CfnOutput より（リファクタリングによる分離）
   */
  private createCfnOutputs(envName: string, s3BucketConstruct: S3BucketConstruct): void {
    // 【Distribution ドメイン名出力】
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distributionDomainName,
      description: 'CloudFront Distribution domain name',
      exportName: `${envName}-DistributionDomainName`,
    });

    // 【Distribution ID 出力】
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${envName}-DistributionId`,
    });

    // 【S3 バケット名出力】
    new cdk.CfnOutput(this, 'StaticContentBucket', {
      value: s3BucketConstruct.bucketName,
      description: 'S3 bucket name for static content',
      exportName: `${envName}-StaticContentBucket`,
    });

    // 【S3 バケット ARN 出力】
    new cdk.CfnOutput(this, 'StaticContentBucketArn', {
      value: this.bucketArn,
      description: 'S3 bucket ARN for static content',
      exportName: `${envName}-StaticContentBucketArn`,
    });
  }
}
