/**
 * S3 Bucket Construct 実装
 *
 * TASK-0018: S3 + OAC Construct 実装
 * フェーズ: TDD Green Phase - テストを通すための最小実装
 *
 * 【機能概要】: 静的コンテンツおよび Sorry Page 提供用の S3 バケット作成
 * 【実装方針】: パブリックアクセス完全ブロック、CloudFront OAC 経由のみアクセス可能
 * 【テスト対応】: TC-S3-001 〜 TC-SNAP-001 の全29テストケースに対応
 *
 * 構成内容:
 * - S3 バケット (パブリックアクセスブロック、暗号化、バージョニング) (REQ-031)
 * - CloudFront OAC (Origin Access Control) (REQ-032)
 * - CloudFront 署名付きリクエストのみ許可するバケットポリシー (REQ-032)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-031, REQ-032, NFR-104 に基づく実装
 *
 * @module storage/s3-bucket-construct
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: S3 バケット構成のデフォルト値
// 🔵 信頼性: REQ-031, REQ-032 より
// ============================================================================

/**
 * 【デフォルト バケット名サフィックス】: S3 バケット名のサフィックス
 *
 * 【設定値】: 'static-content'
 * 【根拠】: 静的コンテンツ配信用バケットであることを明示
 *
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_BUCKET_NAME_SUFFIX = 'static-content';

/**
 * 【デフォルト バージョニング】: S3 バケットのバージョニング設定
 *
 * 【設定値】: true
 * 【根拠】: REQ-031 によりバージョニング有効化
 *
 * 🔵 信頼性: REQ-031 より
 */
const DEFAULT_VERSIONED = true;

/**
 * 【デフォルト 削除ポリシー】: Stack 削除時のバケット処理
 *
 * 【設定値】: RETAIN
 * 【根拠】: 本番環境でのデータ保護
 *
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_REMOVAL_POLICY = cdk.RemovalPolicy.RETAIN;

/**
 * 【デフォルト 自動削除】: Stack 削除時のオブジェクト削除
 *
 * 【設定値】: false
 * 【根拠】: 安全なデフォルト
 *
 * 🟡 信頼性: 設計文書から妥当な推測
 */
const DEFAULT_AUTO_DELETE_OBJECTS = false;

/**
 * 【envName 最大長】: 環境名の最大文字数
 *
 * 【設定値】: 20
 * 【根拠】: S3 バケット名の制限に基づく妥当な長さ
 *
 * 🟡 信頼性: 既存 Construct パターンから妥当な推測
 */
const MAX_ENV_NAME_LENGTH = 20;

/**
 * 【envName 正規表現】: 環境名の許可文字パターン
 *
 * 【設定値】: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
 * 【根拠】: 小文字英数字とハイフンのみ、ハイフンで開始・終了不可
 *
 * 🟡 信頼性: S3 バケット名の制限から妥当な推測
 */
const ENV_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

// ============================================================================
// 【OAC 設定定数】: Origin Access Control のデフォルト設定値
// 🔵 信頼性: REQ-032 より
// ============================================================================

/**
 * 【OAC Signing Behavior】: 署名動作の設定値
 *
 * 【設定値】: 'always'
 * 【根拠】: REQ-032 により常に署名が必要
 *
 * 🔵 信頼性: REQ-032 より
 */
const OAC_SIGNING_BEHAVIOR = 'always' as const;

/**
 * 【OAC Signing Protocol】: 署名プロトコルの設定値
 *
 * 【設定値】: 'sigv4'
 * 【根拠】: REQ-032 により AWS Signature Version 4 を使用
 *
 * 🔵 信頼性: REQ-032 より
 */
const OAC_SIGNING_PROTOCOL = 'sigv4' as const;

/**
 * 【OAC Origin Type】: Origin タイプの設定値
 *
 * 【設定値】: 's3'
 * 【根拠】: REQ-032 により S3 オリジンを使用
 *
 * 🔵 信頼性: REQ-032 より
 */
const OAC_ORIGIN_TYPE = 's3' as const;

// ============================================================================
// 【バケットポリシー定数】: CloudFront アクセス許可設定
// 🔵 信頼性: REQ-032 より
// ============================================================================

