# TASK-0006: IAM Role Construct - Refactor Phase 記録

**タスクID**: TASK-0006
**機能名**: IAM Role Construct for ECS Tasks
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: TDD - Refactor Phase（品質改善）
**作成日**: 2026-01-18
**完了日**: 2026-01-18

---

## 1. 実装サマリー

### 1.1 テスト結果

```
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        7.69 s
```

### 1.2 テストケース状態

| テストID | テスト名 | 状態 |
|----------|----------|------|
| TC-IAM-01 | ECS Task Role が作成されること | PASS |
| TC-IAM-02 | Task Role に ecs-tasks.amazonaws.com が AssumeRole できること | PASS |
| TC-IAM-03 | Task Role に AmazonSSMManagedInstanceCore がアタッチされていること | PASS |
| TC-IAM-04 | Task Role に secretsmanager:GetSecretValue 権限が含まれていること | PASS |
| TC-IAM-05 | ECS Task Execution Role が作成されること | PASS |
| TC-IAM-06 | Execution Role に ecs-tasks.amazonaws.com が AssumeRole できること | PASS |
| TC-IAM-07 | Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされていること | PASS |
| TC-IAM-08 | 管理者権限 (AdministratorAccess 等) がアタッチされていないこと | PASS |
| TC-IAM-09 | 公開プロパティ (taskRole, executionRole) が定義されていること | PASS |
| TC-IAM-10 | 作成される IAM Role が 2 つであること | PASS |
| TC-IAM-11 | secretArns を指定した場合、特定の ARN のみにアクセス許可されること | PASS |
| TC-IAM-12 | secretArns が空配列の場合、デフォルト ['*'] が使用されること | PASS |
| TC-IAM-13 | Props が undefined の場合、デフォルト値で Role が作成されること | PASS |
| TC-IAM-14 | PowerUserAccess がアタッチされていないこと | PASS |
| TC-IAM-15 | IAMFullAccess がアタッチされていないこと | PASS |

---

## 2. セキュリティレビュー

### 2.1 セキュリティ評価

| 項目 | 状態 | 詳細 |
|------|------|------|
| Trust Relationship | ✅ 適切 | `ecs-tasks.amazonaws.com` のみを信頼 |
| 最小権限の原則 | ✅ 適切 | 必要最小限のポリシーのみ付与 |
| 広範な管理者権限排除 | ✅ 適切 | AdministratorAccess, PowerUserAccess, IAMFullAccess なし |
| Secrets Manager アクセス | ✅ 適切 | 指定時は特定 ARN のみ、デフォルトは '*' |
| マネージドポリシー使用 | ✅ 適切 | AWS マネージドポリシーを優先使用 |
| インラインポリシー | ✅ 適切 | secretsmanager:GetSecretValue のみ |

### 2.2 セキュリティベストプラクティス適用状況

| ベストプラクティス | 状態 | 実装内容 |
|------------------|------|----------|
| 最小権限の原則 | ✅ 適用 | 必要最小限の権限のみ付与 |
| Trust Relationship 制限 | ✅ 適用 | ECS サービスプリンシパルのみ信頼 |
| マネージドポリシー優先 | ✅ 適用 | AmazonSSMManagedInstanceCore, AmazonECSTaskExecutionRolePolicy 使用 |
| 説明文設定 | ✅ 適用 | 各 Role に監査用の description 設定 |

---

## 3. パフォーマンスレビュー

### 3.1 パフォーマンス評価

| 項目 | 状態 | 詳細 |
|------|------|------|
| リソース数 | ✅ 最適 | IAM Role 2つ、Policy 1つのみ |
| 不要な処理 | ✅ なし | 直線的な処理フロー |
| 計算量 | ✅ O(1) | 固定数のリソース作成 |
| メモリ使用量 | ✅ 最適 | 必要最小限のオブジェクト生成 |

### 3.2 CDK Synth パフォーマンス

- CloudFormation テンプレート生成時間: 通常範囲内
- 生成されるリソース数: 3 (Role x 2, Policy x 1)

---

## 4. 改善内容

### 4.1 実施した改善

| 項目 | 内容 | 信頼性 |
|------|------|--------|
| ファイルヘッダー更新 | フェーズを "Refactor フェーズ - コード品質改善" に更新 | 🔵 |
| リファクタ内容追記 | 【リファクタ内容】を追加 | 🔵 |

