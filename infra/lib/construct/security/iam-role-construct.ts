/**
 * IAM Role Construct 実装
 *
 * TASK-0006: IAM Role Construct 実装
 * フェーズ: Refactor フェーズ - コード品質改善
 *
 * 【機能概要】: ECS Fargate タスクの実行に必要な IAM Role を作成する CDK Construct
 * 【実装方針】: 最小権限の原則に基づき、2つの IAM Role を作成
 * 【テスト対応】: TC-IAM-01 〜 TC-IAM-15 の全16テストケースに対応
 * 【リファクタ内容】: JSDoc 強化、信頼性レベル表記の統一
 *
 * 構成内容:
 * - ECS Task Role: タスク実行中のアプリケーションが使用する権限
 *   - AmazonSSMManagedInstanceCore（ECS Exec 用）
 *   - secretsmanager:GetSecretValue（DB 認証情報取得用）
 * - ECS Task Execution Role: タスク起動時に ECS エージェントが使用する権限
 *   - AmazonECSTaskExecutionRolePolicy（ECR Pull, CloudWatch Logs 用）
 *
 * 参照した要件:
 * - REQ-018: Task Role に AmazonSSMManagedInstanceCore 権限を付与
 * - REQ-019: ECS Exec を有効化（Service 側で設定）
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-018、タスク定義 TASK-0006.md に基づく実装
 *
 * @module IamRoleConstruct
 */

import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

// ============================================================================
// 【定数定義】: IAM Role 説明文
// 🔵 信頼性: CDK ベストプラクティスより（監査・トラブルシューティング時に役立つ）
// ============================================================================

/**
 * 【ECS Task Role 説明】: ECS Fargate タスク用 IAM Role の説明文
 * 🔵 信頼性: note.md CDKベストプラクティスより
 */
const DESCRIPTION_TASK_ROLE = 'IAM role for ECS Fargate tasks';

/**
 * 【ECS Task Execution Role 説明】: ECS タスク実行用 IAM Role の説明文
 * 🔵 信頼性: note.md CDKベストプラクティスより
 */
const DESCRIPTION_EXECUTION_ROLE = 'IAM role for ECS task execution';

/**
 * 【デフォルト Secret ARN】: secretArns 未指定または空配列時のデフォルト値
 * 🟡 信頼性: requirements.md エッジケース EC-01 より（妥当な推測を含む）
 */
const DEFAULT_SECRET_ARNS = ['*'];

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * IamRoleConstruct の Props インターフェース
 *
 * 【設計方針】: secretArns はオプショナルでデフォルト値を提供
 * 【再利用性】: 異なる Secrets Manager ARN に対応可能
 * 🔵 信頼性: タスクノート note.md、TASK-0006.md 型定義より
 *
 * @interface IamRoleConstructProps
 */
export interface IamRoleConstructProps {
  /**
   * Secrets Manager Secret ARN のリスト（オプション）
   *
   * 【用途】: Task Role に Secrets Manager アクセス権限を付与する際の ARN
   * 【デフォルト】: ['*'] - 全ての Secret にアクセス可能（開発環境向け）
   * 【本番推奨】: 特定の Secret ARN を指定してアクセスを制限
   * 🔵 信頼性: タスクノート note.md セキュリティ考慮事項より
   *
   * @default ['*']
   * @type {string[]}
   */
  readonly secretArns?: string[];
}

/**
 * IAM Role Construct
 *
 * 【機能概要】: 2つの IAM Role (Task Role, Execution Role) を作成する Construct
 * 【実装方針】: 最小権限の原則に基づき、必要最小限のポリシーのみ付与
 * 【テスト対応】: TC-IAM-01 〜 TC-IAM-15 の全テストケースを通すための実装
 *
 * セキュリティ設計:
 * - Task Role: ecs-tasks.amazonaws.com を信頼、AmazonSSMManagedInstanceCore + secretsmanager:GetSecretValue
 * - Execution Role: ecs-tasks.amazonaws.com を信頼、AmazonECSTaskExecutionRolePolicy
 *
 * 🔵 信頼性レベル: 要件定義書 REQ-018 に基づく実装
 *
 * @class IamRoleConstruct
 * @extends Construct
 *
 * @example
 * ```typescript
 * // デフォルト設定での使用
 * const iamRoles = new IamRoleConstruct(stack, 'IamRoles', {});
 *
 * // Secret ARN を指定した使用
 * const iamRoles = new IamRoleConstruct(stack, 'IamRoles', {
 *   secretArns: ['arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:my-db-secret-abc123'],
 * });
 *
 * // Task Definition での参照
 * const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
 *   taskRole: iamRoles.taskRole,
 *   executionRole: iamRoles.executionRole,
 * });
 * ```
 */
