# Task Definition Construct Red Phase 記録

**タスクID**: TASK-0014
**機能名**: Task Definition Construct
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: TDD Red Phase - 失敗するテストケースの作成
**作成日**: 2026-01-27

---

## 1. 作成したテストケース一覧

| テストID | テスト概要 | 信頼性 | 状態 |
|----------|-----------|--------|------|
| TC-TASKDEF-01 | Task Definition リソース作成確認 | 🔵 | 失敗 |
| TC-TASKDEF-02 | CPU 設定確認（デフォルト値 512） | 🔵 | 失敗 |
| TC-TASKDEF-03 | Memory 設定確認（デフォルト値 1024） | 🔵 | 失敗 |
| TC-TASKDEF-04 | Network Mode 確認（awsvpc） | 🔵 | 失敗 |
| TC-TASKDEF-05 | App Container 作成確認 | 🔵 | 失敗 |
| TC-TASKDEF-06 | Sidecar Container 作成確認 | 🔵 | 失敗 |
| TC-TASKDEF-07 | App Container Essential フラグ確認（true） | 🔵 | 失敗 |
| TC-TASKDEF-08 | Sidecar Container Essential フラグ確認（false） | 🔵 | 失敗 |
| TC-TASKDEF-09 | App Container ポートマッピング確認 | 🔵 | 失敗 |
| TC-TASKDEF-10 | Logging 設定確認（awslogs ドライバー） | 🔵 | 失敗 |
| TC-TASKDEF-11 | Task Role 参照確認 | 🔵 | 失敗 |
| TC-TASKDEF-12 | Execution Role 参照確認 | 🔵 | 失敗 |
| TC-TASKDEF-13 | Sidecar TARGET_HOST 環境変数確認 | 🔵 | 失敗 |
| TC-TASKDEF-14 | Sidecar TARGET_PORT 環境変数確認 | 🔵 | 失敗 |
| TC-TASKDEF-15 | Sidecar MODE 環境変数確認 | 🔵 | 失敗 |
| TC-TASKDEF-16 | 公開プロパティ taskDefinition 確認 | 🔵 | 失敗 |
| TC-TASKDEF-17 | 公開プロパティ appContainer 確認 | 🔵 | 失敗 |
| TC-TASKDEF-18 | 公開プロパティ sidecarContainer 確認 | 🔵 | 失敗 |
| TC-TASKDEF-19 | カスタム CPU 設定確認 | 🟡 | 失敗 |
| TC-TASKDEF-20 | カスタム Memory 設定確認 | 🟡 | 失敗 |
| TC-TASKDEF-21 | カスタムポート設定確認 | 🟡 | 失敗 |
| TC-TASKDEF-22 | sidecarMode sleep 設定確認 | 🟡 | 失敗 |
| TC-TASKDEF-23 | App Container 環境変数設定確認 | 🟡 | 失敗 |
| TC-TASKDEF-24 | 既存 Task Role 使用確認 | 🟡 | 失敗 |
| TC-TASKDEF-25 | CPU 最小値確認（256） | 🟡 | 失敗 |
| TC-TASKDEF-26 | CPU 最大値確認（4096） | 🟡 | 失敗 |
| TC-TASKDEF-27 | auroraPort カスタム値確認 | 🟡 | 失敗 |
| TC-TASKDEF-28 | CloudFormation テンプレートスナップショット確認 | 🔵 | 失敗 |

**合計**: 28 テストケース

---

## 2. テストファイル

**ファイルパス**: `infra/test/construct/ecs/task-definition-construct.test.ts`

---

## 3. 期待される失敗内容

### 3.1 現在の失敗メッセージ

```
FAIL test/construct/ecs/task-definition-construct.test.ts
  ● Test suite failed to run

    test/construct/ecs/task-definition-construct.test.ts:37:41 - error TS2307:
    Cannot find module '../../../lib/construct/ecs/task-definition-construct'
    or its corresponding type declarations.

    37 import { TaskDefinitionConstruct } from '../../../lib/construct/ecs/task-definition-construct';
                                               ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Test Suites: 1 failed, 1 total
Tests:       0 total
```

### 3.2 失敗の原因

`TaskDefinitionConstruct` が `infra/lib/construct/ecs/task-definition-construct.ts` に存在しないため、TypeScript コンパイルエラーが発生しています。

これは **TDD Red Phase の正常な状態** です。実装がまだ存在しないため、テストが失敗することが期待されます。

---

## 4. Green フェーズで実装すべき内容

### 4.1 実装ファイル

**ファイルパス**: `infra/lib/construct/ecs/task-definition-construct.ts`

### 4.2 実装すべき Props インターフェース

```typescript
export interface TaskDefinitionConstructProps {
  readonly appRepository: ecr.IRepository;
  readonly sidecarRepository: ecr.IRepository;
  readonly logGroup: logs.ILogGroup;
  readonly auroraEndpoint: string;
  readonly auroraPort?: number;           // default: 3306
  readonly taskRole?: iam.IRole;          // default: 自動作成
  readonly executionRole?: iam.IRole;     // default: 自動作成
  readonly cpu?: 256 | 512 | 1024 | 2048 | 4096;  // default: 512
  readonly memoryMiB?: number;            // default: 1024
  readonly appContainerPort?: number;     // default: 3000
  readonly appEnvironment?: Record<string, string>;
  readonly sidecarMode?: 'proxy' | 'sleep';  // default: 'proxy'
}
```

### 4.3 実装すべき公開プロパティ

```typescript
export class TaskDefinitionConstruct extends Construct {
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly appContainer: ecs.ContainerDefinition;
  public readonly sidecarContainer: ecs.ContainerDefinition;
}
```

### 4.4 実装すべき主要機能

1. **FargateTaskDefinition 作成**
   - CPU/Memory 設定（デフォルト: 512/1024）
   - NetworkMode: awsvpc（Fargate 必須）
   - Task Role / Execution Role 設定

2. **App Container 定義**
   - Name: 'app'
   - Essential: true
   - Image: appRepository から取得
   - PortMappings: appContainerPort (default: 3000)
   - LogConfiguration: awslogs ドライバー
   - Environment: appEnvironment から取得

3. **Sidecar Container 定義**
   - Name: 'sidecar'
   - Essential: false
   - Image: sidecarRepository から取得
   - LogConfiguration: awslogs ドライバー
   - Environment:
     - TARGET_HOST: auroraEndpoint
     - TARGET_PORT: auroraPort (default: 3306)
     - MODE: sidecarMode (default: 'proxy')

### 4.5 テスト実行コマンド

```bash
cd infra
npm test -- --testPathPattern="task-definition-construct"
```

---

## 5. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 20 | 71% |
| 🟡 黄信号 | 8 | 29% |
| 🔴 赤信号 | 0 | 0% |

---

## 6. 品質判定結果

### 6.1 テスト実行

- ✅ 実行可能
- ✅ 期待通り失敗（モジュール未存在のため）

### 6.2 期待値

- ✅ 明確で具体的
- ✅ 要件定義書・設計文書に基づく

### 6.3 アサーション

- ✅ 適切な CDK assertions ライブラリを使用
- ✅ `hasResourceProperties()`, `Match.arrayWith()`, `Match.objectLike()` を活用

### 6.4 実装方針

- ✅ 明確（Props インターフェース、公開プロパティ、主要機能が定義済み）

### 6.5 総合評価

**✅ 高品質** - 要件定義書・設計文書に基づく明確なテストケース

---

## 7. 次のステップ

```
/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0014
```

Green フェーズで `TaskDefinitionConstruct` を実装し、すべてのテストが通るようにします。
