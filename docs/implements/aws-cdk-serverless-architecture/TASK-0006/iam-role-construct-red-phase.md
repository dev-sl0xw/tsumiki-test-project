# TASK-0006: IAM Role Construct - Red Phase 記録

**タスクID**: TASK-0006
**機能名**: IAM Role Construct for ECS Tasks
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: TDD - Red Phase（失敗するテスト作成）
**作成日**: 2026-01-18

---

## 1. 作成したテストケース一覧

| テストID | テスト名 | カテゴリ | 信頼性 | 状態 |
|----------|----------|----------|--------|------|
| TC-IAM-01 | ECS Task Role が作成されること | 正常系 | 🔵 | FAIL |
| TC-IAM-02 | Task Role に ecs-tasks.amazonaws.com が AssumeRole できること | 正常系 | 🔵 | FAIL |
| TC-IAM-03 | Task Role に AmazonSSMManagedInstanceCore がアタッチされていること | 正常系 | 🔵 | FAIL |
| TC-IAM-04 | Task Role に secretsmanager:GetSecretValue 権限が含まれていること | 正常系 | 🔵 | FAIL |
| TC-IAM-05 | ECS Task Execution Role が作成されること | 正常系 | 🔵 | FAIL |
| TC-IAM-06 | Execution Role に ecs-tasks.amazonaws.com が AssumeRole できること | 正常系 | 🔵 | PASS* |
| TC-IAM-07 | Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされていること | 正常系 | 🔵 | FAIL |
| TC-IAM-08 | 管理者権限 (AdministratorAccess 等) がアタッチされていないこと | 異常系 | 🔵 | PASS* |
| TC-IAM-09 | 公開プロパティ (taskRole, executionRole) が定義されていること | 正常系 | 🔵 | FAIL |
| TC-IAM-10 | 作成される IAM Role が 2 つであること | 正常系 | 🔵 | FAIL |
| TC-IAM-11 | secretArns を指定した場合、特定の ARN のみにアクセス許可されること | 正常系 | 🔵 | FAIL |
| TC-IAM-12 | secretArns が空配列の場合、デフォルト ['*'] が使用されること | 境界値 | 🟡 | FAIL |
| TC-IAM-13 | Props が undefined の場合、デフォルト値で Role が作成されること | 境界値 | 🔵 | FAIL |
| TC-IAM-14 | PowerUserAccess がアタッチされていないこと | 異常系 | 🔵 | PASS* |
| TC-IAM-15 | IAMFullAccess がアタッチされていないこと | 異常系 | 🔵 | PASS* |

**注**: PASS* はスタブ実装でリソースが存在しないため、「存在しない」ことを確認するテストがパスしている状態。Green フェーズで実装後も引き続きパスする必要がある。

---

## 2. テスト実行結果

### 2.1 実行コマンド

```bash
cd infra && npm test -- --testPathPattern=iam-role-construct
```

### 2.2 実行結果サマリー

```
Test Suites: 1 failed, 1 total
Tests:       12 failed, 4 passed, 16 total
Snapshots:   0 total
Time:        7.801 s
```

### 2.3 失敗の詳細

| 失敗理由 | テストケース |
|----------|--------------|
| Template has 0 resources with type AWS::IAM::Role | TC-IAM-01, 02, 03, 05, 06, 07, 10, 13 |
| Template has 0 resources with type AWS::IAM::Policy | TC-IAM-04, 11, 12 |
| expect(received).toBeDefined() - Received: undefined | TC-IAM-09 (taskRole, executionRole) |

---

## 3. 作成ファイル

### 3.1 テストファイル

**パス**: `infra/test/construct/security/iam-role-construct.test.ts`

```typescript
/**
 * IAM Role Construct テスト
 *
 * TASK-0006: IAM Role Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-IAM-01: ECS Task Role 作成確認
 * - TC-IAM-02: Task Role に ecs-tasks.amazonaws.com が AssumeRole できること
 * - TC-IAM-03: Task Role に AmazonSSMManagedInstanceCore がアタッチされていること
 * - TC-IAM-04: Task Role に secretsmanager:GetSecretValue 権限が含まれていること
 * - TC-IAM-05: ECS Task Execution Role 作成確認
 * - TC-IAM-06: Execution Role に ecs-tasks.amazonaws.com が AssumeRole できること
 * - TC-IAM-07: Execution Role に AmazonECSTaskExecutionRolePolicy がアタッチされていること
 * - TC-IAM-08: 管理者権限 (AdministratorAccess 等) がアタッチされていないこと
 * - TC-IAM-09: 公開プロパティ (taskRole, executionRole) が定義されていること
 * - TC-IAM-10: 作成される IAM Role が 2 つであること
 * - TC-IAM-11: secretArns を指定した場合、特定の ARN のみにアクセス許可されること
 * - TC-IAM-12: secretArns が空配列の場合、デフォルト ['*'] が使用されること
 * - TC-IAM-13: Props が undefined の場合、デフォルト値で Role が作成されること
 * - TC-IAM-14: PowerUserAccess がアタッチされていないこと
 * - TC-IAM-15: IAMFullAccess がアタッチされていないこと
 *
 * 🔵 信頼性: 要件定義書 REQ-018, タスク定義 TASK-0006.md に基づくテスト
 */
// ... (テストコード全文は infra/test/construct/security/iam-role-construct.test.ts を参照)
```

