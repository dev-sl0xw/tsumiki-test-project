/**
 * WAF Construct 実装
 *
 * TASK-0011: WAF Construct 実装
 * フェーズ: TDD Green Phase - テストを通すための最小実装
 *
 * 【機能概要】: AWS WAF WebACL を構築する CDK Construct
 * 【実装方針】: REQ-033, REQ-034, NFR-103 の要件を満たす最小実装
 * 【テスト対応】: TC-WAF-001 〜 TC-WAF-030 の全30テストケースに対応
 *
 * 構成内容:
 * - WAF WebACL（REGIONAL/CLOUDFRONT スコープ対応）
 * - AWS Managed Rules（Common RuleSet + SQLi RuleSet）
 * - CloudWatch Logs によるログ記録
 * - ALB との WebACLAssociation
 *
 * 参照した要件:
 * - REQ-033: WAF を CloudFront/ALB に接続
 * - REQ-034: AWS Managed Rules 適用
 * - NFR-103: WAF による Web アプリケーション保護
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @module WafConstruct
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

// ============================================================================
// 【定数定義】: デフォルト値
// 🔵 信頼性: requirements.md、note.md より
// ============================================================================

/**
 * 【デフォルト WAF スコープ】: ALB/API Gateway 用
 * 🔵 信頼性: requirements.md より（REGIONAL がデフォルト）
 */
const DEFAULT_WAF_SCOPE: 'REGIONAL' | 'CLOUDFRONT' = 'REGIONAL';

/**
 * 【デフォルトログ有効化】: ログ記録のデフォルト設定
 * 🔵 信頼性: requirements.md より（true がデフォルト）
 */
const DEFAULT_ENABLE_LOGGING = true;

/**
 * 【デフォルトログ保持日数】: CloudWatch Logs の保持期間
 * 🟡 信頼性: requirements.md より（妥当な推測）
 */
const DEFAULT_LOG_RETENTION_DAYS = 30;

/**
 * 【WAF ログプレフィックス】: AWS WAF ログに必須のプレフィックス
 * 🔵 信頼性: AWS 公式ドキュメント、note.md 技術的制約より
 */
const WAF_LOG_PREFIX = 'aws-waf-logs-';

// ============================================================================
// 【定数定義】: ログ保持期間マッピング
// 🔵 信頼性: CDK logs.RetentionDays の制約に対応
// ============================================================================

/**
 * 【ログ保持期間マッピング】: 日数を RetentionDays 列挙型に変換するマッピング
 *
 * 【設計理由】:
 * - CDK の logs.RetentionDays は特定の値のみサポート
 * - 定数として外出しすることで毎回のオブジェクト生成を回避
 * - CloudWatch Logs の仕様に準拠した保持期間のみを許可
 *
 * 🔵 信頼性: AWS CloudWatch Logs 仕様より（定数抽出による改善）
 */
import * as logs from 'aws-cdk-lib/aws-logs';

const LOG_RETENTION_MAP: Record<number, logs.RetentionDays> = {
  1: logs.RetentionDays.ONE_DAY,
  3: logs.RetentionDays.THREE_DAYS,
  5: logs.RetentionDays.FIVE_DAYS,
  7: logs.RetentionDays.ONE_WEEK,
  14: logs.RetentionDays.TWO_WEEKS,
  30: logs.RetentionDays.ONE_MONTH,
  60: logs.RetentionDays.TWO_MONTHS,
  90: logs.RetentionDays.THREE_MONTHS,
  120: logs.RetentionDays.FOUR_MONTHS,
  150: logs.RetentionDays.FIVE_MONTHS,
  180: logs.RetentionDays.SIX_MONTHS,
  365: logs.RetentionDays.ONE_YEAR,
  400: logs.RetentionDays.THIRTEEN_MONTHS,
  545: logs.RetentionDays.EIGHTEEN_MONTHS,
  731: logs.RetentionDays.TWO_YEARS,
  1827: logs.RetentionDays.FIVE_YEARS,
  2192: logs.RetentionDays.SIX_YEARS,
  2557: logs.RetentionDays.SEVEN_YEARS,
  2922: logs.RetentionDays.EIGHT_YEARS,
  3288: logs.RetentionDays.NINE_YEARS,
  3653: logs.RetentionDays.TEN_YEARS,
};