/**
 * 【バケットポリシー SID】: ポリシーステートメント識別子
 *
 * 【設定値】: 'AllowCloudFrontServicePrincipal'
 * 【根拠】: CloudFront サービスプリンシパルからのアクセス許可を識別
 *
 * 🔵 信頼性: REQ-032 より
 */
const BUCKET_POLICY_SID = 'AllowCloudFrontServicePrincipal' as const;

/**
 * 【CloudFront Service Principal】: CloudFront サービスプリンシパル
 *
 * 【設定値】: 'cloudfront.amazonaws.com'
 * 【根拠】: REQ-032 により CloudFront からのアクセスのみ許可
 *
 * 🔵 信頼性: REQ-032 より
 */
const CLOUDFRONT_SERVICE_PRINCIPAL = 'cloudfront.amazonaws.com' as const;

/**
 * 【S3 GetObject Action】: S3 GetObject アクション
 *
 * 【設定値】: 's3:GetObject'
 * 【根拠】: REQ-032 により読み取りアクセスのみ許可
 *
 * 🔵 信頼性: REQ-032 より
 */
const S3_GET_OBJECT_ACTION = 's3:GetObject' as const;

// ============================================================================
// 【バリデーションエラーメッセージ】: Props 検証エラーメッセージ
// 🟡 信頼性: 既存 Construct パターンから妥当な推測
// ============================================================================

/**
 * 【envName 空文字エラー】: envName が空の場合のエラーメッセージ
 *
 * 🟡 信頼性: 既存 Construct パターンから妥当な推測
 */
const ERROR_ENV_NAME_EMPTY = 'envName は必須です。空文字列は指定できません。';

/**
 * 【envName 長さ超過エラー】: envName が制限を超える場合のエラーメッセージテンプレート
 *
 * @param currentLength - 現在の文字数
 * @returns エラーメッセージ
 *
 * 🟡 信頼性: 既存 Construct パターンから妥当な推測
 */
const getEnvNameLengthError = (currentLength: number): string =>
  `envName は ${MAX_ENV_NAME_LENGTH} 文字以下である必要があります。現在: ${currentLength} 文字`;

/**
 * 【envName 不正文字エラー】: envName に不正な文字が含まれる場合のエラーメッセージ
 *
 * 🟡 信頼性: 既存 Construct パターンから妥当な推測
 */
const ERROR_ENV_NAME_INVALID_FORMAT =
  'envName は小文字英数字とハイフンのみで構成され、ハイフンで開始・終了できません。';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * S3BucketConstruct の Props インターフェース
 *
 * 【設計方針】: 必須パラメータ + オプショナルパラメータ（デフォルト値提供）
 * 【再利用性】: 様々な S3 バケット構成に対応
 *
 * 🔵 信頼性: 要件定義書・設計文書より
 *
 * @interface S3BucketConstructProps
 */
export interface S3BucketConstructProps {
  /**
   * 環境名 (必須)
   *
   * 【用途】: リソース命名に使用（例: "dev", "prod"）
   * 【制約】: 小文字英数字とハイフンのみ、1-20文字
   *
   * 🔵 信頼性: requirements.md より
   *
   * @type {string}
   * @required
   */
  readonly envName: string;

  /**
   * バケット名サフィックス (オプション)
   *
   * 【用途】: S3 バケット名のカスタマイズ
   * 【デフォルト】: 'static-content'
   * 【命名規則】: {envName}-{bucketNameSuffix}-{accountId}
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @type {string}
   * @default 'static-content'
   */
  readonly bucketNameSuffix?: string;

  /**
   * バージョニング有効化 (オプション)
   *
   * 【用途】: S3 オブジェクトのバージョン管理
   * 【デフォルト】: true
   *
   * 🔵 信頼性: REQ-031 より
   *
   * @type {boolean}
   * @default true
   */
  readonly versioned?: boolean;

  /**
   * 削除ポリシー (オプション)
   *
   * 【用途】: Stack 削除時のバケット処理
   * 【デフォルト】: cdk.RemovalPolicy.RETAIN
   * 【推奨】: dev 環境は DESTROY、prod 環境は RETAIN
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @type {cdk.RemovalPolicy}
   * @default cdk.RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  /**
   * 自動削除有効化 (オプション)
   *
   * 【用途】: Stack 削除時にバケット内オブジェクトも削除
   * 【デフォルト】: false
   * 【注意】: removalPolicy: DESTROY と組み合わせて使用
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @type {boolean}
   * @default false
   */
  readonly autoDeleteObjects?: boolean;
}

