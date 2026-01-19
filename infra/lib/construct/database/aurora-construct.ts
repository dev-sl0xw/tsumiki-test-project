/**
 * Aurora Construct 実装
 *
 * TASK-0008: Aurora Construct 実装
 * フェーズ: TDD Refactor Phase - コード品質改善
 *
 * 【機能概要】: Aurora Serverless v2 MySQL クラスターを構築する CDK Construct
 * 【実装方針】: 最小権限の原則に基づき、セキュアなデータベースを構築
 * 【テスト対応】: TC-AU-01 〜 TC-AU-24 の全テストケースに対応
 * 【リファクタ内容】: 定数抽出、バリデーション強化、JSDoc 改善、セクション区切りコメント追加
 *
 * 構成内容:
 * - Aurora Serverless v2 クラスター（MySQL 8.0 互換）
 * - ストレージ暗号化（KMS カスタマーマネージドキー）
 * - 自動バックアップ（デフォルト 7 日間）
 * - Private Isolated Subnet 配置
 * - Secrets Manager による認証情報管理
 *
 * 参照した要件:
 * - REQ-022: Aurora MySQL Serverless v2 を使用
 * - REQ-023: Private DB Subnet に配置
 * - REQ-024: 外部からの直接アクセス遮断
 * - REQ-025: ECS SG からの 3306 のみ許可
 * - REQ-026: Storage Encryption 有効化
 * - REQ-027: 自動バックアップ有効化
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @module AuroraConstruct
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: ACU（Aurora Capacity Unit）の制約
// 🔵 信頼性: note.md Aurora Serverless v2 制約、AWS公式ドキュメントより
// ============================================================================

/**
 * 【ACU 最小値】: Aurora Serverless v2 の最小キャパシティ制約
 * 🔵 信頼性: AWS Aurora Serverless v2 仕様より
 */
const ACU_MIN_VALUE = 0.5;

/**
 * 【ACU 最大値】: Aurora Serverless v2 の最大キャパシティ制約
 * 🔵 信頼性: AWS Aurora Serverless v2 仕様より
 */
const ACU_MAX_VALUE = 128;

/**
 * 【バックアップ保持期間 最小値】: 自動バックアップの最小保持期間
 * 🔵 信頼性: AWS RDS 仕様より
 */
const BACKUP_RETENTION_MIN_DAYS = 1;

/**
 * 【バックアップ保持期間 最大値】: 自動バックアップの最大保持期間
 * 🔵 信頼性: AWS RDS 仕様より
 */
const BACKUP_RETENTION_MAX_DAYS = 35;

// ============================================================================
// 【定数定義】: デフォルト値
// 🔵 信頼性: architecture.md データベース層、requirements.md より
// ============================================================================

/**
 * 【デフォルト最小 ACU】: Serverless v2 の最小キャパシティ
 * 🔵 信頼性: architecture.md データベース層より（0.5 ACU）
 */
const DEFAULT_MIN_CAPACITY = 0.5;

/**
 * 【デフォルト最大 ACU】: Serverless v2 の最大キャパシティ
 * 🔵 信頼性: architecture.md データベース層より（2 ACU）
 */
const DEFAULT_MAX_CAPACITY = 2;

/**
 * 【デフォルトデータベース名】: 初期データベース名
 * 🟡 信頼性: interfaces.ts から妥当な推測（'appdb'）
 */
const DEFAULT_DATABASE_NAME = 'appdb';

/**
 * 【デフォルトバックアップ保持日数】: 自動バックアップの保持期間
 * 🟡 信頼性: architecture.md（7日）より
 */
const DEFAULT_BACKUP_RETENTION_DAYS = 7;

/**
 * 【マスターユーザー名】: Aurora の管理者ユーザー名
 * 🔵 信頼性: BLEA 参考実装より
 */
const MASTER_USERNAME = 'dbadmin';

// ============================================================================
// 【バリデーション関数】: Props の入力値検証
// 🔵 信頼性: CDK ベストプラクティスより（早期エラー検出）
// ============================================================================

