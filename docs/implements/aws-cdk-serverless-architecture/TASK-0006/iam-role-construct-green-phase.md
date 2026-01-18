# TASK-0006: IAM Role Construct - Green Phase 記録

**タスクID**: TASK-0006
**機能名**: IAM Role Construct for ECS Tasks
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: TDD - Green Phase（最小限の実装）
**作成日**: 2026-01-18
**完了日**: 2026-01-18

---

## 1. 実装サマリー

### 1.1 テスト結果

```
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        7.303 s
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

## 2. 実装コード

### 2.1 実装ファイル

**パス**: `infra/lib/construct/security/iam-role-construct.ts`

```typescript
/**
 * IAM Role Construct 実装
 *
 * TASK-0006: IAM Role Construct 実装
 * フェーズ: TDD Green Phase - テストを通すための最小限の実装
 *
 * 【機能概要】: ECS Fargate タスクの実行に必要な IAM Role を作成する CDK Construct
 * 【実装方針】: 最小権限の原則に基づき、2つの IAM Role を作成
 * 【テスト対応】: TC-IAM-01 〜 TC-IAM-15 の全16テストケースを通すための実装
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
// ============================================================================

const DESCRIPTION_TASK_ROLE = 'IAM role for ECS Fargate tasks';
const DESCRIPTION_EXECUTION_ROLE = 'IAM role for ECS task execution';
const DEFAULT_SECRET_ARNS = ['*'];

// ============================================================================
// 【インターフェース定義】
// ============================================================================

export interface IamRoleConstructProps {
  readonly secretArns?: string[];
}

// ============================================================================
// 【Construct クラス】
// ============================================================================

export class IamRoleConstruct extends Construct {
  public readonly taskRole: iam.IRole;
  public readonly executionRole: iam.IRole;

  constructor(scope: Construct, id: string, props: IamRoleConstructProps) {
    super(scope, id);

    // secretArns のデフォルト値適用
    const secretArns =
      props.secretArns && props.secretArns.length > 0
        ? props.secretArns
        : DEFAULT_SECRET_ARNS;

    // ECS Task Role 作成
    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: DESCRIPTION_TASK_ROLE,
    });

    // AmazonSSMManagedInstanceCore ポリシーアタッチ
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // Secrets Manager アクセス権限追加
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: secretArns,
      })
    );

    this.taskRole = taskRole;

    // ECS Task Execution Role 作成
    const executionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: DESCRIPTION_EXECUTION_ROLE,
    });

    // AmazonECSTaskExecutionRolePolicy ポリシーアタッチ
    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AmazonECSTaskExecutionRolePolicy'
      )
    );

    this.executionRole = executionRole;
  }
}
```

---

## 3. 実装方針と判断理由

### 3.1 ECS Task Role の実装

| 項目 | 実装内容 | 理由 |
|------|----------|------|
| Trust Relationship | `ecs-tasks.amazonaws.com` を ServicePrincipal として設定 | ECS Fargate タスクが Role を引き受けるため必須 |
| マネージドポリシー | `AmazonSSMManagedInstanceCore` をアタッチ | REQ-018 に基づき ECS Exec を有効化するため |
| インラインポリシー | `secretsmanager:GetSecretValue` を追加 | DB 認証情報を Secrets Manager から取得するため |

### 3.2 ECS Task Execution Role の実装

| 項目 | 実装内容 | 理由 |
|------|----------|------|
| Trust Relationship | `ecs-tasks.amazonaws.com` を ServicePrincipal として設定 | ECS エージェントが Role を引き受けるため必須 |
| マネージドポリシー | `service-role/AmazonECSTaskExecutionRolePolicy` をアタッチ | ECR Pull + CloudWatch Logs 書き込み権限を付与するため |

### 3.3 secretArns パラメータの処理

| ケース | 動作 | 理由 |
|--------|------|------|
| undefined | デフォルト `['*']` を使用 | 開発環境での使いやすさを優先 |
| 空配列 `[]` | デフォルト `['*']` を使用 | エッジケース EC-01 に対応 |
| 値あり | 指定された ARN を使用 | 本番環境での最小権限の原則を実現 |

---

## 4. テスト修正

### 4.1 テスト修正内容

Red フェーズのテストコードで、`Action` と `Resource` を配列として期待していましたが、CDK が単一要素を文字列として出力するため、テストを修正しました。

| 修正箇所 | 修正前 | 修正後 |
|----------|--------|--------|
| TC-IAM-04 | `Action: Match.arrayWith(['secretsmanager:GetSecretValue'])` | `Action: 'secretsmanager:GetSecretValue'` |
| TC-IAM-11 | `Action: Match.arrayWith([...]), Resource: Match.arrayWith([testSecretArn])` | `Action: '...', Resource: testSecretArn` |
| TC-IAM-12 | `Action: Match.arrayWith(['secretsmanager:GetSecretValue'])` | `Action: 'secretsmanager:GetSecretValue'` |
| TC-IAM-13 | `Action: Match.arrayWith(['secretsmanager:GetSecretValue'])` | `Action: 'secretsmanager:GetSecretValue'` |

### 4.2 修正理由

CDK は `PolicyStatement` を CloudFormation に出力する際、単一の `actions` や `resources` を配列ではなく文字列として出力します。これは CDK の仕様であり、実装は正しく動作しています。

---

## 5. 作成される AWS リソース

### 5.1 リソース一覧

| リソース種別 | 数量 | 説明 |
|-------------|------|------|
| AWS::IAM::Role | 2 | Task Role, Execution Role |
| AWS::IAM::Policy | 1 | Task Role のインラインポリシー |

### 5.2 マネージドポリシー

| ポリシー名 | 付与先 | 用途 |
|-----------|--------|------|
| AmazonSSMManagedInstanceCore | Task Role | ECS Exec (SSM Session Manager) |
| service-role/AmazonECSTaskExecutionRolePolicy | Execution Role | ECR Pull + CloudWatch Logs |

---

## 6. 品質評価

### 6.1 評価基準チェック

| 基準 | 評価 | 詳細 |
|------|------|------|
| テスト結果 | ✅ 全て成功 | 16/16 テストがパス |
| 実装品質 | ✅ シンプル | 最小限のコードでテストを通過 |
| リファクタ箇所 | ✅ 明確 | 定数抽出、JSDoc 強化が可能 |
| 機能的問題 | ✅ なし | 期待通りの動作 |
| コンパイルエラー | ✅ なし | TypeScript エラーなし |
| ファイルサイズ | ✅ 235行 | 800行制限以下 |
| モック使用 | ✅ 適切 | 実装コードにモックなし |

### 6.2 総合評価

**✅ 高品質** - 全テストが成功し、実装がシンプルで理解しやすい

---

## 7. 信頼性レベルサマリー

| 信頼性 | 項目数 | 割合 |
|--------|--------|------|
| 🔵 青信号 | 14 | 87.5% |
| 🟡 黄信号 | 2 | 12.5% |
| 🔴 赤信号 | 0 | 0% |

### 7.1 黄信号の項目

| 項目 | 理由 |
|------|------|
| TC-IAM-12 | 空配列時のデフォルト動作は妥当な推測を含む |
| DEFAULT_SECRET_ARNS | エッジケースの仕様から推測 |

---

## 8. Refactor フェーズで対応予定の課題

### 8.1 改善候補

| 項目 | 内容 | 優先度 |
|------|------|--------|
| JSDoc 強化 | より詳細なドキュメント追加 | 中 |
| 定数の外部化 | 定数を別ファイルに分離する可能性 | 低 |
| エラーハンドリング | 不正な ARN 形式のバリデーション | 低 |

### 8.2 現状維持の項目

| 項目 | 理由 |
|------|------|
| コード構造 | 既に security-group-construct.ts と一貫したパターン |
| コメント | 十分な日本語コメントが含まれている |
| 信頼性レベル表記 | 各セクションに適切に記載済み |

---

## 9. 次のステップ

**推奨コマンド**: `/tsumiki:tdd-refactor aws-cdk-serverless-architecture TASK-0006`

Refactor フェーズで以下を検討:
1. コード品質の確認と改善
2. 不要なコメントの整理
3. 最終テスト実行と確認

---

## 10. 関連文書リンク

| 文書 | パス |
|------|------|
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md` |
| タスクノート | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/note.md` |
| 要件定義書 | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/requirements.md` |
| テストケース定義 | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/testcases.md` |
| Red フェーズ記録 | `docs/implements/aws-cdk-serverless-architecture/TASK-0006/iam-role-construct-red-phase.md` |
| 実装ファイル | `infra/lib/construct/security/iam-role-construct.ts` |
| テストファイル | `infra/test/construct/security/iam-role-construct.test.ts` |