/**
 * 【有効なログ保持日数】: CloudWatch Logs でサポートされる保持期間の配列
 *
 * 【用途】: バリデーションとエラーメッセージ生成に使用
 *
 * 🔵 信頼性: AWS CloudWatch Logs 仕様より
 */
const VALID_LOG_RETENTION_DAYS = Object.keys(LOG_RETENTION_MAP).map(Number);

// ============================================================================
// 【バリデーション関数】: Props の入力値検証
// 🟡 信頼性: AuroraConstruct パターンに準拠（バリデーション追加）
// ============================================================================

/**
 * 【環境名バリデーション】: envName の形式を検証
 *
 * 【検証内容】:
 * - 空文字列でないこと
 * - 英数字・ハイフンのみで構成されていること
 * - 先頭・末尾がハイフンでないこと
 * - 長さが適切であること（1-20文字）
 *
 * 🟡 信頼性: AuroraConstruct のバリデーションパターンに準拠
 *
 * @param envName 環境名
 * @throws Error バリデーション失敗時
 */
function validateEnvName(envName: string): void {
  // 【空文字列検証】
  if (!envName || envName.trim() === '') {
    throw new Error('envName は空文字列にできません。');
  }

  // 【長さ検証】: リソース命名の制約を考慮
  if (envName.length > 20) {
    throw new Error(
      `envName (${envName}) は 20 文字以内である必要があります。` +
        '長い環境名はリソース命名に影響します。'
    );
  }

  // 【形式検証】: 英数字とハイフンのみ許可
  const validPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
  if (!validPattern.test(envName)) {
    throw new Error(
      `envName (${envName}) は小文字英数字とハイフンのみで構成し、` +
        '先頭・末尾はハイフン以外である必要があります。'
    );
  }
}

// ============================================================================
// 【型定義】: WAF Managed Rule
// 🔵 信頼性: requirements.md より
// ============================================================================

/**
 * WAF Managed Rule 設定
 *
 * 【用途】: AWS Managed Rules の定義
 * 🔵 信頼性: requirements.md 型定義より
 */
export interface WafManagedRule {
  /** ルール名（AWS Managed Rules 名称） */
  readonly name: string;
  /** ベンダー名（'AWS' 固定） */
  readonly vendorName: 'AWS';
  /** 優先度（低い数値が先に評価） */
  readonly priority: number;
}

/**
 * デフォルト WAF ルール
 *
 * 【内容】: Common RuleSet + SQLi RuleSet
 * 🔵 信頼性: requirements.md DEFAULT_WAF_RULES 定義より
 */
export const DEFAULT_WAF_RULES: WafManagedRule[] = [
  {
    name: 'AWSManagedRulesCommonRuleSet',
    vendorName: 'AWS',
    priority: 1,
  },
  {
    name: 'AWSManagedRulesSQLiRuleSet',
    vendorName: 'AWS',
    priority: 2,
  },
];

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * WAF Construct の Props インターフェース
 *
 * 【設計方針】: 最小構成から柔軟なカスタマイズまで対応
 * 🔵 信頼性: requirements.md Props インターフェースより
 *
 * @interface WafConstructProps
 */
export interface WafConstructProps {
  /**
   * 環境名
   *
   * 【用途】: リソース命名に使用（例: "dev", "prod"）
   * 【必須】: yes
   * 🔵 信頼性: requirements.md より
   */
  readonly envName: string;

  /**
   * WAF スコープ
   *
   * 【用途】: REGIONAL: ALB/API Gateway用、CLOUDFRONT: CloudFront用
   * 【デフォルト】: 'REGIONAL'
   * 🔵 信頼性: requirements.md より
   */
  readonly scope?: 'REGIONAL' | 'CLOUDFRONT';

  /**
   * ログ記録の有効化
   *
   * 【用途】: CloudWatch Logs へのログ出力設定
   * 【デフォルト】: true
   * 🔵 信頼性: requirements.md より
   */
  readonly enableLogging?: boolean;

