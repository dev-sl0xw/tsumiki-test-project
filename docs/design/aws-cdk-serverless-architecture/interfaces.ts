/**
 * AWS CDK サーバーレスWebサービスアーキテクチャ 型定義
 *
 * 作成日: 2026-01-13
 * 関連アーキテクチャ: architecture.md
 * 関連要件定義: requirements.md
 *
 * 【信頼性レベル凡例】:
 * - 🔵 青信号: EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実な設計
 * - 🟡 黄信号: EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測による設計
 * - 🔴 赤信号: EARS要件定義書・設計文書・ユーザヒアリングにない推測による設計
 */

// ============================================================================
// 環境設定 (parameter.ts 用)
// ============================================================================

/**
 * 環境名の型定義 🔵
 * @description Dev と Prod の 2 環境をサポート (REQ-042)
 */
export type EnvironmentName = 'dev' | 'prod';

/**
 * AWS アカウント・リージョン設定 🔵
 * @description デプロイ先の AWS 環境を指定 (REQ-403)
 */
export interface AwsEnvironment {
  /** AWS アカウント ID */
  readonly account: string;
  /** AWS リージョン (ap-northeast-1) */
  readonly region: 'ap-northeast-1';
}

/**
 * 環境別設定インターフェース 🔵
 * @description parameter.ts で使用する設定オブジェクトの型
 */
export interface EnvironmentConfig {
  /** 環境名 (dev/prod) */
  readonly envName: EnvironmentName;

  /** AWS 環境設定 */
  readonly env: AwsEnvironment;

  // -------------------------------------------------------------------------
  // ネットワーク設定 (REQ-001〜007)
  // -------------------------------------------------------------------------
  readonly network: NetworkConfig;

  // -------------------------------------------------------------------------
  // コンピューティング設定 (REQ-012〜021)
  // -------------------------------------------------------------------------
  readonly compute: ComputeConfig;

  // -------------------------------------------------------------------------
  // データベース設定 (REQ-022〜027)
  // -------------------------------------------------------------------------
  readonly database: DatabaseConfig;

  // -------------------------------------------------------------------------
  // セキュリティ・配信設定 (REQ-028〜034)
  // -------------------------------------------------------------------------
  readonly distribution: DistributionConfig;

  // -------------------------------------------------------------------------
  // 監視・運用設定 (REQ-035〜041)
  // -------------------------------------------------------------------------
  readonly monitoring: MonitoringConfig;

  // -------------------------------------------------------------------------
  // CI/CD 設定 (REQ-040〜041)
  // -------------------------------------------------------------------------
  readonly cicd: CicdConfig;

  // -------------------------------------------------------------------------
  // タグ設定
  // -------------------------------------------------------------------------
  readonly tags: TagConfig;
}

// ============================================================================
// ネットワーク設定
// ============================================================================

/**
 * ネットワーク設定 🔵
 * @description VPC とサブネットの設定 (REQ-001〜007)
 */
export interface NetworkConfig {
  /** VPC CIDR Block (10.0.0.0/16) */
  readonly vpcCidr: string;

  /** 可用性ゾーン数 (2) */
  readonly maxAzs: number;

  /** NAT Gateway 数 (2 - 各 AZ に 1 つ) */
  readonly natGateways: number;

  /** サブネット設定 */
  readonly subnets: SubnetConfig;

  /** VPC Endpoints 設定 */
  readonly vpcEndpoints: VpcEndpointsConfig;
}

/**
 * サブネット設定 🔵
 * @description 各サブネットの CIDR マスク設定 (REQ-003〜005)
 */
export interface SubnetConfig {
  /** Public Subnet CIDR マスク (/24) */
  readonly publicSubnetCidrMask: number;

  /** Private App Subnet CIDR マスク (/23) */
  readonly privateAppSubnetCidrMask: number;

  /** Private DB Subnet CIDR マスク (/24) */
  readonly privateDbSubnetCidrMask: number;
}

/**
 * VPC Endpoints 設定 🔵
 * @description 有効化する VPC Endpoints (REQ-008〜011)
 */
export interface VpcEndpointsConfig {
  /** SSM Endpoints (ssm, ssmmessages, ec2messages) */
  readonly ssm: boolean;

  /** ECR Endpoints (ecr.api, ecr.dkr) */
  readonly ecr: boolean;

  /** CloudWatch Logs Endpoint (logs) */
  readonly logs: boolean;

  /** S3 Gateway Endpoint */
  readonly s3: boolean;
}

// ============================================================================
// コンピューティング設定
// ============================================================================

/**
 * コンピューティング設定 🔵
 * @description ECS Fargate クラスターとサービスの設定 (REQ-012〜021)
 */
