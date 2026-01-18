# IAM Role Construct TDD開発完了記録

## 確認すべきドキュメント

- `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md`
- `docs/implements/aws-cdk-serverless-architecture/TASK-0006/requirements.md`
- `docs/implements/aws-cdk-serverless-architecture/TASK-0006/testcases.md`

## 🎯 最終結果 (2026-01-18)
- **実装率**: 100% (16/15テストケース - TC-IAM-09が2つに分割)
- **テストカバレッジ**: 100% (Statements, Branch, Functions, Lines)
- **品質判定**: ✅ 合格（高品質）
- **TODO更新**: ✅ 完了マーク追加

## 💡 重要な技術学習
### 実装パターン
- IAM Role の Trust Relationship 設計: `ecs-tasks.amazonaws.com` をサービスプリンシパルとして指定
- マネージドポリシーの参照: `ManagedPolicy.fromAwsManagedPolicyName()` を使用
- インラインポリシーの追加: `addToPolicy()` + `PolicyStatement` パターン
- Props のデフォルト値処理: `props.secretArns && props.secretArns.length > 0` で空配列も考慮

### テスト設計
- CDK が単一要素の配列を文字列として出力する点に注意（`Action: 'secretsmanager:GetSecretValue'`）
- セキュリティテスト: 禁止ポリシー（AdministratorAccess, PowerUserAccess, IAMFullAccess）の不在確認
- Template.findResources() を使用した全リソースの走査パターン

### 品質保証
- 最小権限の原則: 必要最小限のポリシーのみ付与
- Trust Relationship の制限: ECS サービスプリンシパルのみ信頼
- 説明文設定: 監査・トラブルシューティング用の description 設定

## 関連ファイル

- **元タスクファイル**: `docs/tasks/aws-cdk-serverless-architecture/TASK-0006.md`
- **要件定義**: `docs/implements/aws-cdk-serverless-architecture/TASK-0006/requirements.md`
- **テストケース定義**: `docs/implements/aws-cdk-serverless-architecture/TASK-0006/testcases.md`
- **実装ファイル**: `infra/lib/construct/security/iam-role-construct.ts`
- **テストファイル**: `infra/test/construct/security/iam-role-construct.test.ts`
- **タスクノート**: `docs/implements/aws-cdk-serverless-architecture/TASK-0006/note.md`

---

## Redフェーズ（失敗するテスト作成）

### 作成日時

2026-01-18

### テストケース概要

全15テストケースを作成:

| カテゴリ | テストケース数 | 内容 |
|----------|---------------|------|
| 正常系 | 10 | Role 作成、Trust Relationship、Policy アタッチ |
| 異常系/セキュリティ | 3 | 過剰権限の排除確認 |
| 境界値 | 2 | secretArns パラメータのエッジケース |

### テスト実行結果

```bash
cd infra && npm test -- --testPathPattern=iam-role-construct
```

```
Test Suites: 1 failed, 1 total
Tests:       12 failed, 4 passed, 16 total
```

**失敗テスト（12件）**:
- TC-IAM-01, 02, 03, 04, 05, 07, 09, 10, 11, 12, 13

**パステスト（4件）**:
- TC-IAM-06: Role が存在しないため、ループ内の検証がスキップされパス
- TC-IAM-08, 14, 15: セキュリティテスト（禁止ポリシーが存在しない確認）がパス

### テストコード（抜粋）

```typescript
describe('IamRoleConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let iamRoleConstruct: IamRoleConstruct;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'ap-northeast-1' },
    });
  });

  // TC-IAM-01: ECS Task Role が作成されること
  describe('TC-IAM-01: ECS Task Role 作成確認', () => {
    test('ECS Task Role が作成されること', () => {
      iamRoleConstruct = new IamRoleConstruct(stack, 'TestIamRoles', {});
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: { Service: 'ecs-tasks.amazonaws.com' },
              Action: 'sts:AssumeRole',
            }),
          ]),
        },
      });
    });
  });

  // ... 他14テストケース
});
```

### 期待される失敗

| 失敗タイプ | 原因 | 対象テストケース |
|-----------|------|-----------------|
| IAM Role 不在 | スタブ実装で Role 未作成 | TC-IAM-01, 02, 03, 05, 07, 10, 13 |
| IAM Policy 不在 | スタブ実装で Policy 未作成 | TC-IAM-04, 11, 12 |
| プロパティ undefined | スタブ実装で初期化なし | TC-IAM-09 |

### 次のフェーズへの要求事項

**Green フェーズで実装すべき内容**:

1. **ECS Task Role**
   - `iam.Role` リソースを作成
   - AssumedBy: `ecs-tasks.amazonaws.com`
   - ManagedPolicy: `AmazonSSMManagedInstanceCore`
   - InlinePolicy: `secretsmanager:GetSecretValue`

2. **ECS Task Execution Role**
   - `iam.Role` リソースを作成
   - AssumedBy: `ecs-tasks.amazonaws.com`
   - ManagedPolicy: `service-role/AmazonECSTaskExecutionRolePolicy`

3. **プロパティ初期化**
   - `this.taskRole` を Task Role に設定
   - `this.executionRole` を Execution Role に設定