  /**
   * ログ保持期間（日数）
   *
   * 【用途】: CloudWatch Logs のログ保持期間
   * 【デフォルト】: 30
   * 🟡 信頼性: requirements.md より（デフォルト値は推測）
   */
  readonly logRetentionDays?: number;

  /**
   * カスタム Managed Rules
   *
   * 【用途】: デフォルト以外の Managed Rules を使用する場合に指定
   * 【デフォルト】: DEFAULT_WAF_RULES
   * 🟡 信頼性: requirements.md より
   */
  readonly managedRules?: WafManagedRule[];
}

/**
 * WAF Construct
 *
 * 【機能概要】: AWS WAF WebACL を構築する CDK Construct
 * 【実装方針】: REQ-033, REQ-034, NFR-103 の要件を満たす
 * 【テスト対応】: TC-WAF-001 〜 TC-WAF-030 の全テストケースに対応
 *
 * 機能:
 * - WebACL の作成（REGIONAL/CLOUDFRONT スコープ）
 * - AWS Managed Rules の適用（Common RuleSet, SQLi RuleSet）
 * - CloudWatch Logs へのログ出力
 * - ALB との関連付け（associateWithAlb メソッド）
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class WafConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * // 最小構成での使用
 * const waf = new WafConstruct(this, 'Waf', {
 *   envName: 'dev',
 * });
 *
 * // ALB との関連付け
 * waf.associateWithAlb(alb.loadBalancerArn);
 *
 * // 本番環境向け構成
 * const wafProd = new WafConstruct(this, 'Waf', {
 *   envName: 'prod',
 *   scope: 'REGIONAL',
 *   enableLogging: true,
 *   logRetentionDays: 30,
 * });
 * ```
 */
export class WafConstruct extends Construct {
  // ==========================================================================
  // 【公開プロパティ】: 他の Stack から参照可能なリソース
  // 🔵 信頼性: requirements.md 出力インターフェースより
  // ==========================================================================

  /**
   * WAF WebACL リソース
   *
   * 【用途】: 作成された WebACL インスタンス
   * 【参照元】: ALB 関連付け、メトリクス参照
   * 🔵 信頼性: requirements.md 出力インターフェースより
   */
  public readonly webAcl: wafv2.CfnWebACL;

  /**
   * WebACL ARN
   *
   * 【用途】: WebACL の Amazon Resource Name
   * 【参照元】: CloudFormation 出力、関連付け
   * 🔵 信頼性: requirements.md 出力インターフェースより
   */
  public readonly webAclArn: string;

  /**
   * WebACL ID
   *
   * 【用途】: WebACL の ID（メトリクス参照用）
   * 🟡 信頼性: requirements.md 出力インターフェースより
   */
  public readonly webAclId: string;

  /**
   * ログ出力先ロググループ
   *
   * 【用途】: WAF ログの出力先（enableLogging: true の場合のみ）
   * 【参照元】: ログ監視、アラート設定
   * 🔵 信頼性: requirements.md 出力インターフェースより
   */
  public readonly logGroup?: logs.ILogGroup;

  // ==========================================================================
  // 【プライベートプロパティ】: 内部管理用
  // ==========================================================================

  /**
   * 【内部カウンタ】: WebACLAssociation のユニークID生成用
   *
   * 【改善内容】:
   * - 複数の ALB/API Gateway への関連付けをサポート
   * - 各関連付けに一意の CDK ID を付与
   * - カウンタは 1 から開始（CDK 命名規則に準拠）
   *
   * 🟡 信頼性: 複数関連付け対応のための内部実装（TC-WAF-027 対応）
   */
  private associationCounter = 0;