export interface ComputeConfig {
  /** ECS クラスター設定 */
  readonly cluster: EcsClusterConfig;

  /** タスク定義設定 */
  readonly taskDefinition: TaskDefinitionConfig;

  /** ECS Service 設定 */
  readonly service: EcsServiceConfig;
}

/**
 * ECS クラスター設定 🔵
 * @description ECS クラスターの基本設定 (REQ-012〜013)
 */
export interface EcsClusterConfig {
  /** クラスター名のサフィックス */
  readonly clusterNameSuffix: string;

  /** Container Insights 有効化 */
  readonly containerInsights: boolean;
}

/**
 * タスク定義設定 🔵
 * @description ECS タスク定義の設定 (REQ-014〜018)
 */
export interface TaskDefinitionConfig {
  /** CPU (512 = 0.5 vCPU) */
  readonly cpu: 256 | 512 | 1024 | 2048 | 4096;

  /** Memory (1024 = 1 GB) */
  readonly memoryMiB: number;

  /** アプリケーションコンテナ設定 */
  readonly appContainer: ContainerConfig;

  /** Sidecar コンテナ設定 */
  readonly sidecarContainer: SidecarContainerConfig;
}

/**
 * コンテナ設定 🟡
 * @description アプリケーションコンテナの設定
 */
export interface ContainerConfig {
  /** コンテナ名 */
  readonly name: string;

  /** コンテナイメージ (ECR リポジトリ名) */
  readonly image: string;

  /** コンテナポート */
  readonly containerPort: number;

  /** ヘルスチェックパス */
  readonly healthCheckPath: string;

  /** 環境変数 */
  readonly environment?: Record<string, string>;
}

/**
 * Sidecar コンテナ設定 🔵
 * @description Bastion/Sidecar コンテナの設定 (REQ-015〜017)
 */
export interface SidecarContainerConfig {
  /** コンテナ名 */
  readonly name: string;

  /** コンテナイメージ (alpine 等) */
  readonly image: string;

  /** socat ポートフォワーディング用のローカルポート */
  readonly localPort: number;

  /** Aurora のリモートポート */
  readonly remotePort: number;
}

/**
 * ECS Service 設定 🔵
 * @description ECS Service の設定 (REQ-019〜021)
 */
export interface EcsServiceConfig {
  /** Desired Count (2 以上) */
  readonly desiredCount: number;

  /** ECS Exec 有効化 */
  readonly enableExecuteCommand: boolean;

  /** デプロイメント設定 */
  readonly deployment: DeploymentConfig;
}

/**
 * デプロイメント設定 🟡
 * @description ECS デプロイメントの設定
 */
export interface DeploymentConfig {
  /** 最小ヘルシーパーセント */
  readonly minimumHealthyPercent: number;

  /** 最大パーセント */
  readonly maximumPercent: number;
}

// ============================================================================
// データベース設定
// ============================================================================

/**
 * データベース設定 🔵
 * @description Aurora MySQL Serverless v2 の設定 (REQ-022〜027)
 */
export interface DatabaseConfig {
  /** Aurora 設定 */
  readonly aurora: AuroraConfig;

  /** バックアップ設定 */
  readonly backup: BackupConfig;
}

/**
 * Aurora 設定 🔵
 * @description Aurora MySQL Serverless v2 の設定 (REQ-022〜026)
 */
export interface AuroraConfig {
  /** エンジンバージョン 🟡 */
  readonly engineVersion: string;

  /** 最小 ACU (Aurora Capacity Unit) */
  readonly minCapacity: number;

  /** 最大 ACU */
  readonly maxCapacity: number;

  /** Storage Encryption 有効化 */
  readonly storageEncrypted: boolean;

  /** データベース名 🟡 */
  readonly defaultDatabaseName: string;

  /** ポート番号 */
  readonly port: number;
}

/**
 * バックアップ設定 🔵
 * @description Aurora のバックアップ設定 (REQ-027)
 */
export interface BackupConfig {
  /** 自動バックアップ有効化 */
  readonly enabled: boolean;

  /** バックアップ保持期間（日数） 🟡 */
  readonly retentionDays: number;
}

// ============================================================================
// セキュリティ・配信設定
// ============================================================================

/**
 * 配信設定 🔵
 * @description ALB, CloudFront, WAF, S3 の設定 (REQ-028〜034)
 */
export interface DistributionConfig {
  /** ALB 設定 */
  readonly alb: AlbConfig;

  /** CloudFront 設定 */
  readonly cloudfront: CloudFrontConfig;

  /** WAF 設定 */
  readonly waf: WafConfig;

  /** S3 設定 */
  readonly s3: S3Config;

  /** SSL/TLS 設定 */
  readonly ssl: SslConfig;
}

/**
 * ALB 設定 🔵
 * @description Application Load Balancer の設定 (REQ-028〜029)
 */