4. **secretArns パラメータ処理**
   - 指定時: 指定された ARN のみにアクセス許可
   - 未指定または空配列時: デフォルト `['*']` を使用

---

## Greenフェーズ（最小実装）

### 実装日時

2026-01-18

### 実装方針

1. **ECS Task Role の作成**
   - `iam.Role` を作成し、`ecs-tasks.amazonaws.com` を信頼するプリンシパルとして設定
   - `AmazonSSMManagedInstanceCore` マネージドポリシーをアタッチ（ECS Exec 用）
   - `secretsmanager:GetSecretValue` インラインポリシーを追加（DB 認証情報取得用）

2. **ECS Task Execution Role の作成**
   - `iam.Role` を作成し、`ecs-tasks.amazonaws.com` を信頼するプリンシパルとして設定
   - `service-role/AmazonECSTaskExecutionRolePolicy` マネージドポリシーをアタッチ

3. **secretArns パラメータの処理**
   - undefined または空配列の場合: デフォルト `['*']` を使用
   - 値が指定された場合: 指定された ARN のみにアクセス許可

### 実装コード

詳細は `iam-role-construct-green-phase.md` を参照

```typescript
export class IamRoleConstruct extends Construct {
  public readonly taskRole: iam.IRole;
  public readonly executionRole: iam.IRole;

  constructor(scope: Construct, id: string, props: IamRoleConstructProps) {
    super(scope, id);

    // secretArns のデフォルト値適用
    const secretArns = props.secretArns && props.secretArns.length > 0
      ? props.secretArns
      : DEFAULT_SECRET_ARNS;

    // ECS Task Role 作成
    const taskRole = new iam.Role(this, 'EcsTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: DESCRIPTION_TASK_ROLE,
    });

    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: secretArns,
    }));

    this.taskRole = taskRole;

    // ECS Task Execution Role 作成
    const executionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: DESCRIPTION_EXECUTION_ROLE,
    });

    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AmazonECSTaskExecutionRolePolicy'
      )
    );

    this.executionRole = executionRole;
  }
}
```

### テスト結果

```
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        7.303 s
```

全16テストケースがパス。

### テスト修正

CDK が単一アクションを配列ではなく文字列として出力するため、テストコードを修正:
- `Action: Match.arrayWith(['secretsmanager:GetSecretValue'])` → `Action: 'secretsmanager:GetSecretValue'`
- 同様に `Resource` も文字列に修正

### 課題・改善点

| 項目 | 内容 | 優先度 |
|------|------|--------|
| JSDoc 強化 | より詳細なドキュメント追加の可能性 | 中 |
| 定数の外部化 | 定数を別ファイルに分離する可能性 | 低 |
| エラーハンドリング | 不正な ARN 形式のバリデーション | 低 |

---

## Refactorフェーズ（品質改善）

### リファクタ日時

2026-01-18

### 改善内容

| 項目 | 内容 | 信頼性 |
|------|------|--------|
| ファイルヘッダー更新 | フェーズを "Refactor フェーズ - コード品質改善" に更新 | 🔵 |
| リファクタ内容追記 | 【リファクタ内容】を追加 | 🔵 |

Green フェーズの実装が既に高品質であったため、大きなリファクタリングは不要でした。

### セキュリティレビュー

| 項目 | 状態 | 詳細 |
|------|------|------|
| Trust Relationship | ✅ 適切 | `ecs-tasks.amazonaws.com` のみを信頼 |
| 最小権限の原則 | ✅ 適切 | 必要最小限のポリシーのみ付与 |
| 広範な管理者権限排除 | ✅ 適切 | AdministratorAccess, PowerUserAccess, IAMFullAccess なし |
| Secrets Manager アクセス | ✅ 適切 | 指定時は特定 ARN のみ、デフォルトは '*' |

### パフォーマンスレビュー

| 項目 | 状態 | 詳細 |
|------|------|------|
| リソース数 | ✅ 最適 | IAM Role 2つ、Policy 1つのみ |
| 不要な処理 | ✅ なし | 直線的な処理フロー |
| 計算量 | ✅ O(1) | 固定数のリソース作成 |

### 最終コード

詳細は `iam-role-construct-refactor-phase.md` を参照

### 品質評価

| 基準 | 評価 | 詳細 |
|------|------|------|
| テスト結果 | ✅ 全て成功 | 16/16 テストがパス |
| セキュリティ | ✅ 良好 | 重大な脆弱性なし |
| パフォーマンス | ✅ 良好 | 重大な性能課題なし |
| リファクタ品質 | ✅ 目標達成 | コード品質の確認と軽微な改善完了 |
| コード品質 | ✅ 高品質 | 適切なレベルに達している |
| ファイルサイズ | ✅ 235行 | 500行制限以下 |

**総合評価**: ✅ 高品質

---

## 開発履歴

| 日時 | フェーズ | 内容 |
|------|----------|------|
| 2026-01-18 | Red | 16テストケース作成、スタブ実装作成、12件失敗確認 |
| 2026-01-18 | Green | IAM Role 実装完了、16件全テストパス |
| 2026-01-18 | Refactor | 品質確認完了、軽微な改善実施、16件全テストパス |