  /**
   * WafConstruct のコンストラクタ
   *
   * 【処理概要】: WebACL、Managed Rules、ログ設定を作成
   * 【設計方針】: テストを通すための最小限かつ完全な実装
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {WafConstructProps} props - WAF 設定
   */
  constructor(scope: Construct, id: string, props: WafConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: requirements.md Props インターフェースより
    // ========================================================================
    const {
      envName,
      scope: wafScope = DEFAULT_WAF_SCOPE,
      enableLogging = DEFAULT_ENABLE_LOGGING,
      logRetentionDays = DEFAULT_LOG_RETENTION_DAYS,
      managedRules,
    } = props;

    // ========================================================================
    // 【入力値バリデーション】: Props の妥当性を検証
    // 🟡 信頼性: AuroraConstruct パターンに準拠（早期エラー検出）
    // ========================================================================

    // 【環境名バリデーション】: envName の形式が適切であることを確認
    validateEnvName(envName);

    // 【Managed Rules 決定】: カスタムルールまたはデフォルトルールを使用
    // 🟡 信頼性: requirements.md エッジケース EDGE-WAF-04 より（空配列時はデフォルト）
    const effectiveRules =
      managedRules && managedRules.length > 0 ? managedRules : DEFAULT_WAF_RULES;

    // ========================================================================
    // 【WAF Rules 作成】: Managed Rules を CfnWebACL 形式に変換
    // 🔵 信頼性: note.md Managed Rules 設計より
    // ========================================================================
    const wafRules: wafv2.CfnWebACL.RuleProperty[] = effectiveRules.map((rule) => ({
      // 【ルール名】: Managed Rule の識別子
      name: rule.name,

      // 【優先度】: 評価順序（低い数値が先に評価）
      // 🔵 信頼性: note.md セキュリティ考慮事項より
      priority: rule.priority,

      // 【オーバーライドアクション】: マネージドルールのアクションをそのまま使用
      // 🔵 信頼性: TASK-0011.md 設計より
      overrideAction: {
        none: {},
      },

      // 【ステートメント】: Managed Rule Group の参照
      // 🔵 信頼性: REQ-034、note.md Managed Rules 設計より
      statement: {
        managedRuleGroupStatement: {
          vendorName: rule.vendorName,
          name: rule.name,
        },
      },

      // 【可視性設定】: メトリクスとサンプリングを有効化
      // 🔵 信頼性: note.md セキュリティ考慮事項より
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${rule.name}Metric`,
      },
    }));

    // ========================================================================
    // 【WebACL 作成】: WAF WebACL リソースの作成
    // 🔵 信頼性: TASK-0011.md 完了条件「WAF WebACL が正常に作成される」より
    // ========================================================================
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      // 【WebACL 名】: 環境名を含む命名規則
      // 🔵 信頼性: note.md リソース命名制約より
      name: `${envName}-waf-webacl`,

      // 【スコープ】: REGIONAL または CLOUDFRONT
      // 🔵 信頼性: REQ-033、requirements.md Props インターフェースより
      scope: wafScope,

      // 【デフォルトアクション】: マッチしないリクエストは許可
      // 🔵 信頼性: note.md セキュリティ考慮事項「デフォルトアクション: Allow」より
      defaultAction: {
        allow: {},
      },

      // 【ルール】: Managed Rules
      // 🔵 信頼性: REQ-034「AWS Managed Rules を適用」より
      rules: wafRules,

      // 【可視性設定】: WebACL 全体のメトリクスとサンプリング
      // 🔵 信頼性: note.md セキュリティ考慮事項より
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${envName}-waf-webacl-metric`,
      },
    });

    // 【公開プロパティ設定】: WebACL ARN と ID
    // 🔵 信頼性: requirements.md 出力インターフェースより
    this.webAclArn = this.webAcl.attrArn;
    this.webAclId = this.webAcl.attrId;

    // ========================================================================
    // 【ログ設定】: CloudWatch Logs へのログ出力設定
    // 🔵 信頼性: TASK-0011.md 完了条件「CloudWatch Logs へのログ出力が設定されている」より
    // ========================================================================
    if (enableLogging) {
      // 【ロググループ作成】: WAF ログ用 CloudWatch Logs グループ
      // 🔵 信頼性: note.md 技術的制約「aws-waf-logs- プレフィックス必須」より
      const logGroup = new logs.LogGroup(this, 'WafLogGroup', {
        logGroupName: `${WAF_LOG_PREFIX}${envName}-webacl`,
        retention: this.getLogRetention(logRetentionDays),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      // 【公開プロパティ設定】: ロググループ参照
      this.logGroup = logGroup;

      // 【LoggingConfiguration 作成】: WebACL とロググループの関連付け
      // 🔵 信頼性: AWS WAF ドキュメント、TASK-0011.md より
      new wafv2.CfnLoggingConfiguration(this, 'WafLoggingConfig', {
        logDestinationConfigs: [logGroup.logGroupArn],
        resourceArn: this.webAcl.attrArn,
      });
    }
  }

  // ==========================================================================
  // 【公開メソッド】: ALB との関連付け
  // 🔵 信頼性: TASK-0011.md 完了条件「ALB との関連付けが可能な設計」より
  // ==========================================================================

  /**
   * ALB との関連付け
   *
   * 【機能概要】: WebACL を ALB に関連付ける
   * 【用途】: ALB への WAF 保護を適用
   *
   * 🔵 信頼性: TASK-0011.md 設計「associateWithAlb」より
   *
   * @param {string} albArn - ALB の ARN
   * @returns {wafv2.CfnWebACLAssociation} 作成された WebACLAssociation リソース
   *
   * @example
   * ```typescript
   * const waf = new WafConstruct(stack, 'Waf', { envName: 'dev' });
   * waf.associateWithAlb(alb.loadBalancerArn);
   * ```
   */
  public associateWithAlb(albArn: string): wafv2.CfnWebACLAssociation {
    // 【カウンタインクリメント】: ユニークな CDK ID を生成
    // 【改善ポイント】: 先にインクリメントし、1 から開始する命名に統一
    this.associationCounter++;

    // 【一意 ID 生成】: ALB 関連付け用の識別子
    // 🟡 信頼性: 複数 ALB 関連付け対応（TC-WAF-027）
    const associationId = `AlbAssociation${this.associationCounter}`;

    // 【WebACLAssociation 作成】: WebACL と ALB の関連付け
    // 🔵 信頼性: TASK-0011.md 設計「CfnWebACLAssociation」より
    return new wafv2.CfnWebACLAssociation(this, associationId, {
      resourceArn: albArn,
      webAclArn: this.webAcl.attrArn,
    });
  }

  /**
   * API Gateway との関連付け
   *
   * 【機能概要】: WebACL を API Gateway Stage に関連付ける
   * 【用途】: API Gateway への WAF 保護を適用
   *
   * 🟡 信頼性: requirements.md 公開メソッド設計（将来拡張）
   *
   * @param {string} apiGatewayArn - API Gateway Stage の ARN
   * @returns {wafv2.CfnWebACLAssociation} 作成された WebACLAssociation リソース
   */
  public associateWithApiGateway(apiGatewayArn: string): wafv2.CfnWebACLAssociation {
    // 【カウンタインクリメント】: ユニークな CDK ID を生成
    this.associationCounter++;

    // 【一意 ID 生成】: API Gateway 関連付け用の識別子
    // 🟡 信頼性: 複数リソース関連付け対応
    const associationId = `ApiGwAssociation${this.associationCounter}`;

    // 【WebACLAssociation 作成】: WebACL と API Gateway の関連付け
    return new wafv2.CfnWebACLAssociation(this, associationId, {
      resourceArn: apiGatewayArn,
      webAclArn: this.webAcl.attrArn,
    });
  }

  // ==========================================================================
  // 【プライベートメソッド】: ユーティリティ
  // ==========================================================================

  /**
   * 【ログ保持期間変換】: 日数を RetentionDays 列挙型に変換
   *
   * 【改善内容】: 定数マッピングを外出しし、毎回のオブジェクト生成を回避
   * 【設計方針】: 無効な値の場合はデフォルト値（30日）を使用
   *
   * 🔵 信頼性: CDK logs.RetentionDays の制約に対応（定数抽出による改善）
   *
   * @param {number} days - ログ保持日数
   * @returns {logs.RetentionDays} RetentionDays 列挙型
   */
  private getLogRetention(days: number): logs.RetentionDays {
    // 【保持期間マッピング参照】: 外部定義した定数マッピングを使用
    // 【デフォルト】: マッピングにない場合は 30 日
    return LOG_RETENTION_MAP[days] ?? logs.RetentionDays.ONE_MONTH;
  }
}