/**
 * 【ACU バリデーション】: ACU 設定値の妥当性を検証
 *
 * 【検証内容】:
 * - minCapacity が ACU_MIN_VALUE 以上である
 * - maxCapacity が ACU_MAX_VALUE 以下である
 * - minCapacity が maxCapacity 以下である
 *
 * 🔵 信頼性: note.md Aurora Serverless v2 制約より
 *
 * @param minCapacity 最小 ACU
 * @param maxCapacity 最大 ACU
 * @throws Error バリデーション失敗時
 */
function validateAcuSettings(minCapacity: number, maxCapacity: number): void {
  // 【最小 ACU 検証】: Aurora Serverless v2 の下限制約
  if (minCapacity < ACU_MIN_VALUE) {
    throw new Error(
      `minCapacity (${minCapacity}) は ${ACU_MIN_VALUE} 以上である必要があります。` +
        `Aurora Serverless v2 の最小 ACU は ${ACU_MIN_VALUE} です。`
    );
  }

  // 【最大 ACU 検証】: Aurora Serverless v2 の上限制約
  if (maxCapacity > ACU_MAX_VALUE) {
    throw new Error(
      `maxCapacity (${maxCapacity}) は ${ACU_MAX_VALUE} 以下である必要があります。` +
        `Aurora Serverless v2 の最大 ACU は ${ACU_MAX_VALUE} です。`
    );
  }

  // 【範囲検証】: minCapacity が maxCapacity を超えていないこと
  if (minCapacity > maxCapacity) {
    throw new Error(
      `minCapacity (${minCapacity}) は maxCapacity (${maxCapacity}) 以下である必要があります。`
    );
  }
}

/**
 * 【バックアップ保持日数バリデーション】: バックアップ保持期間の妥当性を検証
 *
 * 【検証内容】:
 * - backupRetentionDays が 1 以上 35 以下である
 *
 * 🔵 信頼性: AWS RDS 仕様より
 *
 * @param backupRetentionDays バックアップ保持日数
 * @throws Error バリデーション失敗時
 */
function validateBackupRetentionDays(backupRetentionDays: number): void {
  if (
    backupRetentionDays < BACKUP_RETENTION_MIN_DAYS ||
    backupRetentionDays > BACKUP_RETENTION_MAX_DAYS
  ) {
    throw new Error(
      `backupRetentionDays (${backupRetentionDays}) は ${BACKUP_RETENTION_MIN_DAYS}〜${BACKUP_RETENTION_MAX_DAYS} の範囲である必要があります。`
    );
  }
}

// ============================================================================
// 【インターフェース定義】
// 🔵 信頼性: requirements.md Props 定義より
// ============================================================================

/**
 * AuroraConstruct の Props インターフェース
 *
 * 【設計方針】: 必須パラメータとオプションパラメータを明確に分離
 * 【再利用性】: 異なる環境（Dev/Prod）で柔軟に設定可能
 *
 * @interface AuroraConstructProps
 */
export interface AuroraConstructProps {
  /**
   * 配置先 VPC（必須）
   *
   * 【用途】: Aurora クラスターを配置する VPC
   * 【要件】: VPC Stack から提供される VPC リソース
   * 🔵 信頼性: TASK-0008.md、architecture.md より
   */
  readonly vpc: ec2.IVpc;

  /**
   * Aurora 用 Security Group（必須）
   *
   * 【用途】: Aurora クラスターのネットワークアクセス制御
   * 【要件】: Security Stack から提供される Security Group（ECS SG からの 3306 のみ許可）
   * 🔵 信頼性: TASK-0008.md、REQ-024, REQ-025 より
   */
  readonly securityGroup: ec2.ISecurityGroup;

  /**
   * 環境名（必須）
   *
   * 【用途】: リソース命名に使用（例: 'dev', 'prod'）
   * 🔵 信頼性: REQ-042、architecture.md より
   */
  readonly envName: string;

  /**
   * 最小 ACU（Aurora Capacity Unit）（オプション）
   *
   * 【用途】: Serverless v2 の最小キャパシティ設定
   * @default 0.5
   * @range 0.5 - 128
   * 🔵 信頼性: architecture.md データベース層（0.5 ACU）
   */
  readonly minCapacity?: number;