/**
 * S3 Bucket Construct
 *
 * 【機能概要】: 静的コンテンツおよび Sorry Page 提供用の S3 バケットを作成する Construct
 * 【実装方針】: パブリックアクセス完全ブロック、CloudFront OAC 経由のみアクセス可能
 *
 * アーキテクチャ位置づけ:
 * ```
 * VPC Stack → Security Stack → Application Stack → Distribution Stack
 *                                                     ↓
 *                                                 S3 Bucket + OAC
 *                                                     ↑       本 Construct
 *                                                 CloudFront
 * ```
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-031, REQ-032, NFR-104 に基づく実装
 *
 * @class S3BucketConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * const s3Construct = new S3BucketConstruct(this, 'S3Bucket', {
 *   envName: 'dev',
 * });
 *
 * // CloudFront Distribution 作成後にバケットポリシーを追加
 * const cloudfront = new CloudFrontConstruct(this, 'CloudFront', {
 *   s3Bucket: s3Construct.bucket,
 *   oac: s3Construct.originAccessControl,
 * });
 *
 * s3Construct.addCloudFrontBucketPolicy(cloudfront.distribution.distributionArn);
 * ```
 */
export class S3BucketConstruct extends Construct {
  /**
   * 【プロパティ】: S3 バケット
   *
   * 【用途】: CloudFront Origin 設定、バケットポリシー追加
   *
   * 🔵 信頼性: note.md 公開プロパティより
   *
   * @readonly
   * @type {s3.IBucket}
   */
  public readonly bucket: s3.IBucket;

  /**
   * 【プロパティ】: バケット ARN
   *
   * 【用途】: IAM ポリシー、CloudFormation 出力
   *
   * 🔵 信頼性: note.md 公開プロパティより
   *
   * @readonly
   * @type {string}
   */
  public readonly bucketArn: string;

  /**
   * 【プロパティ】: バケットドメイン名
   *
   * 【用途】: CloudFront Origin 設定
   * 【形式】: {bucket-name}.s3.{region}.amazonaws.com
   *
   * 🔵 信頼性: note.md 公開プロパティより
   *
   * @readonly
   * @type {string}
   */
  public readonly bucketDomainName: string;

  /**
   * 【プロパティ】: バケット名
   *
   * 【用途】: ログ出力、識別
   *
   * 🔵 信頼性: note.md 公開プロパティより
   *
   * @readonly
   * @type {string}
   */
  public readonly bucketName: string;

  /**
   * 【プロパティ】: Origin Access Control (OAC)
   *
   * 【用途】: CloudFront Distribution 設定
   *
   * 🔵 信頼性: note.md 公開プロパティより
   *
   * @readonly
   * @type {cloudfront.CfnOriginAccessControl}
   */
  public readonly originAccessControl: cloudfront.CfnOriginAccessControl;

  /**
   * 【プロパティ】: OAC ID
   *
   * 【用途】: CloudFront Distribution OAC 設定
   *
   * 🔵 信頼性: note.md 公開プロパティより
   *
   * @readonly
   * @type {string}
   */
  public readonly originAccessControlId: string;