### 3.2 スタブ実装ファイル

**パス**: `infra/lib/construct/security/iam-role-construct.ts`

```typescript
/**
 * IAM Role Construct スタブ実装
 *
 * TASK-0006: IAM Role Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテスト用のスタブ実装
 */

export interface IamRoleConstructProps {
  readonly secretArns?: string[];
}

export class IamRoleConstruct extends Construct {
  public readonly taskRole: iam.IRole;
  public readonly executionRole: iam.IRole;

  constructor(scope: Construct, id: string, props: IamRoleConstructProps) {
    super(scope, id);
    // スタブ: プロパティは undefined
    this.taskRole = undefined as any;
    this.executionRole = undefined as any;
  }
}
```

---

## 4. 期待される失敗内容

### 4.1 正常系テストの失敗

| テストケース | 失敗理由 | 期待する Green フェーズでの解決 |
|--------------|----------|-------------------------------|
| TC-IAM-01 | IAM Role リソースが存在しない | ECS Task Role を作成 |
| TC-IAM-02 | IAM Role リソースが存在しない | Task Role に ecs-tasks Trust Relationship 設定 |
| TC-IAM-03 | IAM Role リソースが存在しない | Task Role に AmazonSSMManagedInstanceCore アタッチ |
| TC-IAM-04 | IAM Policy リソースが存在しない | Task Role にインラインポリシーで secretsmanager 権限追加 |
| TC-IAM-05 | IAM Role リソースが 0 個 | ECS Task Execution Role を作成 |
| TC-IAM-07 | IAM Role リソースが存在しない | Execution Role に AmazonECSTaskExecutionRolePolicy アタッチ |
| TC-IAM-09 | taskRole, executionRole が undefined | コンストラクタ内でプロパティを初期化 |
| TC-IAM-10 | IAM Role が 0 個 | 2 つの Role を作成 |

### 4.2 境界値テストの失敗

| テストケース | 失敗理由 | 期待する Green フェーズでの解決 |
|--------------|----------|-------------------------------|
| TC-IAM-11 | IAM Policy リソースが存在しない | secretArns パラメータを反映した Policy 作成 |
| TC-IAM-12 | IAM Policy リソースが存在しない | 空配列時のデフォルト値フォールバック実装 |
| TC-IAM-13 | IAM Role リソースが存在しない | Props 省略時のデフォルト動作実装 |

---

## 5. Green フェーズで実装すべき内容

### 5.1 ECS Task Role

```typescript
// 作成すべきリソース
const taskRole = new iam.Role(this, 'EcsTaskRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: 'IAM role for ECS Fargate tasks',
});

// アタッチすべきマネージドポリシー
taskRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
);

// 追加すべきインラインポリシー
taskRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['secretsmanager:GetSecretValue'],
  resources: secretArns ?? ['*'],
}));
```

### 5.2 ECS Task Execution Role

```typescript
// 作成すべきリソース
const executionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
  assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
  description: 'IAM role for ECS task execution',
});

// アタッチすべきマネージドポリシー
executionRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
);
```

### 5.3 プロパティ初期化

```typescript
// コンストラクタ内で設定
this.taskRole = taskRole;
this.executionRole = executionRole;
```

---

## 6. 信頼性レベルサマリー

| 信頼性 | テストケース数 | 割合 |
|--------|---------------|------|
| 🔵 青信号 | 14 | 93% |
| 🟡 黄信号 | 1 | 7% |
| 🔴 赤信号 | 0 | 0% |

---

## 7. 品質評価

### 評価基準チェック

| 基準 | 評価 | 詳細 |
|------|------|------|
| テスト実行 | ✅ 成功（失敗することを確認） | 12 件が期待通り失敗 |
| 期待値 | ✅ 明確で具体的 | 各テストに詳細なコメント付き |
| アサーション | ✅ 適切 | hasResourceProperties, resourceCountIs, toBeDefined |
| 実装方針 | ✅ 明確 | Green フェーズで実装すべき内容を明記 |
| 信頼性レベル | ✅ 青多数 | 93% が青信号 |

### 総合評価

**✅ 高品質** - Red フェーズとして期待通りの失敗が発生し、実装方針が明確

---

## 8. 次のステップ

**推奨コマンド**: `/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0006`

Green フェーズで以下を実装:
1. ECS Task Role の作成（AmazonSSMManagedInstanceCore + secretsmanager 権限）
2. ECS Task Execution Role の作成（AmazonECSTaskExecutionRolePolicy）
3. 公開プロパティ（taskRole, executionRole）の初期化
4. secretArns パラメータの処理（デフォルト値フォールバック含む）