export class IamRoleConstruct extends Construct {
  /**
   * 【プロパティ】: ECS Task Role
   *
   * 【用途】: タスク実行中のアプリケーションが使用する IAM Role
   * 【権限】:
   *   - AmazonSSMManagedInstanceCore（ECS Exec 用）
   *   - secretsmanager:GetSecretValue（DB 認証情報取得用）
   * 【参照元】: Application Stack の Task Definition 作成時に使用
   * 🔵 信頼性: REQ-018 より
   *
   * @readonly
   * @type {iam.IRole}
   */
  public readonly taskRole: iam.IRole;

  /**
   * 【プロパティ】: ECS Task Execution Role
   *
   * 【用途】: タスク起動時に ECS エージェントが使用する IAM Role
   * 【権限】:
   *   - AmazonECSTaskExecutionRolePolicy（ECR Pull, CloudWatch Logs 用）
   * 【参照元】: Application Stack の Task Definition 作成時に使用
   * 🔵 信頼性: タスク定義 TASK-0006.md ECS Task Execution Role セクションより
   *
   * @readonly
   * @type {iam.IRole}
   */
  public readonly executionRole: iam.IRole;

  /**
   * IamRoleConstruct のコンストラクタ
   *
   * 【処理概要】: 2つの IAM Role を作成し、最小権限のポリシーを設定
   * 【設計方針】: secretArns 未指定または空配列時は DEFAULT_SECRET_ARNS を使用
   *
   * @param {Construct} scope - 親となる Construct
   * @param {string} id - この Construct の識別子
   * @param {IamRoleConstructProps} props - IAM Role 設定
   */
  constructor(scope: Construct, id: string, props: IamRoleConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【パラメータ処理】: secretArns のデフォルト値適用
    // 🔵 信頼性: requirements.md エッジケース EC-01, EC-03 より
    // ========================================================================

    // 【secretArns デフォルト値適用】: undefined または空配列の場合はデフォルト値を使用
    // 🟡 信頼性: requirements.md エッジケース EC-01 より（妥当な推測を含む）
    const secretArns =
      props.secretArns && props.secretArns.length > 0
        ? props.secretArns
        : DEFAULT_SECRET_ARNS;

    // ========================================================================
    // 【ECS Task Role 作成】: タスク実行中のアプリケーション用
    // 🔵 信頼性: REQ-018、タスク定義 TASK-0006.md より
    // ========================================================================
    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      // 【Trust Relationship 設定】: ecs-tasks.amazonaws.com を信頼
      // 🔵 信頼性: note.md Trust Relationship 設計より
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),

      // 【説明設定】: 監査・トラブルシューティング用の説明文
      // 🔵 信頼性: note.md CDKベストプラクティスより
      description: DESCRIPTION_TASK_ROLE,
    });

    // 【AmazonSSMManagedInstanceCore ポリシーアタッチ】: ECS Exec 用
    // 🔵 信頼性: REQ-018 より（Task Role に AmazonSSMManagedInstanceCore 権限を付与）
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // 【Secrets Manager アクセス権限追加】: DB 認証情報取得用
    // 🔵 信頼性: TASK-0006.md Secrets Manager アクセス権限セクションより
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        // 【許可設定】: Allow
        effect: iam.Effect.ALLOW,

        // 【アクション設定】: secretsmanager:GetSecretValue
        actions: ['secretsmanager:GetSecretValue'],

        // 【リソース設定】: secretArns パラメータで指定された ARN
        // 🔵 信頼性: note.md セキュリティ考慮事項より
        resources: secretArns,
      })
    );

    // 【プロパティ設定】: taskRole を公開プロパティとして設定
    // 🔵 信頼性: note.md 型定義インターフェースより
    this.taskRole = taskRole;

    // ========================================================================
    // 【ECS Task Execution Role 作成】: タスク起動時の ECS エージェント用
    // 🔵 信頼性: TASK-0006.md ECS Task Execution Role セクションより
    // ========================================================================
    const executionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      // 【Trust Relationship 設定】: ecs-tasks.amazonaws.com を信頼
      // 🔵 信頼性: note.md Trust Relationship 設計より
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),

      // 【説明設定】: 監査・トラブルシューティング用の説明文
      // 🔵 信頼性: note.md CDKベストプラクティスより
      description: DESCRIPTION_EXECUTION_ROLE,
    });

    // 【AmazonECSTaskExecutionRolePolicy ポリシーアタッチ】: ECR Pull + CloudWatch Logs 用
    // 🔵 信頼性: TASK-0006.md より（service-role/ プレフィックス付きで指定）
    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AmazonECSTaskExecutionRolePolicy'
      )
    );

    // 【プロパティ設定】: executionRole を公開プロパティとして設定
    // 🔵 信頼性: note.md 型定義インターフェースより
    this.executionRole = executionRole;
  }
}
