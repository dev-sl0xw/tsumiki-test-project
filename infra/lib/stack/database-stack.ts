/**
 * Database Stack 実装
 *
 * TASK-0010: Database Stack 統合
 * フェーズ: TDD Refactor Phase - 品質改善とリファクタリング完了
 *
 * 【機能概要】: AuroraConstruct を統合した Database Stack を作成する
 * 【実装方針】: 既存の AuroraConstruct を使用し、他の Stack から参照可能なプロパティを公開
 * 【セキュリティ】: Aurora Serverless v2 + Secrets Manager 統合によるセキュアなデータベース
 * 【テスト対応】: TC-DS-01 〜 TC-DS-17 の全テストケースに対応
 * 🔵 信頼性レベル: 要件定義書 REQ-022 〜 REQ-027、SMR-001 に基づく実装
 *
 * 構成内容:
 * - Aurora Serverless v2 MySQL クラスター (REQ-022)
 * - Private Isolated Subnet 配置 (REQ-023)
 * - Storage Encryption (KMS) (REQ-026)
 * - 自動バックアップ (REQ-027)
 * - Secrets Manager 認証情報管理 (SMR-001)
 *
 * @module DatabaseStack
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../parameter';
import { AuroraConstruct } from '../construct/database/aurora-construct';

// ============================================================================
// 【定数定義】
// 🔵 信頼性: Aurora MySQL 仕様より
// ============================================================================

/**
 * Aurora MySQL のデフォルト接続ポート
 *
 * 【値】: 3306
 * 【用途】: Aurora MySQL クラスターへの接続ポート
 * 【補足】: aurora.clusterEndpoint.port は CDK Token を返すため、
 *          テスト時に正しい値を返さない。定数値を使用する。
 * 🔵 信頼性: Aurora MySQL 仕様より
 */
const AURORA_MYSQL_DEFAULT_PORT = 3306;

// ============================================================================
// 【インターフェース定義】
// 🔵 信頼性: タスク定義書・設計文書より
// ============================================================================

/**
 * DatabaseStack の Props インターフェース
 *
 * 【設計方針】: VPC、Security Group、EnvironmentConfig を必須パラメータとして受け取り、Stack の設定を行う
 * 【再利用性】: 異なる環境（Dev/Prod）で柔軟に設定可能
 * 🔵 信頼性: タスク定義書 TASK-0010 より
 *
 * @interface DatabaseStackProps
 * @extends cdk.StackProps
 */
export interface DatabaseStackProps extends cdk.StackProps {
  /**
   * VPC への参照（必須）
   *
   * 【用途】: Aurora クラスターを VPC 内に配置するために必要
   * 【配置先】: Private Isolated Subnet
   * 🔵 信頼性: REQ-023 より必須パラメータ
   */
  readonly vpc: ec2.IVpc;

  /**
   * Aurora 用 Security Group（必須）
   *
   * 【用途】: Aurora クラスターのネットワークアクセス制御
   * 【設定内容】: ECS Security Group からの 3306 ポートのみ許可
   * 🔵 信頼性: REQ-024、REQ-025 より必須パラメータ
   */
  readonly auroraSecurityGroup: ec2.ISecurityGroup;

  /**
   * 環境設定（必須）
   *
   * 【用途】: 環境名、Aurora ACU 設定などを提供
   * 【設定項目】: envName、auroraMinCapacity、auroraMaxCapacity
   * 🔵 信頼性: タスク定義書より必須パラメータ
   */
  readonly config: EnvironmentConfig;
}

/**
 * Database Stack
 *
 * 【機能概要】: AuroraConstruct を統合した CDK Stack
 * 【実装方針】: 既存の AuroraConstruct を使用し、他の Stack から参照可能なプロパティを公開
 * 【テスト対応】: TC-DS-01 〜 TC-DS-17 の全テストケースに対応
 *
 * 構成内容:
 * - Aurora Serverless v2 MySQL クラスター (REQ-022)
 * - Secrets Manager 認証情報管理 (SMR-001)
 * - KMS ストレージ暗号化 (REQ-026)
 * - 自動バックアップ 7日間 (REQ-027)
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-022〜027 に基づく実装
 *
 * @class DatabaseStack
 * @extends cdk.Stack
 *
 * @example
 * ```typescript
 * const databaseStack = new DatabaseStack(app, 'DatabaseStack', {
 *   vpc: vpcStack.vpc,
 *   auroraSecurityGroup: securityStack.auroraSecurityGroup,
 *   config: devConfig,
 *   env: {
 *     account: config.account,
 *     region: config.region,
 *   },
 * });
 * databaseStack.addDependency(vpcStack);
 * databaseStack.addDependency(securityStack);
 * ```
 */
export class DatabaseStack extends cdk.Stack {
  // ==========================================================================
  // 【公開プロパティ】: 他の Stack から参照可能なリソース
  // 【設計方針】: IDatabaseCluster, ISecret 等のインターフェース型を使用して柔軟性を確保
  // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
  // ==========================================================================

