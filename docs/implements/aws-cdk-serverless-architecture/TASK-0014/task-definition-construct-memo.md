# TDD開発メモ: Task Definition Construct

## 概要

- 機能名: Task Definition Construct
- タスクID: TASK-0014
- 開発開始: 2026-01-27
- 現在のフェーズ: ✅ 完了（TDD検証完了）

## 関連ファイル

- 元タスクファイル: `docs/tasks/aws-cdk-serverless-architecture/TASK-0014.md`
- 要件定義: `docs/implements/aws-cdk-serverless-architecture/TASK-0014/task-definition-construct-requirements.md`
- テストケース定義: `docs/implements/aws-cdk-serverless-architecture/TASK-0014/task-definition-construct-testcases.md`
- Red フェーズ記録: `docs/implements/aws-cdk-serverless-architecture/TASK-0014/task-definition-construct-red-phase.md`
- 実装ファイル: `infra/lib/construct/ecs/task-definition-construct.ts`
- テストファイル: `infra/test/construct/ecs/task-definition-construct.test.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2026-01-27

### テストケース

合計 28 テストケースを作成:

**正常系（18件）**:
- TC-TASKDEF-01〜18: Task Definition、Container、IAM Role、環境変数、公開プロパティの基本動作確認

**オプションパラメータ（6件）**:
- TC-TASKDEF-19〜24: カスタム CPU/Memory/Port、sidecarMode、appEnvironment、既存 Task Role

**境界値（3件）**:
- TC-TASKDEF-25〜27: CPU 最小値/最大値、カスタム Aurora ポート

**スナップショット（1件）**:
- TC-TASKDEF-28: CloudFormation テンプレートスナップショット

### テストコード

テストコードは `infra/test/construct/ecs/task-definition-construct.test.ts` に保存。

主要なテストパターン:

```typescript
// リソース数の確認
template.resourceCountIs('AWS::ECS::TaskDefinition', 1);

// プロパティの確認
template.hasResourceProperties('AWS::ECS::TaskDefinition', {
  Cpu: '512',
  Memory: '1024',
  NetworkMode: 'awsvpc',
});

// Container 定義の確認
template.hasResourceProperties('AWS::ECS::TaskDefinition', {
  ContainerDefinitions: Match.arrayWith([
    Match.objectLike({
      Name: 'app',
      Essential: true,
    }),
  ]),
});

// 公開プロパティの確認
expect(construct.taskDefinition).toBeDefined();
expect(construct.appContainer).toBeDefined();
expect(construct.sidecarContainer).toBeDefined();
```

### 期待される失敗

```
FAIL test/construct/ecs/task-definition-construct.test.ts
  ● Test suite failed to run

    error TS2307: Cannot find module '../../../lib/construct/ecs/task-definition-construct'
```

**原因**: `TaskDefinitionConstruct` がまだ実装されていないため、モジュールが見つからない。

これは **TDD Red Phase の正常な状態** です。

### 次のフェーズへの要求事項

**Green フェーズで実装すべき内容**:

1. `TaskDefinitionConstructProps` インターフェース
   - 必須パラメータ: `appRepository`, `sidecarRepository`, `logGroup`, `auroraEndpoint`
   - オプションパラメータ: `auroraPort`, `taskRole`, `executionRole`, `cpu`, `memoryMiB`, `appContainerPort`, `appEnvironment`, `sidecarMode`

2. `TaskDefinitionConstruct` クラス
   - `FargateTaskDefinition` 作成
   - `app` Container 定義 (Essential: true)
   - `sidecar` Container 定義 (Essential: false)
   - 公開プロパティ: `taskDefinition`, `appContainer`, `sidecarContainer`

3. 検証すべき主要機能
   - デフォルト CPU: 512
   - デフォルト Memory: 1024
   - NetworkMode: awsvpc
   - App Container ポート: 3000
   - Sidecar 環境変数: TARGET_HOST, TARGET_PORT, MODE

### 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 20 | 71% |
| 🟡 黄信号 | 8 | 29% |
| 🔴 赤信号 | 0 | 0% |

---

## Greenフェーズ（最小実装）

### 実装日時

2026-01-27

### 実装方針

Red フェーズで定義した28個のテストケースを通すための最小実装を行う：

1. **Props インターフェース定義**: 必須/オプションパラメータを定義
2. **FargateTaskDefinition 作成**: CPU/Memory/NetworkMode 設定
3. **App Container 定義**: Essential=true、ポートマッピング、ログ設定
4. **Sidecar Container 定義**: Essential=false、環境変数設定
5. **IAM Role 自動作成**: Task Role（AmazonSSMManagedInstanceCore 付与）

### 実装コード

実装ファイル: `infra/lib/construct/ecs/task-definition-construct.ts`

主要な実装パターン：

```typescript
// Props インターフェース
export interface TaskDefinitionConstructProps {
  readonly appRepository: ecr.IRepository;
  readonly sidecarRepository: ecr.IRepository;
  readonly logGroup: logs.ILogGroup;
  readonly auroraEndpoint: string;
  readonly auroraPort?: number;           // default: 3306
  readonly taskRole?: iam.IRole;
  readonly executionRole?: iam.IRole;
  readonly cpu?: 256 | 512 | 1024 | 2048 | 4096;  // default: 512
  readonly memoryMiB?: number;            // default: 1024
  readonly appContainerPort?: number;     // default: 3000
  readonly appEnvironment?: Record<string, string>;
  readonly sidecarMode?: 'proxy' | 'sleep';  // default: 'proxy'
}

// TaskDefinitionConstruct クラス
export class TaskDefinitionConstruct extends Construct {
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly appContainer: ecs.ContainerDefinition;
  public readonly sidecarContainer: ecs.ContainerDefinition;

