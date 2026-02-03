/**
 * CloudFront Construct - TASK-0019
 *
 * CloudFront Distribution を作成し、S3 Origin (OAC) + ALB Origin の Multi-Origin を構成
 * - S3 Origin: 静的コンテンツ配信 (OAC 経由)
 * - ALB Origin: 動的コンテンツ配信
 * - カスタムエラーレスポンス、HTTPS 強制
 *
 * 🔵 信頼性: REQ-031, REQ-032, REQ-043, NFR-104, NFR-105
 * @module distribution/cloudfront-construct
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

// ============================================================================
// 定数定義
// ============================================================================

/** Distribution デフォルト設定 (🔵 architecture.md, 🟡 タスクノート) */
const DEFAULT_PRICE_CLASS = cloudfront.PriceClass.PRICE_CLASS_200; // 🔵
const DEFAULT_ROOT_OBJECT = 'index.html'; // 🟡
const DEFAULT_HTTP_VERSION = cloudfront.HttpVersion.HTTP2_AND_3; // 🟡
const DEFAULT_ENABLE_ERROR_PAGES = true; // 🔵 REQ-031
const DEFAULT_ERROR_PAGE_PATH = '/error.html'; // 🟡
const DEFAULT_STATIC_ASSET_PATHS = ['/static/*', '/assets/*']; // 🟡
const DEFAULT_API_PATHS = ['/api/*']; // 🟡

/** エラーレスポンス設定 (🔵 REQ-031, EDGE-001) */
const CLIENT_ERROR_TTL_SECONDS = 10;
const SERVER_ERROR_TTL_SECONDS = 0;
const CLIENT_ERROR_CODES = [403, 404];
const SERVER_ERROR_CODES = [500, 502, 503, 504];

/** ALB Origin 設定 (🔵 NFR-105) */
const ALB_HTTPS_PORT = 443;

/** envName バリデーション (🟡 既存 Construct パターン) */
const MAX_ENV_NAME_LENGTH = 20;
const ENV_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const ERROR_ENV_NAME_EMPTY = 'envName は必須です。空文字列は指定できません。';
const ERROR_ENV_NAME_LENGTH = 'envName は 20 文字以下である必要があります。';
const ERROR_ENV_NAME_INVALID_FORMAT = 'envName は小文字英数字とハイフンのみで構成されます。';

/** Origin ID (🟡 実装パターン) */
const ALB_ORIGIN_ID = 'ALBOrigin';

// ============================================================================
// インターフェース定義
// ============================================================================

/**
 * CloudFrontConstruct Props - 🔵 要件定義書・設計文書より
 */
export interface CloudFrontConstructProps {
  /** 環境名 (必須) - 小文字英数字とハイフン、1-20文字 */
  readonly envName: string;
  /** S3 バケット (必須) - TASK-0018 S3BucketConstruct.bucket */
  readonly s3Bucket: s3.IBucket;
  /** OAC (必須) - TASK-0018 S3BucketConstruct.originAccessControl */
  readonly originAccessControl: cloudfront.CfnOriginAccessControl;
  /** ALB (必須) - TASK-0016 AlbConstruct.loadBalancer */
  readonly alb: elb.IApplicationLoadBalancer;
  /** Price Class @default PRICE_CLASS_200 (🔵 architecture.md) */
  readonly priceClass?: cloudfront.PriceClass;
  /** Default Root Object @default 'index.html' (🟡) */
  readonly defaultRootObject?: string;
  /** HTTP Version @default HTTP2_AND_3 (🟡) */
  readonly httpVersion?: cloudfront.HttpVersion;
  /** エラーページ有効化 @default true (🔵 REQ-031) */
  readonly enableErrorPages?: boolean;
  /** エラーページパス @default '/error.html' (🟡) */
  readonly errorPagePath?: string;
  /** 静的アセットパス @default ['/static/*', '/assets/*'] (🟡) */
  readonly staticAssetPaths?: string[];
  /** API パス @default ['/api/*'] (🟡) */
  readonly apiPaths?: string[];
}

/**
 * CloudFront Construct - Multi-Origin Distribution (S3 OAC + ALB)
 *
 * 🔵 信頼性: REQ-031, REQ-032, REQ-043, NFR-104, NFR-105
 *
 * @example
 * const cf = new CloudFrontConstruct(this, 'CloudFront', {
 *   envName: 'dev', s3Bucket, originAccessControl, alb
 * });
 * s3Construct.addCloudFrontBucketPolicy(cf.distributionArn);
 */