  /**
   * S3BucketConstruct のコンストラクタ
   *
   * 【処理概要】: S3 バケット、OAC を作成
   * 【設計方針】: デフォルト値を適用しつつ、カスタマイズ可能に
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {S3BucketConstructProps} props - S3 バケット設定
   */
  constructor(scope: Construct, id: string, props: S3BucketConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【Props バリデーション】: 入力パラメータの検証
    // 🟡 信頼性: 既存 Construct パターンから妥当な推測
    // ========================================================================
    this.validateProps(props);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: REQ-031 より
    // ========================================================================
    const bucketNameSuffix = props.bucketNameSuffix ?? DEFAULT_BUCKET_NAME_SUFFIX;
    const versioned = props.versioned ?? DEFAULT_VERSIONED;
    const removalPolicy = props.removalPolicy ?? DEFAULT_REMOVAL_POLICY;
    const autoDeleteObjects = props.autoDeleteObjects ?? DEFAULT_AUTO_DELETE_OBJECTS;

    // ========================================================================
    // 【バケット名生成】: {envName}-{suffix}-{accountId}
    // 🟡 信頼性: 設計文書から妥当な推測
    // ========================================================================
    const bucketName = this.generateBucketName(props.envName, bucketNameSuffix);

    // ========================================================================
    // 【S3 バケット作成】: 静的コンテンツ配信用バケット
    // 🔵 信頼性: REQ-031 より
    // ========================================================================
    const bucket = new s3.Bucket(this, 'Bucket', {
      // 【バケット名設定】
      // 🟡 信頼性: 設計文書から妥当な推測
      bucketName: bucketName,

      // 【パブリックアクセスブロック設定】: 全ブロック
      // 🔵 信頼性: REQ-031, NFR-104 より
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // 【暗号化設定】: S3 マネージド暗号化
      // 🔵 信頼性: REQ-031 より
      encryption: s3.BucketEncryption.S3_MANAGED,

      // 【バージョニング設定】
      // 🔵 信頼性: REQ-031 より
      versioned: versioned,

      // 【削除ポリシー設定】
      // 🟡 信頼性: 設計文書から妥当な推測
      removalPolicy: removalPolicy,

      // 【自動削除設定】
      // 🟡 信頼性: 設計文書から妥当な推測
      autoDeleteObjects: autoDeleteObjects,
    });

    // ========================================================================
    // 【OAC 作成】: CloudFront Origin Access Control
    // 🔵 信頼性: REQ-032 より
    // ========================================================================
    const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        // 【OAC 名設定】
        // 🟡 信頼性: 設計文書から妥当な推測
        name: `${props.envName}-oac`,

        // 【説明】
        description: `OAC for ${props.envName} static content bucket`,

        // 【Origin Type 設定】: S3
        // 🔵 信頼性: REQ-032 より
        originAccessControlOriginType: OAC_ORIGIN_TYPE,

        // 【署名動作設定】: 常に署名
        // 🔵 信頼性: REQ-032 より
        signingBehavior: OAC_SIGNING_BEHAVIOR,

        // 【署名プロトコル設定】: SigV4
        // 🔵 信頼性: REQ-032 より
        signingProtocol: OAC_SIGNING_PROTOCOL,
      },
    });

    // ========================================================================
    // 【プロパティ設定】: 公開プロパティに値を設定
    // 🔵 信頼性: note.md 公開プロパティより
    // ========================================================================
    this.bucket = bucket;
    this.bucketArn = bucket.bucketArn;
    this.bucketDomainName = bucket.bucketRegionalDomainName;
    this.bucketName = bucket.bucketName;
    this.originAccessControl = oac;
    this.originAccessControlId = oac.attrId;
  }

  /**
   * CloudFront バケットポリシー追加
   *
   * 【用途】: CloudFront Distribution 作成後にバケットポリシーを追加
   * 【背景】: S3 と CloudFront の循環参照を解決
   *
   * 🟡 信頼性: note.md 循環参照対応より
   *
   * @param {string} distributionArn - CloudFront Distribution の ARN (形式: arn:aws:cloudfront::account-id:distribution/distribution-id)
   * @returns {void}
   * @throws {Error} distributionArn が空の場合
   *
   * @example
   * ```typescript
   * // S3BucketConstruct 作成後
   * const s3Bucket = new S3BucketConstruct(this, 'S3Bucket', {
   *   envName: 'dev',
   * });
   *
   * // CloudFrontConstruct 作成後
   * const cloudfront = new CloudFrontConstruct(this, 'CloudFront', {
   *   s3Bucket: s3Bucket.bucket,
   *   oac: s3Bucket.originAccessControl,
   * });
   *
   * // バケットポリシー追加
   * s3Bucket.addCloudFrontBucketPolicy(cloudfront.distribution.distributionArn);
   * ```
   */
  public addCloudFrontBucketPolicy(distributionArn: string): void {
    // ========================================================================
    // 【入力バリデーション】: distributionArn の検証
    // 🟡 信頼性: 既存 Construct パターンから妥当な推測
    // ========================================================================
    if (!distributionArn || distributionArn.length === 0) {
      throw new Error('distributionArn は必須です。空文字列は指定できません。');
    }

    // ========================================================================
    // 【バケットポリシー追加】: CloudFront 署名付きリクエストのみ許可
    // 🔵 信頼性: REQ-032 より
    // ========================================================================
    const policyStatement = this.createCloudFrontPolicyStatement(distributionArn);
    this.bucket.addToResourcePolicy(policyStatement);
  }

  /**
   * Props バリデーション
   *
   * 【用途】: 入力パラメータの妥当性検証
   * 【検証項目】:
   * - envName の必須チェック
   * - envName の長さチェック (最大20文字)
   * - envName の形式チェック (小文字英数字とハイフンのみ)
   *
   * 🟡 信頼性: 既存 Construct パターンから妥当な推測
   *
   * @private
   * @param {S3BucketConstructProps} props - 検証対象の Props
   * @throws {Error} バリデーションエラー
   */
  private validateProps(props: S3BucketConstructProps): void {
    this.validateEnvName(props.envName);
  }

  /**
   * envName バリデーション
   *
   * 【用途】: 環境名の妥当性検証
   * 【検証項目】:
   * - 必須チェック (空文字列不可)
   * - 長さチェック (1-20文字)
   * - 形式チェック (小文字英数字とハイフンのみ、ハイフンで開始・終了不可)
   *
   * 🟡 信頼性: 既存 Construct パターンから妥当な推測
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
      throw new Error(getEnvNameLengthError(envName.length));
    }

    if (!ENV_NAME_PATTERN.test(envName)) {
      throw new Error(ERROR_ENV_NAME_INVALID_FORMAT);
    }
  }

  /**
   * バケット名生成
   *
   * 【用途】: S3 バケット名の生成
   * 【命名規則】: {envName}-{suffix}-{accountId}
   * 【形式】: 小文字英数字とハイフンのみ
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @private
   * @param {string} envName - 環境名 (例: 'dev', 'prod')
   * @param {string} suffix - バケット名サフィックス (例: 'static-content')
   * @returns {string} 生成されたバケット名
   *
   * @example
   * ```typescript
   * const bucketName = this.generateBucketName('dev', 'static-content');
   * // 結果: 'dev-static-content-123456789012'
   * ```
   */
  private generateBucketName(envName: string, suffix: string): string {
    const accountId = cdk.Stack.of(this).account;
    return `${envName}-${suffix}-${accountId}`;
  }

  /**
   * CloudFront ポリシーステートメント作成
   *
   * 【用途】: CloudFront からの S3 アクセスを許可するポリシーステートメントを作成
   * 【設定内容】:
   * - Principal: CloudFront サービスプリンシパル
   * - Action: s3:GetObject (読み取りのみ)
   * - Condition: 指定された CloudFront Distribution ARN からのアクセスのみ許可
   *
   * 🔵 信頼性: REQ-032 より
   *
   * @private
   * @param {string} distributionArn - CloudFront Distribution の ARN
   * @returns {iam.PolicyStatement} 作成されたポリシーステートメント
   */
  private createCloudFrontPolicyStatement(distributionArn: string): iam.PolicyStatement {
    return new iam.PolicyStatement({
      // 【Sid 設定】: ポリシーステートメント識別子
      sid: BUCKET_POLICY_SID,

      // 【Effect 設定】: 許可
      effect: iam.Effect.ALLOW,

      // 【Principal 設定】: CloudFront サービスプリンシパル
      // 🔵 信頼性: REQ-032 より
      principals: [new iam.ServicePrincipal(CLOUDFRONT_SERVICE_PRINCIPAL)],

      // 【Action 設定】: GetObject のみ許可
      // 🔵 信頼性: REQ-032 より
      actions: [S3_GET_OBJECT_ACTION],

      // 【Resource 設定】: バケット内の全オブジェクト
      // 🔵 信頼性: REQ-032 より
      resources: [`${this.bucket.bucketArn}/*`],

      // 【Condition 設定】: CloudFront Distribution ARN による制限
      // 🔵 信頼性: REQ-032 より
      conditions: {
        StringEquals: {
          'aws:SourceArn': distributionArn,
        },
      },
    });
  }
}