  constructor(scope: Construct, id: string, props: TaskDefinitionConstructProps) {
    // FargateTaskDefinition 作成
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: cpu,
      memoryLimitMiB: memoryMiB,
      taskRole: taskRole,
      executionRole: executionRole,
    });

    // App Container 追加
    this.appContainer = this.taskDefinition.addContainer('app', {
      image: ecs.ContainerImage.fromEcrRepository(props.appRepository),
      essential: true,
      portMappings: [{ containerPort: appContainerPort }],
      logging: ecs.LogDrivers.awsLogs({ ... }),
      environment: props.appEnvironment,
    });

    // Sidecar Container 追加
    this.sidecarContainer = this.taskDefinition.addContainer('sidecar', {
      image: ecs.ContainerImage.fromEcrRepository(props.sidecarRepository),
      essential: false,
      logging: ecs.LogDrivers.awsLogs({ ... }),
      environment: {
        TARGET_HOST: props.auroraEndpoint,
        TARGET_PORT: String(auroraPort),
        MODE: sidecarMode,
      },
    });
  }
}
```

### テスト結果

```
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
Snapshots:   1 passed, 1 total
Time:        7.133 s
```

全28テストケースが通過：
- TC-TASKDEF-01〜18: 正常系テスト ✅
- TC-TASKDEF-19〜24: オプションパラメータテスト ✅
- TC-TASKDEF-25〜27: 境界値テスト ✅
- TC-TASKDEF-28: スナップショットテスト ✅

### 課題・改善点

1. **テスト修正**: TC-TASKDEF-24 で CDK 論理 ID のハッシュ接尾辞に対応するため `Match.stringLikeRegexp()` を使用
2. **警告**: `inferenceAccelerators` の非推奨警告あり（CDK v2 の問題、機能には影響なし）
3. **Refactor 検討事項**:
   - コードコメントの整理
   - エラーハンドリングの追加
   - バリデーション強化（CPU/Memory の組み合わせ検証など）

---

## Refactorフェーズ（品質改善）

### リファクタ日時

2026-01-27

### 改善内容

**ファイルサイズ最適化**:
- リファクタ前: 526行
- リファクタ後: 268行 (49%削減)
- 目標: 500行制限 ✅ 達成

**主な改善**:
1. 冗長なJSDocコメントを簡潔化
2. 重複する説明ブロックを削除
3. 定数定義のコメントを1行化
4. 不要な空行を削除

### セキュリティレビュー

**IAM Task Role (🔵 適切)**:
- AmazonSSMManagedInstanceCore のみ付与（最小権限）
- 追加権限は props.taskRole で外部注入可能

**コンテナイメージ (🔵 適切)**:
- ECRリポジトリからのみ取得
- 外部レジストリ使用なし

**環境変数 (🔵 適切)**:
- 機密情報のハードコードなし
- 実行時に安全に注入

### パフォーマンスレビュー

**リソース設定 (🔵 適切)**:
- CPU: 512 (0.5 vCPU) - 開発環境に適切
- Memory: 1024 MiB (1 GB) - 開発環境に適切
- NetworkMode: awsvpc (Fargate必須)

**ロギング (🔵 適切)**:
- CloudWatch Logs への効率的転送
- ストリームプレフィックスで識別可能

### 最終コード

`infra/lib/construct/ecs/task-definition-construct.ts` (268行)

構成:
- 定数定義 (7個)
- TaskDefinitionConstructProps インターフェース (13プロパティ)
- TaskDefinitionConstruct クラス
  - 3 public properties
  - constructor
  - createTaskRole() private method

### 品質評価

| 基準 | 結果 |
|------|------|
| テスト結果 | ✅ 全28テスト成功 |
| セキュリティ | ✅ 重大な脆弱性なし |
| パフォーマンス | ✅ 重大な性能課題なし |
| リファクタ品質 | ✅ 500行制限達成 |
| コード品質 | ✅ 可読性維持 |

**総合評価**: ✅ 高品質

---

## TDD検証完了（Verify Complete）

### 検証日時

2026-01-27

### 検証結果

| 項目 | 結果 | 詳細 |
|------|------|------|
| テスト実行 | ✅ 成功 | 28/28 テスト通過 |
| スナップショット | ✅ 成功 | 1/1 通過 |
| 要件網羅率 | ✅ 100% | REQ-014〜018, REQ-035 全て実装 |
| コード品質 | ✅ 高品質 | 268行（500行制限達成） |

### 要件トレーサビリティ

| 要件ID | 内容 | 対応テスト | 状態 |
|--------|------|-----------|------|
| REQ-014 | Task Definition (0.5vCPU/1GB) | TC-01,02,03,04 | ✅ |
| REQ-015 | Sidecar パターン実装 | TC-05,06,07,08,09 | ✅ |
| REQ-016 | Sidecar 軽量イメージ/待機 | TC-08,15,22 | ✅ |
| REQ-017 | Sidecar ポートフォワーディング | TC-13,14,15,27 | ✅ |
| REQ-018 | Task Role (SSM権限) | TC-11 | ✅ |
| REQ-035 | CloudWatch Logs | TC-10 | ✅ |

### TDDサイクル完了

| フェーズ | 完了日 | 状態 |
|----------|--------|------|
| Requirements | 2026-01-27 | ✅ |
| Test Cases | 2026-01-27 | ✅ |
| Red Phase | 2026-01-27 | ✅ |
| Green Phase | 2026-01-27 | ✅ |
| Refactor Phase | 2026-01-27 | ✅ |
| Verify Complete | 2026-01-27 | ✅ |

### 最終判定

**✅ TDDサイクル完了 - 本番導入可能**