export class CloudFrontConstruct extends Construct {
  /** Distribution 参照 */
  public readonly distribution: cloudfront.IDistribution;
  /** S3 バケットポリシー設定用 ARN */
  public readonly distributionArn: string;
  /** アクセス URL */
  public readonly distributionDomainName: string;
  /** キャッシュ無効化用 ID */
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props: CloudFrontConstructProps) {
    super(scope, id);

    // Props バリデーション
    this.validateEnvName(props.envName);

    // デフォルト値適用
    const priceClass = props.priceClass ?? DEFAULT_PRICE_CLASS;
    const defaultRootObject = props.defaultRootObject ?? DEFAULT_ROOT_OBJECT;
    const httpVersion = props.httpVersion ?? DEFAULT_HTTP_VERSION;
    const enableErrorPages = props.enableErrorPages ?? DEFAULT_ENABLE_ERROR_PAGES;
    const errorPagePath = props.errorPagePath ?? DEFAULT_ERROR_PAGE_PATH;
    const staticAssetPaths = props.staticAssetPaths ?? DEFAULT_STATIC_ASSET_PATHS;
    const apiPaths = props.apiPaths ?? DEFAULT_API_PATHS;

    // S3 Origin (OAC は後で L1 レベルで設定)
    const s3Origin = new origins.S3Origin(props.s3Bucket);

    // ALB Origin (HTTPS-only)
    const albOrigin = new origins.HttpOrigin(props.alb.loadBalancerDnsName, {
      originId: ALB_ORIGIN_ID,
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      httpsPort: ALB_HTTPS_PORT,
    });

    // Additional Behaviors (パスベースルーティング)
    const additionalBehaviors = this.createAdditionalBehaviors(
      s3Origin,
      albOrigin,
      staticAssetPaths,
      apiPaths
    );

    // Error Responses
    const errorResponses = enableErrorPages
      ? this.createErrorResponses(errorPagePath)
      : [];

    // CloudFront Distribution 作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: albOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
      additionalBehaviors,
      priceClass,
      defaultRootObject,
      httpVersion,
      enabled: true,
      errorResponses,
    });

    // L1 レベルで OAC 設定 (CDK L2 では未完全サポート)
    this.configureOac(distribution, props.originAccessControl);

    // 公開プロパティ設定
    this.distribution = distribution;
    this.distributionArn = `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${distribution.distributionId}`;
    this.distributionDomainName = distribution.distributionDomainName;
    this.distributionId = distribution.distributionId;
  }

  /**
   * Additional Behaviors 作成
   * @private
   */
  private createAdditionalBehaviors(
    s3Origin: origins.S3Origin,
    albOrigin: origins.HttpOrigin,
    staticAssetPaths: string[],
    apiPaths: string[]
  ): { [key: string]: cloudfront.BehaviorOptions } {
    const behaviors: { [key: string]: cloudfront.BehaviorOptions } = {};

    // 静的アセット → S3 Origin (CACHING_OPTIMIZED)
    for (const path of staticAssetPaths) {
      behaviors[path] = {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      };
    }

    // API パス → ALB Origin (CACHING_DISABLED)
    for (const path of apiPaths) {
      behaviors[path] = {
        origin: albOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      };
    }

    return behaviors;
  }

  /**
   * Custom Error Responses 作成
   * @private
   */
  private createErrorResponses(errorPagePath: string): cloudfront.ErrorResponse[] {
    const responses: cloudfront.ErrorResponse[] = [];

    // 4xx エラー (403, 404) - TTL: 10秒
    for (const httpStatus of CLIENT_ERROR_CODES) {
      responses.push({
        httpStatus,
        responseHttpStatus: 200,
        responsePagePath: errorPagePath,
        ttl: cdk.Duration.seconds(CLIENT_ERROR_TTL_SECONDS),
      });
    }

    // 5xx エラー (500, 502, 503, 504) - TTL: 0秒
    for (const httpStatus of SERVER_ERROR_CODES) {
      responses.push({
        httpStatus,
        responseHttpStatus: 200,
        responsePagePath: errorPagePath,
        ttl: cdk.Duration.seconds(SERVER_ERROR_TTL_SECONDS),
      });
    }

    return responses;
  }

  /**
   * OAC 設定 (L1 レベル)
   * @private
   */
  private configureOac(
    distribution: cloudfront.Distribution,
    oac: cloudfront.CfnOriginAccessControl
  ): void {
    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    // S3 Origin は additionalBehaviors で最初に追加されるため Index 0
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.Origins.0.OriginAccessControlId',
      oac.attrId
    );
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity',
      '' // OAC 使用時は空
    );
  }

  /**
   * envName バリデーション
   * @private
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
}