  /**
   * Aurora クラスター
   *
   * 【用途】: 作成された Aurora クラスターへの参照
   * 【参照元】: Application Stack、監視設定
   * 🔵 信頼性: タスク定義書 TASK-0010、note.md 公開プロパティより
   *
   * @readonly
   * @type {rds.IDatabaseCluster}
   */
  public readonly auroraCluster: rds.IDatabaseCluster;

  /**
   * DB 認証情報シークレット
   *
   * 【用途】: Secrets Manager に保存された DB 認証情報
   * 【参照元】: ECS タスク定義のシークレット参照
   * 🔵 信頼性: タスク定義書 TASK-0010、note.md 公開プロパティより
   *
   * @readonly
   * @type {secretsmanager.ISecret}
   */
  public readonly dbSecret: secretsmanager.ISecret;

  /**
   * Writer エンドポイント hostname
   *
   * 【用途】: Aurora クラスターの Writer エンドポイント
   * 【参照元】: ECS タスク環境変数
   * 🔵 信頼性: タスク定義書 TASK-0010、note.md 公開プロパティより
   *
   * @readonly
   * @type {string}
   */
  public readonly dbEndpoint: string;

  /**
   * DB 接続ポート
   *
   * 【用途】: Aurora クラスターの接続ポート (3306)
   * 【参照元】: ECS タスク環境変数
   * 🔵 信頼性: タスク定義書 TASK-0010、note.md 公開プロパティより
   *
   * @readonly
   * @type {number}
   */
  public readonly dbPort: number;

  /**
   * DatabaseStack のコンストラクタ
   *
   * 【処理概要】: AuroraConstruct を作成し、プロパティを公開、CfnOutput を生成
   * 【設計方針】: vpc と auroraSecurityGroup を AuroraConstruct に渡し、config から ACU 設定を取得
   *
   * @param {Construct} scope - 親となる Construct (通常は App)
   * @param {string} id - この Stack の識別子
   * @param {DatabaseStackProps} props - DatabaseStack の Props
   */
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // ========================================================================
    // 【AuroraConstruct 作成】: Aurora Serverless v2 クラスターを作成
    // 【パラメータ】: vpc、securityGroup、envName、ACU 設定を渡す
    // 🔵 信頼性: タスク定義書・要件定義書 REQ-022 〜 REQ-027 より
    // ========================================================================
    const aurora = new AuroraConstruct(this, 'Aurora', {
      vpc: props.vpc,
      securityGroup: props.auroraSecurityGroup,
      envName: props.config.envName,
      minCapacity: props.config.auroraMinCapacity,
      maxCapacity: props.config.auroraMaxCapacity,
    });

    // ========================================================================
    // 【プロパティ設定】: 外部からアクセス可能なプロパティを設定
    // 【用途】: 他の Stack から Aurora リソースを参照するために公開
    // 🔵 信頼性: タスク定義書・CDK ベストプラクティスより
    // ========================================================================

    // 【Aurora クラスター参照】: IDatabaseCluster 型で公開
    this.auroraCluster = aurora.cluster;

    // 【DB 認証情報シークレット参照】: ISecret 型で公開
    this.dbSecret = aurora.secret;

    // 【Writer エンドポイント hostname】: 接続先ホスト名
    this.dbEndpoint = aurora.clusterEndpoint.hostname;

    // 【DB 接続ポート】: Aurora MySQL デフォルトポート 3306
    this.dbPort = AURORA_MYSQL_DEFAULT_PORT;

    // ========================================================================
    // 【CfnOutput 生成】: クロススタック参照用エクスポートを作成
    // 【用途】: 他の Stack からの参照、CloudFormation Outputs 確認
    // 🔵 信頼性: CDK ベストプラクティスより
    // ========================================================================

    // 【エンドポイントエクスポート】: Aurora Writer Endpoint
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.dbEndpoint,
      description: 'Aurora cluster writer endpoint',
      exportName: `${props.config.envName}-DbEndpoint`,
    });

    // 【ポートエクスポート】: Aurora MySQL ポート 3306
    new cdk.CfnOutput(this, 'DbPort', {
      value: this.dbPort.toString(),
      description: 'Aurora cluster port',
      exportName: `${props.config.envName}-DbPort`,
    });

    // 【シークレット ARN エクスポート】: Secrets Manager シークレット
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'Aurora database secret ARN',
      exportName: `${props.config.envName}-DbSecretArn`,
    });

    // 【クラスター ARN エクスポート】: Aurora クラスター ARN
    new cdk.CfnOutput(this, 'AuroraClusterArn', {
      value: this.auroraCluster.clusterArn,
      description: 'Aurora cluster ARN',
      exportName: `${props.config.envName}-AuroraClusterArn`,
    });
  }
}