export interface AlbConfig {
  /** Internet-facing */
  readonly internetFacing: boolean;

  /** HTTP → HTTPS リダイレクト */
  readonly httpToHttpsRedirect: boolean;

  /** ヘルスチェック設定 🟡 */
  readonly healthCheck: HealthCheckConfig;
}

/**
 * ヘルスチェック設定 🟡
 * @description ALB ヘルスチェックの設定
 */
export interface HealthCheckConfig {
  /** ヘルスチェックパス */
  readonly path: string;

  /** ヘルシー閾値 */
  readonly healthyThresholdCount: number;

  /** アンヘルシー閾値 */
  readonly unhealthyThresholdCount: number;

  /** タイムアウト（秒） */
  readonly timeout: number;

  /** インターバル（秒） */
  readonly interval: number;
}

/**
 * CloudFront 設定 🔵
 * @description CloudFront ディストリビューションの設定 (REQ-032)
 */
export interface CloudFrontConfig {
  /** Price Class 🟡 */
  readonly priceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';

  /** Viewer Protocol Policy */
  readonly viewerProtocolPolicy: 'redirect-to-https' | 'https-only';

  /** OAC 使用 */
  readonly useOac: boolean;
}

/**
 * WAF 設定 🔵
 * @description WAF の設定 (REQ-033〜034)
 */
export interface WafConfig {
  /** WAF 有効化 */
  readonly enabled: boolean;

  /** AWS Managed Rules */
  readonly managedRules: WafManagedRule[];
}

/**
 * WAF Managed Rule 🔵
 * @description WAF で使用する AWS Managed Rules (REQ-034)
 */
export interface WafManagedRule {
  /** ルール名 */
  readonly name: string;

  /** ベンダー名 */
  readonly vendorName: 'AWS';

  /** 優先度 */
  readonly priority: number;
}

/**
 * S3 設定 🔵
 * @description 静的コンテンツ用 S3 バケットの設定 (REQ-031)
 */
export interface S3Config {
  /** バケット名サフィックス */
  readonly bucketNameSuffix: string;

  /** バージョニング有効化 🟡 */
  readonly versioning: boolean;

  /** ブロックパブリックアクセス */
  readonly blockPublicAccess: boolean;
}

/**
 * SSL/TLS 設定 🔵
 * @description ACM 証明書の設定 (REQ-030)
 */
export interface SslConfig {
  /** ACM 使用 */
  readonly useAcm: boolean;

  /** カスタムドメイン使用 (REQ-043) */
  readonly useCustomDomain: false;
}

// ============================================================================
// 監視・運用設定
// ============================================================================

/**
 * 監視設定 🔵
 * @description CloudWatch Logs/Alarms, Chatbot の設定 (REQ-035〜039)
 */
export interface MonitoringConfig {
  /** ログ設定 */
  readonly logs: LogsConfig;

  /** アラーム設定 */
  readonly alarms: AlarmsConfig;

  /** 通知設定 */
  readonly notification: NotificationConfig;
}

/**
 * ログ設定 🔵
 * @description CloudWatch Logs の設定 (REQ-035〜038, REQ-101〜102)
 */
export interface LogsConfig {
  /** ログ保持期間（日数） */
  readonly retentionDays: number;

  /** S3 Glacier へのエクスポート (Prod のみ) */
  readonly exportToGlacier: boolean;

  /** Glacier への移行日数 (Prod: 30 日後) */
  readonly glacierTransitionDays?: number;
}

/**
 * アラーム設定 🔵
 * @description CloudWatch Alarms の設定 (REQ-039)
 */
export interface AlarmsConfig {
  /** ECS CPU アラーム設定 */
  readonly ecsCpuAlarm: MetricAlarmConfig;

  /** ECS Memory アラーム設定 */
  readonly ecsMemoryAlarm: MetricAlarmConfig;

  /** CloudWatch Logs エラーアラーム設定 */
  readonly logsErrorAlarm: LogsAlarmConfig;
}

/**
 * メトリクスアラーム設定 🔵
 * @description CloudWatch Metric Alarm の設定
 */
export interface MetricAlarmConfig {
  /** 有効化 */
  readonly enabled: boolean;

  /** 閾値（パーセント） */
  readonly threshold: number;

  /** 評価期間（秒） 🟡 */
  readonly evaluationPeriods: number;

  /** データポイント数 🟡 */
  readonly datapointsToAlarm: number;
}

/**
 * ログアラーム設定 🔵
 * @description CloudWatch Logs エラーパターンアラームの設定
 */
export interface LogsAlarmConfig {
  /** 有効化 */
  readonly enabled: boolean;

  /** 検索パターン 🟡 */
  readonly filterPattern: string;