  /**
   * 最大 ACU（Aurora Capacity Unit）（オプション）
   *
   * 【用途】: Serverless v2 の最大キャパシティ設定
   * @default 2 (コスト優先環境)
   * @range 0.5 - 128
   * 🔵 信頼性: architecture.md データベース層（2 ACU）
   */
  readonly maxCapacity?: number;

  /**
   * データベース名（オプション）
   *
   * 【用途】: Aurora クラスターの初期データベース名
   * @default 'appdb'
   * 🟡 信頼性: interfaces.ts から妥当な推測（'appdb'）
   */
  readonly databaseName?: string;

  /**
   * バックアップ保持日数（オプション）
   *
   * 【用途】: 自動バックアップの保持期間設定
   * @default 7
   * @range 1 - 35
   * 🟡 信頼性: architecture.md（7日）、標準設定から推測
   */
  readonly backupRetentionDays?: number;
}

/**
 * Aurora Construct 実装
 *
 * 【機能概要】: Aurora Serverless v2 MySQL クラスターを作成する Construct
 * 【実装方針】: 最小権限の原則に基づき、セキュアなデータベースを構築
 * 【テスト対応】: TC-AU-01 〜 TC-AU-24 の全テストケースに対応
 *
 * セキュリティ設計:
 * - ストレージ暗号化: KMS カスタマーマネージドキーを使用
 * - ネットワーク: Private Isolated Subnet に配置
 * - 認証: Secrets Manager で認証情報を自動生成・管理
 * - アクセス制御: Security Group で ECS からのアクセスのみ許可
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class AuroraConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * const aurora = new AuroraConstruct(this, 'Aurora', {
 *   vpc: props.vpc,
 *   securityGroup: props.auroraSecurityGroup,
 *   envName: 'dev',
 *   minCapacity: 0.5,
 *   maxCapacity: 2,
 * });
 *
 * // 後続リソースでの使用
 * const endpoint = aurora.clusterEndpoint.hostname;
 * const secret = aurora.secret;
 * ```
 */
export class AuroraConstruct extends Construct {
  // ==========================================================================
  // 【公開プロパティ】: 他の Stack から参照可能なリソース
  // 🔵 信頼性: requirements.md 出力プロパティより
  // ==========================================================================

  /**
   * Aurora クラスター
   *
   * 【用途】: 作成された DatabaseCluster リソースへの参照
   * 【参照元】: Database Stack、監視設定
   * 🔵 信頼性: CDK RDS パターン、BLEA 参考実装より
   */
  public readonly cluster: rds.DatabaseCluster;

  /**
   * クラスターエンドポイント
   *
   * 【用途】: Writer エンドポイント（接続用）
   * 【参照元】: ECS タスク定義の環境変数
   * 🔵 信頼性: dataflow.md 認証情報管理フローより
   */
  public readonly clusterEndpoint: rds.Endpoint;

  /**
   * 認証情報 Secret
   *
   * 【用途】: Secrets Manager に保存された DB 認証情報
   * 【参照元】: ECS タスク定義のシークレット参照
   * 🔵 信頼性: dataflow.md 認証情報管理フローより
   */
  public readonly secret: secretsmanager.ISecret;

  /**
   * Security Group
   *
   * 【用途】: Aurora に関連付けられた Security Group
   * 【参照元】: 追加のルール設定が必要な場合
   * 🔵 信頼性: REQ-024, REQ-025 より
   */
  public readonly securityGroup: ec2.ISecurityGroup;