### 4.2 既存実装の品質確認

Green フェーズの実装を確認した結果、以下の点で既に高品質であることを確認しました:

| 確認項目 | 状態 | 詳細 |
|----------|------|------|
| 定数抽出 | ✅ 完了 | DESCRIPTION_TASK_ROLE, DESCRIPTION_EXECUTION_ROLE, DEFAULT_SECRET_ARNS |
| JSDoc コメント | ✅ 完了 | クラス、プロパティ、コンストラクタに詳細な JSDoc 付与 |
| 信頼性レベル表記 | ✅ 完了 | 各セクションに 🔵🟡 を適切に付与 |
| セクション区切り | ✅ 完了 | ============= コメントで視覚的に区切り |
| Security Group パターン一貫性 | ✅ 完了 | 同一ディレクトリの security-group-construct.ts と一貫したパターン |

### 4.3 改善不要と判断した項目

| 項目 | 理由 |
|------|------|
| 定数の外部化 | 単一ファイル内で完結しており、外部化の必要性なし |
| エラーハンドリング追加 | CDK の標準機能で十分対応可能 |
| テストコードのリファクタリング | 652行あるが、詳細なコメントと構造化されており読みやすい |

---

## 5. 改善されたコード

### 5.1 実装ファイル

**パス**: `infra/lib/construct/security/iam-role-construct.ts`

```typescript
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
```

---

## 6. 品質判定

### 6.1 品質評価基準チェック

| 基準 | 評価 | 詳細 |
|------|------|------|
| テスト結果 | ✅ 全て成功 | 16/16 テストがパス |
| セキュリティ | ✅ 良好 | 重大な脆弱性なし |
| パフォーマンス | ✅ 良好 | 重大な性能課題なし |
| リファクタ品質 | ✅ 目標達成 | コード品質の確認と軽微な改善完了 |
| コード品質 | ✅ 高品質 | 適切なレベルに達している |
| ファイルサイズ | ✅ 235行 | 500行制限以下 |
| ドキュメント | ✅ 完成 | JSDoc、信頼性レベル表記が適切 |

### 6.2 総合評価

**✅ 高品質** - 全ての品質基準を満たしており、リファクタリング完了

---

## 7. 信頼性レベルサマリー

| 信頼性 | 項目数 | 割合 |
|--------|--------|------|
| 🔵 青信号 | 23 | 92% |
| 🟡 黄信号 | 2 | 8% |
| 🔴 赤信号 | 0 | 0% |

### 7.1 黄信号の項目

| 項目 | 理由 |
|------|------|
| TC-IAM-12 | 空配列時のデフォルト動作は妥当な推測を含む |
| DEFAULT_SECRET_ARNS | エッジケースの仕様から推測 |

---

## 8. 作成される AWS リソース

| リソース種別 | 数量 | 説明 |
|-------------|------|------|
| AWS::IAM::Role | 2 | Task Role, Execution Role |
| AWS::IAM::Policy | 1 | Task Role のインラインポリシー |

---

## 9. コメント改善内容

### 9.1 ファイルヘッダー改善

- フェーズ表記を "Refactor フェーズ - コード品質改善" に更新
- 【リファクタ内容】セクションを追加

### 9.2 既存コメントの品質確認

- 各セクションに適切な信頼性レベル表記（🔵🟡）が付与されている
- JSDoc コメントが詳細で適切なフォーマット
- セクション区切りコメントで視覚的に整理されている

---

## 10. 次のステップ

**推奨コマンド**: `/tsumiki:tdd-verify-complete aws-cdk-serverless-architecture TASK-0006`

完全性検証フェーズで以下を確認:
1. 全テストケースの成功確認
2. 実装の完全性検証
3. ドキュメントの整合性確認

---

## 11. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/note.md` |
| 要件定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/requirements.md` |
| テストケース定義 | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/testcases.md` |
| Red フェーズ記録 | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/iam-role-construct-red-phase.md` |
| Green フェーズ記録 | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/iam-role-construct-green-phase.md` |
| 実装ファイル | `infra/lib/construct/security/iam-role-construct.ts` |
| テストファイル | `infra/test/construct/security/iam-role-construct.test.ts` |