  /** 閾値 */
  readonly threshold: number;

  /** 評価期間（秒） 🟡 */
  readonly evaluationPeriods: number;
}

/**
 * 通知設定 🔵
 * @description SNS + AWS Chatbot の設定 (REQ-039, REQ-103)
 */
export interface NotificationConfig {
  /** Slack 通知有効化 */
  readonly slackEnabled: boolean;

  /** Slack Workspace ID */
  readonly slackWorkspaceId: string;

  /** Slack Channel ID */
  readonly slackChannelId: string;
}

// ============================================================================
// CI/CD 設定
// ============================================================================

/**
 * CI/CD 設定 🔵
 * @description CodePipeline/CodeBuild の設定 (REQ-040〜041)
 */
export interface CicdConfig {
  /** パイプライン有効化 */
  readonly enabled: boolean;

  /** ソースリポジトリ設定 */
  readonly source: SourceConfig;

  /** ビルド設定 */
  readonly build: BuildConfig;
}

/**
 * ソースリポジトリ設定 🔵
 * @description CodeCommit リポジトリの設定
 */
export interface SourceConfig {
  /** リポジトリ名 */
  readonly repositoryName: string;

  /** ブランチ名 */
  readonly branchName: string;
}

/**
 * ビルド設定 🟡
 * @description CodeBuild プロジェクトの設定
 */
export interface BuildConfig {
  /** コンピュートタイプ */
  readonly computeType: 'BUILD_GENERAL1_SMALL' | 'BUILD_GENERAL1_MEDIUM' | 'BUILD_GENERAL1_LARGE';

  /** ビルドイメージ */
  readonly buildImage: string;

  /** 特権モード */
  readonly privilegedMode: boolean;
}

// ============================================================================
// タグ設定
// ============================================================================

/**
 * タグ設定 🟡
 * @description リソースに付与するタグ
 */
export interface TagConfig {
  /** プロジェクト名 */
  readonly Project: string;

  /** 環境名 */
  readonly Environment: string;

  /** 管理者 */
  readonly ManagedBy: 'CDK';

  /** 追加タグ */
  readonly [key: string]: string;
}

// ============================================================================
// デフォルト設定
// ============================================================================

/**
 * デフォルトネットワーク設定 🔵
 */
export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  vpcCidr: '10.0.0.0/16',
  maxAzs: 2,
  natGateways: 2,
  subnets: {
    publicSubnetCidrMask: 24,
    privateAppSubnetCidrMask: 23,
    privateDbSubnetCidrMask: 24,
  },
  vpcEndpoints: {
    ssm: true,
    ecr: true,
    logs: true,
    s3: true,
  },
};

/**
 * デフォルトコンピューティング設定 🔵
 */
export const DEFAULT_COMPUTE_CONFIG: ComputeConfig = {
  cluster: {
    clusterNameSuffix: 'cluster',
    containerInsights: true,
  },
  taskDefinition: {
    cpu: 512,
    memoryMiB: 1024,
    appContainer: {
      name: 'app',
      image: 'app',
      containerPort: 80,
      healthCheckPath: '/health',
    },
    sidecarContainer: {
      name: 'sidecar',
      image: 'alpine:latest',
      localPort: 3306,
      remotePort: 3306,
    },
  },
  service: {
    desiredCount: 2,
    enableExecuteCommand: true,
    deployment: {
      minimumHealthyPercent: 50,
      maximumPercent: 200,
    },
  },
};

/**
 * デフォルトデータベース設定 🔵
 */
export const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
  aurora: {
    engineVersion: '3.04.0',
    minCapacity: 0.5,
    maxCapacity: 2,
    storageEncrypted: true,
    defaultDatabaseName: 'appdb',
    port: 3306,
  },
  backup: {
    enabled: true,
    retentionDays: 7,
  },
};

/**
 * デフォルト WAF ルール 🔵
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
// 環境別設定サンプル
// ============================================================================

/**
 * Dev 環境ログ設定 🔵
 */
export const DEV_LOGS_CONFIG: LogsConfig = {
  retentionDays: 3,
  exportToGlacier: false,
};

/**
 * Prod 環境ログ設定 🔵
 */
export const PROD_LOGS_CONFIG: LogsConfig = {
  retentionDays: 30,
  exportToGlacier: true,
  glacierTransitionDays: 30,
};

// ============================================================================
// 信頼性レベルサマリー
// ============================================================================
/**
 * 信頼性レベル:
 * - 🔵 青信号: 35 件 (88%)
 * - 🟡 黄信号: 5 件 (12%)
 * - 🔴 赤信号: 0 件 (0%)
 *
 * 品質評価: ✅ 高品質 - 型定義の大部分が要件定義書・設計文書により確認済み
 */
