/**
 * Security Stack 実装
 *
 * TASK-0007: Security Stack 統合
 * フェーズ: TDD Refactor Phase - 品質改善とリファクタリング完了
 *
 * 【機能概要】: SecurityGroupConstruct と IamRoleConstruct を統合した Security Stack を作成する
 * 【実装方針】: 既存の Construct を統合し、他の Stack から参照可能なプロパティを公開
 * 【セキュリティ】: 最小権限の原則に基づく Security Group + IAM Role の統合管理
 * 【テスト対応】: TC-SS-01 〜 TC-SS-20 の全29テストケースに対応
 *
 * 構成内容:
 * - ALB Security Group: HTTP(80) と HTTPS(443) のインバウンドを許可 (REQ-028, REQ-029)
 * - ECS Security Group: ALB からのトラフィックのみを許可 (dataflow.md)
 * - Aurora Security Group: ECS からの 3306 ポートアクセスのみを許可 (REQ-024, REQ-025)
 * - ECS Task Role: AmazonSSMManagedInstanceCore + Secrets Manager アクセス (REQ-018)
 * - ECS Task Execution Role: AmazonECSTaskExecutionRolePolicy (TASK-0006)
 *
 * @module SecurityStack
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../../parameter';
import { SecurityGroupConstruct } from '../construct/security/security-group-construct';
import { IamRoleConstruct } from '../construct/security/iam-role-construct';

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * SecurityStack の Props インターフェース
 *
 * 【設計方針】: VPC と EnvironmentConfig を必須パラメータとして受け取り、Stack の設定を行う
 * 【再利用性】: 異なる環境（Dev/Prod）で柔軟に設定可能
 *
 * @interface SecurityStackProps
 * @extends cdk.StackProps
 */
export interface SecurityStackProps extends cdk.StackProps {
  /**
   * VPC への参照（必須）
   * Security Group を VPC 内に作成するために必要
   */
  readonly vpc: ec2.IVpc;

  /**
   * 環境設定（必須）
   * 環境名、リージョンなどの設定を提供
   */
  readonly config: EnvironmentConfig;
}

/**
 * Security Stack
 *
 * 【機能概要】: SecurityGroupConstruct と IamRoleConstruct を統合した CDK Stack
 * 【実装方針】: 既存の Construct を使用し、他の Stack から参照可能なプロパティを公開
 * 【テスト対応】: TC-SS-01 〜 TC-SS-20 の全29テストケースに対応
 *
 * 構成内容:
 * - ALB Security Group (REQ-028, REQ-029)
 * - ECS Security Group (dataflow.md)
 * - Aurora Security Group (REQ-024, REQ-025)
 * - ECS Task Role (REQ-018)
 * - ECS Task Execution Role (TASK-0006)
 *
 * @class SecurityStack
 * @extends cdk.Stack
 *
 * @example
 * ```typescript
 * const securityStack = new SecurityStack(app, 'SecurityStack', {
 *   vpc: vpcStack.vpc,
 *   config: devConfig,
 *   env: {
 *     account: config.account,
 *     region: config.region,
 *   },
 * });
 * securityStack.addDependency(vpcStack);
 * ```
 */
export class SecurityStack extends cdk.Stack {
  // ==========================================================================
  // 【公開プロパティ】: 他の Stack から参照可能なリソース
  // 【設計方針】: ISecurityGroup, IRole 等のインターフェース型を使用して柔軟性を確保
  // ==========================================================================

  /**
   * ALB 用 Security Group
   * HTTP(80) と HTTPS(443) のインバウンドを 0.0.0.0/0 から許可
   * @readonly
   */
  public readonly albSecurityGroup: ec2.ISecurityGroup;

  /**
   * ECS 用 Security Group
   * ALB Security Group からの containerPort のみ許可
   * @readonly
   */
  public readonly ecsSecurityGroup: ec2.ISecurityGroup;

  /**
   * Aurora 用 Security Group
   * ECS Security Group からの 3306 のみ許可、アウトバウンド制限
   * @readonly
   */
  public readonly auroraSecurityGroup: ec2.ISecurityGroup;

  /**
   * ECS Task Role
   * AmazonSSMManagedInstanceCore + secretsmanager:GetSecretValue 権限
   * @readonly
   */
  public readonly ecsTaskRole: iam.IRole;

  /**
   * ECS Task Execution Role
   * AmazonECSTaskExecutionRolePolicy 権限（ECR Pull、CloudWatch Logs 書き込み）
   * @readonly
   */
  public readonly ecsTaskExecutionRole: iam.IRole;

  /**
   * SecurityStack のコンストラクタ
   *
   * 【処理概要】: SecurityGroupConstruct と IamRoleConstruct を作成し、プロパティを公開
   * 【設計方針】: vpc を SecurityGroupConstruct に渡し、IamRoleConstruct はデフォルト設定で作成
   *
   * @param {Construct} scope - 親となる Construct (通常は App)
   * @param {string} id - この Stack の識別子
   * @param {SecurityStackProps} props - SecurityStack の Props
   */
  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // ========================================================================
    // 【SecurityGroupConstruct 作成】: 3つの Security Group を作成
    // ========================================================================
    const securityGroups = new SecurityGroupConstruct(this, 'SecurityGroups', {
      vpc: props.vpc,
      // containerPort はデフォルト値 80 を使用
    });

    // ========================================================================
    // 【IamRoleConstruct 作成】: 2つの IAM Role を作成
    // ========================================================================
    const iamRoles = new IamRoleConstruct(this, 'IamRoles', {
      // secretArns はデフォルト値 ['*'] を使用
    });

    // ========================================================================
    // 【プロパティ設定】: 外部からアクセス可能なプロパティを設定
    // ========================================================================

    // Security Group 参照
    this.albSecurityGroup = securityGroups.albSecurityGroup;
    this.ecsSecurityGroup = securityGroups.ecsSecurityGroup;
    this.auroraSecurityGroup = securityGroups.auroraSecurityGroup;

    // IAM Role 参照
    this.ecsTaskRole = iamRoles.taskRole;
    this.ecsTaskExecutionRole = iamRoles.executionRole;

    // ========================================================================
    // 【CfnOutput 生成】: クロススタック参照用エクスポートを作成
    // ========================================================================

    // Security Group ID エクスポート
    new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
      value: this.albSecurityGroup.securityGroupId,
      description: 'Security Group ID for ALB',
      exportName: `${props.config.envName}-AlbSecurityGroupId`,
    });

    new cdk.CfnOutput(this, 'EcsSecurityGroupId', {
      value: this.ecsSecurityGroup.securityGroupId,
      description: 'Security Group ID for ECS Fargate tasks',
      exportName: `${props.config.envName}-EcsSecurityGroupId`,
    });

    new cdk.CfnOutput(this, 'AuroraSecurityGroupId', {
      value: this.auroraSecurityGroup.securityGroupId,
      description: 'Security Group ID for Aurora MySQL',
      exportName: `${props.config.envName}-AuroraSecurityGroupId`,
    });

    // IAM Role ARN エクスポート
    new cdk.CfnOutput(this, 'EcsTaskRoleArn', {
      value: this.ecsTaskRole.roleArn,
      description: 'IAM Role ARN for ECS tasks',
      exportName: `${props.config.envName}-EcsTaskRoleArn`,
    });

    new cdk.CfnOutput(this, 'EcsTaskExecutionRoleArn', {
      value: this.ecsTaskExecutionRole.roleArn,
      description: 'IAM Role ARN for ECS task execution',
      exportName: `${props.config.envName}-EcsTaskExecutionRoleArn`,
    });
  }
}