  /**
   * AuroraConstruct のコンストラクタ
   *
   * 【処理概要】: Aurora Serverless v2 MySQL クラスターを作成
   * 【設計方針】: テストを通すための最小限の実装
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {AuroraConstructProps} props - AuroraConstruct の Props
   */
  constructor(scope: Construct, id: string, props: AuroraConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ解凍】: Props からパラメータを取得し、デフォルト値を適用
    // 🔵 信頼性: requirements.md Props 定義より
    // ========================================================================
    const {
      vpc,
      securityGroup,
      envName,
      minCapacity = DEFAULT_MIN_CAPACITY,
      maxCapacity = DEFAULT_MAX_CAPACITY,
      databaseName = DEFAULT_DATABASE_NAME,
      backupRetentionDays = DEFAULT_BACKUP_RETENTION_DAYS,
    } = props;

    // ========================================================================
    // 【入力値バリデーション】: Props の妥当性を検証
    // 🔵 信頼性: CDK ベストプラクティスより（早期エラー検出）
    // ========================================================================

    // 【ACU バリデーション】: ACU 設定値が適切な範囲内であることを確認
    validateAcuSettings(minCapacity, maxCapacity);

    // 【バックアップ保持日数バリデーション】: 保持期間が適切な範囲内であることを確認
    validateBackupRetentionDays(backupRetentionDays);

    // 【Security Group 保存】: 公開プロパティとして保存
    this.securityGroup = securityGroup;

    // ========================================================================
    // 【KMS キー作成】: ストレージ暗号化用のカスタマーマネージドキー
    // 🔵 信頼性: REQ-026、NFR-102 より
    // ========================================================================
    const encryptionKey = new kms.Key(this, 'AuroraEncryptionKey', {
      // 【説明設定】: 監査・トラブルシューティング用
      description: `Aurora encryption key for ${envName}`,

      // 【キーローテーション】: 自動ローテーション有効化（セキュリティベストプラクティス）
      enableKeyRotation: true,

      // 【削除保護】: スタック削除時にキーを保持（本番環境での意図しない削除を防止）
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ========================================================================
    // 【Aurora クラスター作成】: Serverless v2 MySQL クラスター
    // 🔵 信頼性: REQ-022、architecture.md データベース層より
    // ========================================================================
    this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      // 【エンジン設定】: Aurora MySQL 3.x (MySQL 8.0 互換)
      // 🔵 信頼性: REQ-022 より
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_05_2,
      }),

      // 【認証情報設定】: Secrets Manager で自動生成
      // 🔵 信頼性: note.md CDK 実装制約より
      credentials: rds.Credentials.fromGeneratedSecret(MASTER_USERNAME),

      // 【Serverless v2 Writer インスタンス】: Serverless v2 インスタンスタイプ
      // 🔵 信頼性: REQ-022 より
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        publiclyAccessible: false,
      }),

      // 【Serverless v2 スケーリング設定】: ACU の範囲を設定
      // 🔵 信頼性: architecture.md データベース層より
      serverlessV2MinCapacity: minCapacity,
      serverlessV2MaxCapacity: maxCapacity,

      // 【VPC 設定】: 指定された VPC に配置
      vpc,

      // 【サブネット設定】: Private Isolated Subnet に配置
      // 🔵 信頼性: REQ-023、REQ-024 より
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },

      // 【Security Group 設定】: Props で指定された Security Group を使用
      // 🔵 信頼性: REQ-024、REQ-025 より
      securityGroups: [securityGroup],

      // 【データベース名】: 初期データベース名
      // 🟡 信頼性: interfaces.ts から妥当な推測
      defaultDatabaseName: databaseName,

      // 【ストレージ暗号化】: KMS カスタマーマネージドキーで暗号化
      // 🔵 信頼性: REQ-026、NFR-102 より
      storageEncrypted: true,
      storageEncryptionKey: encryptionKey,

      // 【バックアップ設定】: 自動バックアップの保持期間
      // 🔵 信頼性: REQ-027 より
      backup: {
        retention: cdk.Duration.days(backupRetentionDays),
      },

      // 【削除保護】: スタック削除時にスナップショットを作成
      // 🔵 信頼性: BLEA 参考実装より
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // ========================================================================
    // 【公開プロパティ設定】: 他の Stack から参照可能なリソースを設定
    // 🔵 信頼性: requirements.md 出力プロパティより
    // ========================================================================

    // 【クラスターエンドポイント】: Writer エンドポイント
    this.clusterEndpoint = this.cluster.clusterEndpoint;

    // 【認証情報 Secret】: Secrets Manager のシークレット
    // 🔵 信頼性: note.md CDK 実装制約より（credentials.fromGeneratedSecret で自動生成）
    this.secret = this.cluster.secret!;
  }
}
