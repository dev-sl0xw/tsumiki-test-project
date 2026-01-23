# TASK-0012: ECS Cluster Construct 実装 - テストケース定義書

**タスクID**: TASK-0012
**機能名**: ECS Cluster Construct 実装
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-23
**フェーズ**: Phase 3 - アプリケーション

---

## 1. テストケース概要

### 1.1 テスト対象

| 項目 | 内容 |
|------|------|
| テスト対象 | `EcsClusterConstruct` |
| 実装ファイル | `infra/lib/construct/ecs/ecs-cluster-construct.ts` |
| テストファイル | `infra/test/construct/ecs/ecs-cluster-construct.test.ts` |
| テストフレームワーク | Jest + AWS CDK Assertions |

### 1.2 参照要件

| 要件ID | 要件内容 | 信頼性 |
|--------|----------|--------|
| REQ-012 | システムは Fargate 専用の ECS クラスターを作成しなければならない | 🔵 |
| REQ-013 | システムは Container Insights を有効化しなければならない | 🔵 |
| NFR-301 | システムは Container Insights を有効化してモニタリング可能にしなければならない | 🔵 |

### 1.3 テストケース一覧サマリー

| カテゴリ | テストケース数 | テストID範囲 |
|----------|----------------|--------------|
| 正常系テストケース | 7 | TC-ECS-CLUSTER-01 〜 07 |
| デフォルト値テストケース | 2 | TC-ECS-CLUSTER-08 〜 09 |
| 境界値テストケース | 2 | TC-ECS-CLUSTER-10 〜 11 |
| エッジケース | 3 | TC-ECS-CLUSTER-12 〜 14 |
| スナップショットテスト | 1 | TC-ECS-CLUSTER-15 |
| **合計** | **15** | - |

---

## 2. 正常系テストケース

### TC-ECS-CLUSTER-01: ECS Cluster リソース作成確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-01 |
| テスト概要 | ECS Cluster リソースが正しく作成されることを確認 |
| テスト目的 | `AWS::ECS::Cluster` リソースが 1 つ作成されることを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc }` |
| 期待される動作 | `AWS::ECS::Cluster` リソースが 1 つ CloudFormation テンプレートに含まれる |
| 検証方法 | `template.resourceCountIs('AWS::ECS::Cluster', 1)` |
| 信頼性 | 🔵 REQ-012 より |

**テストコード概要**:
```typescript
test('ECS Cluster が作成されること', () => {
  template.resourceCountIs('AWS::ECS::Cluster', 1);
});
```

---

### TC-ECS-CLUSTER-02: Cluster 名指定時の確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-02 |
| テスト概要 | クラスター名を指定した場合、その名前が正しく設定されることを確認 |
| テスト目的 | Props で `clusterName` を指定した場合の動作を検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc, clusterName: 'my-test-cluster' }` |
| 期待される動作 | `ClusterName` プロパティに `'my-test-cluster'` が設定される |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Cluster', { ClusterName: 'my-test-cluster' })` |
| 信頼性 | 🔵 設計文書より |

**テストコード概要**:
```typescript
test('指定したクラスター名が設定されること', () => {
  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterName: 'my-test-cluster',
  });
});
```

---

### TC-ECS-CLUSTER-03: Container Insights 有効化確認（明示的指定）

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-03 |
| テスト概要 | `containerInsights: true` を明示的に指定した場合の動作確認 |
| テスト目的 | Container Insights が明示的に有効化されることを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc, containerInsights: true }` |
| 期待される動作 | `ClusterSettings` に `{ Name: 'containerInsights', Value: 'enabled' }` が含まれる |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Cluster', { ClusterSettings: Match.arrayWith([...]) })` |
| 信頼性 | 🔵 REQ-013, NFR-301 より |

**テストコード概要**:
```typescript
test('Container Insights が有効化されること (明示的指定)', () => {
  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterSettings: Match.arrayWith([
      Match.objectLike({
        Name: 'containerInsights',
        Value: 'enabled',
      }),
    ]),
  });
});
```

---

### TC-ECS-CLUSTER-04: 公開プロパティ cluster 確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-04 |
| テスト概要 | 公開プロパティ `cluster` が正しく定義されていることを確認 |
| テスト目的 | `cluster` プロパティが `ecs.ICluster` 型で取得できることを検証 |
| 前提条件 | EcsClusterConstruct がインスタンス化されていること |
| 入力データ | `{ vpc: vpc }` |
| 期待される動作 | `ecsClusterConstruct.cluster` が undefined ではないこと |
| 検証方法 | `expect(ecsClusterConstruct.cluster).toBeDefined()` |
| 信頼性 | 🔵 設計文書 note.md より |

**テストコード概要**:
```typescript
test('cluster プロパティが定義されていること', () => {
  expect(ecsClusterConstruct.cluster).toBeDefined();
});
```

---

### TC-ECS-CLUSTER-05: VPC 関連付け確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-05 |
| テスト概要 | ECS Cluster が指定された VPC に関連付けられることを確認 |
| テスト目的 | Cluster が正しい VPC 内に作成されることを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc }` |
| 期待される動作 | `ecsClusterConstruct.cluster.vpc` が指定した VPC と一致すること |
| 検証方法 | `expect(ecsClusterConstruct.cluster.vpc).toBe(vpc)` |
| 信頼性 | 🔵 REQ-012 より |

**テストコード概要**:
```typescript
test('cluster が指定した VPC に関連付けられていること', () => {
  expect(ecsClusterConstruct.cluster.vpc).toBe(vpc);
});
```

---

### TC-ECS-CLUSTER-06: Fargate 専用クラスター確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-06 |
| テスト概要 | ECS Cluster が Fargate 専用であることを確認 |
| テスト目的 | EC2 Capacity Provider が設定されていないことを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc }` |
| 期待される動作 | `AWS::ECS::CapacityProvider` リソースが作成されないこと |
| 検証方法 | `template.resourceCountIs('AWS::ECS::CapacityProvider', 0)` |
| 信頼性 | 🔵 REQ-012 より (Fargate 専用) |

**テストコード概要**:
```typescript
test('EC2 Capacity Provider が作成されないこと (Fargate 専用)', () => {
  template.resourceCountIs('AWS::ECS::CapacityProvider', 0);
});
```

---

### TC-ECS-CLUSTER-07: cluster.clusterName プロパティ確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-07 |
| テスト概要 | 公開プロパティからクラスター名が取得できることを確認 |
| テスト目的 | `cluster.clusterName` プロパティが正しく設定されていることを検証 |
| 前提条件 | EcsClusterConstruct がインスタンス化されていること |
| 入力データ | `{ vpc: vpc, clusterName: 'test-cluster-name' }` |
| 期待される動作 | `ecsClusterConstruct.cluster.clusterName` が指定した名前を返すこと |
| 検証方法 | `expect(ecsClusterConstruct.cluster.clusterName).toContain('test-cluster-name')` |
| 信頼性 | 🔵 設計文書より |

**テストコード概要**:
```typescript
test('cluster.clusterName プロパティが正しく取得できること', () => {
  expect(ecsClusterConstruct.cluster.clusterName).toContain('test-cluster-name');
});
```

---

## 3. デフォルト値テストケース

### TC-ECS-CLUSTER-08: Container Insights デフォルト値確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-08 |
| テスト概要 | `containerInsights` 未指定時にデフォルトで有効化されることを確認 |
| テスト目的 | デフォルト動作で Container Insights が `enabled` になることを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc }` (containerInsights 省略) |
| 期待される動作 | `ClusterSettings` に `{ Name: 'containerInsights', Value: 'enabled' }` が含まれる |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Cluster', { ClusterSettings: Match.arrayWith([...]) })` |
| 信頼性 | 🔵 REQ-013, NFR-301 より |

**テストコード概要**:
```typescript
test('containerInsights 未指定時にデフォルトで enabled になること', () => {
  // containerInsights を指定しない
  const ecsCluster = new EcsClusterConstruct(stack, 'TestCluster', { vpc });
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterSettings: Match.arrayWith([
      Match.objectLike({
        Name: 'containerInsights',
        Value: 'enabled',
      }),
    ]),
  });
});
```

---

### TC-ECS-CLUSTER-09: Cluster 名デフォルト値確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-09 |
| テスト概要 | `clusterName` 未指定時に CDK が自動生成することを確認 |
| テスト目的 | クラスター名を指定しない場合の動作を検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc }` (clusterName 省略) |
| 期待される動作 | `ClusterName` プロパティが設定されない（CDK が自動生成する） |
| 検証方法 | `ClusterName` プロパティが undefined であることを確認 |
| 信頼性 | 🟡 CDK の動作仕様より |

**テストコード概要**:
```typescript
test('clusterName 未指定時に ClusterName プロパティが設定されないこと', () => {
  // clusterName を指定しない
  const ecsCluster = new EcsClusterConstruct(stack, 'TestCluster', { vpc });
  const template = Template.fromStack(stack);

  // ClusterName が明示的に設定されていないことを確認
  // CDK は clusterName を指定しない場合、CloudFormation 論理ID から自動生成
  const clusters = template.findResources('AWS::ECS::Cluster');
  const clusterProps = Object.values(clusters)[0].Properties;

  // clusterName を指定しない場合、ClusterName プロパティは設定されない
  // (CDK が論理IDから自動生成)
  expect(clusterProps.ClusterName).toBeUndefined();
});
```

---

## 4. 境界値テストケース

### TC-ECS-CLUSTER-10: Cluster 名最大長確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-10 |
| テスト概要 | クラスター名の最大長（255文字）を使用した場合の動作確認 |
| テスト目的 | ECS クラスター名の上限に近い名前でも正常に動作することを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc, clusterName: 'a'.repeat(255) }` |
| 期待される動作 | 255文字のクラスター名が正しく設定されること |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Cluster', { ClusterName: 'a'.repeat(255) })` |
| 信頼性 | 🟡 AWS ECS の制限より |

**テストコード概要**:
```typescript
test('クラスター名が 255 文字でも正常に作成されること', () => {
  const longClusterName = 'a'.repeat(255);
  const ecsCluster = new EcsClusterConstruct(stack, 'TestCluster', {
    vpc,
    clusterName: longClusterName,
  });
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterName: longClusterName,
  });
});
```

---

### TC-ECS-CLUSTER-11: Cluster 名最小長確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-11 |
| テスト概要 | クラスター名の最小長（1文字）を使用した場合の動作確認 |
| テスト目的 | 1文字のクラスター名でも正常に動作することを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc, clusterName: 'a' }` |
| 期待される動作 | 1文字のクラスター名が正しく設定されること |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Cluster', { ClusterName: 'a' })` |
| 信頼性 | 🟡 AWS ECS の制限より |

**テストコード概要**:
```typescript
test('クラスター名が 1 文字でも正常に作成されること', () => {
  const ecsCluster = new EcsClusterConstruct(stack, 'TestCluster', {
    vpc,
    clusterName: 'a',
  });
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterName: 'a',
  });
});
```

---

## 5. エッジケース

### TC-ECS-CLUSTER-12: Container Insights 無効化確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-12 |
| テスト概要 | `containerInsights: false` を明示的に指定した場合の動作確認 |
| テスト目的 | Container Insights を無効化できることを検証（非推奨だが可能） |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc, containerInsights: false }` |
| 期待される動作 | `ClusterSettings` に `{ Name: 'containerInsights', Value: 'disabled' }` が含まれる |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Cluster', { ClusterSettings: Match.arrayWith([...]) })` |
| 信頼性 | 🟡 機能テスト（ただし REQ-013 に反するため非推奨） |

**テストコード概要**:
```typescript
test('Container Insights を無効化できること (非推奨)', () => {
  const ecsCluster = new EcsClusterConstruct(stack, 'TestCluster', {
    vpc,
    containerInsights: false,
  });
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterSettings: Match.arrayWith([
      Match.objectLike({
        Name: 'containerInsights',
        Value: 'disabled',
      }),
    ]),
  });
});
```

---

### TC-ECS-CLUSTER-13: 特殊文字を含むクラスター名確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-13 |
| テスト概要 | クラスター名に許可された特殊文字（ハイフン、アンダースコア）を含む場合の動作確認 |
| テスト目的 | ECS クラスター名として有効な特殊文字が使用できることを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc, clusterName: 'my-test_cluster-01' }` |
| 期待される動作 | 特殊文字を含むクラスター名が正しく設定されること |
| 検証方法 | `template.hasResourceProperties('AWS::ECS::Cluster', { ClusterName: 'my-test_cluster-01' })` |
| 信頼性 | 🟡 AWS ECS の命名規則より |

**テストコード概要**:
```typescript
test('特殊文字 (ハイフン、アンダースコア) を含むクラスター名が使用できること', () => {
  const clusterName = 'my-test_cluster-01';
  const ecsCluster = new EcsClusterConstruct(stack, 'TestCluster', {
    vpc,
    clusterName,
  });
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterName: clusterName,
  });
});
```

---

### TC-ECS-CLUSTER-14: 複数インスタンス作成確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-14 |
| テスト概要 | 同一 Stack 内で複数の EcsClusterConstruct インスタンスを作成できることを確認 |
| テスト目的 | 複数クラスターを同時に作成できることを検証 |
| 前提条件 | VPC が存在すること |
| 入力データ | 2 つの EcsClusterConstruct インスタンス（異なる ID） |
| 期待される動作 | 2 つの `AWS::ECS::Cluster` リソースが作成されること |
| 検証方法 | `template.resourceCountIs('AWS::ECS::Cluster', 2)` |
| 信頼性 | 🟡 CDK の動作仕様より |

**テストコード概要**:
```typescript
test('複数の ECS Cluster を同時に作成できること', () => {
  new EcsClusterConstruct(stack, 'TestCluster1', {
    vpc,
    clusterName: 'cluster-1',
  });
  new EcsClusterConstruct(stack, 'TestCluster2', {
    vpc,
    clusterName: 'cluster-2',
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::ECS::Cluster', 2);
});
```

---

## 6. スナップショットテスト

### TC-ECS-CLUSTER-15: CloudFormation テンプレートスナップショット確認

| 項目 | 内容 |
|------|------|
| テストID | TC-ECS-CLUSTER-15 |
| テスト概要 | 生成される CloudFormation テンプレートが期待通りであることを確認 |
| テスト目的 | テンプレートの意図しない変更を検出 |
| 前提条件 | VPC が存在すること |
| 入力データ | `{ vpc: vpc, clusterName: 'snapshot-test-cluster', containerInsights: true }` |
| 期待される動作 | スナップショットと一致すること |
| 検証方法 | `expect(template.toJSON()).toMatchSnapshot()` |
| 信頼性 | 🔵 品質保証のため |

**テストコード概要**:
```typescript
test('CloudFormation テンプレートがスナップショットと一致すること', () => {
  const ecsCluster = new EcsClusterConstruct(stack, 'TestCluster', {
    vpc,
    clusterName: 'snapshot-test-cluster',
    containerInsights: true,
  });
  const template = Template.fromStack(stack);

  expect(template.toJSON()).toMatchSnapshot();
});
```

---

## 7. テストケースと要件の対応表

| テストID | REQ-012 | REQ-013 | NFR-301 | 備考 |
|----------|:-------:|:-------:|:-------:|------|
| TC-ECS-CLUSTER-01 | ✅ | - | - | Cluster 作成 |
| TC-ECS-CLUSTER-02 | ✅ | - | - | Cluster 名設定 |
| TC-ECS-CLUSTER-03 | - | ✅ | ✅ | Container Insights 有効化 |
| TC-ECS-CLUSTER-04 | ✅ | - | - | 公開プロパティ |
| TC-ECS-CLUSTER-05 | ✅ | - | - | VPC 関連付け |
| TC-ECS-CLUSTER-06 | ✅ | - | - | Fargate 専用 |
| TC-ECS-CLUSTER-07 | ✅ | - | - | clusterName 取得 |
| TC-ECS-CLUSTER-08 | - | ✅ | ✅ | Container Insights デフォルト |
| TC-ECS-CLUSTER-09 | ✅ | - | - | clusterName デフォルト |
| TC-ECS-CLUSTER-10 | ✅ | - | - | 名前最大長 |
| TC-ECS-CLUSTER-11 | ✅ | - | - | 名前最小長 |
| TC-ECS-CLUSTER-12 | - | ⚠️ | ⚠️ | Container Insights 無効化（非推奨）|
| TC-ECS-CLUSTER-13 | ✅ | - | - | 特殊文字名 |
| TC-ECS-CLUSTER-14 | ✅ | - | - | 複数インスタンス |
| TC-ECS-CLUSTER-15 | ✅ | ✅ | ✅ | スナップショット |

**凡例**:
- ✅: 要件を検証
- ⚠️: 要件に関連するが、非推奨機能のテスト
- -: 関連なし

---

## 8. テスト実行コマンド

```bash
# 全テスト実行
cd infra
npm test

# ECS Cluster Construct テストのみ実行
npm test -- ecs-cluster-construct.test.ts

# 特定テストケースのみ実行
npm test -- ecs-cluster-construct.test.ts -t "TC-ECS-CLUSTER-01"

# スナップショット更新
npm test -- -u

# カバレッジ付きテスト実行
npm test -- --coverage
```

---

## 9. テスト実装のテンプレート

```typescript
/**
 * ECS Cluster Construct テスト
 *
 * TASK-0012: ECS Cluster Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-ECS-CLUSTER-01: ECS Cluster リソース作成確認
 * - TC-ECS-CLUSTER-02: Cluster 名指定時の確認
 * - TC-ECS-CLUSTER-03: Container Insights 有効化確認（明示的指定）
 * - TC-ECS-CLUSTER-04: 公開プロパティ cluster 確認
 * - TC-ECS-CLUSTER-05: VPC 関連付け確認
 * - TC-ECS-CLUSTER-06: Fargate 専用クラスター確認
 * - TC-ECS-CLUSTER-07: cluster.clusterName プロパティ確認
 * - TC-ECS-CLUSTER-08: Container Insights デフォルト値確認
 * - TC-ECS-CLUSTER-09: Cluster 名デフォルト値確認
 * - TC-ECS-CLUSTER-10: Cluster 名最大長確認
 * - TC-ECS-CLUSTER-11: Cluster 名最小長確認
 * - TC-ECS-CLUSTER-12: Container Insights 無効化確認
 * - TC-ECS-CLUSTER-13: 特殊文字を含むクラスター名確認
 * - TC-ECS-CLUSTER-14: 複数インスタンス作成確認
 * - TC-ECS-CLUSTER-15: CloudFormation テンプレートスナップショット確認
 *
 * 🔵 信頼性: 要件定義書 REQ-012, REQ-013, NFR-301 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { EcsClusterConstruct } from '../../../lib/construct/ecs/ecs-cluster-construct';

describe('EcsClusterConstruct', () => {
  // 【テスト前準備】: 各テストで独立した CDK App と Stack を作成
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.IVpc;
  let ecsClusterConstruct: EcsClusterConstruct;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    vpc = new ec2.Vpc(stack, 'TestVpc');
  });

  // ============================================================================
  // 正常系テストケース
  // ============================================================================

  describe('TC-ECS-CLUSTER-01: ECS Cluster リソース作成確認', () => {
    // 【テスト目的】: ECS Cluster が正しく作成されることを確認
    // 🔵 信頼性: REQ-012 より

    beforeEach(() => {
      ecsClusterConstruct = new EcsClusterConstruct(stack, 'TestCluster', { vpc });
      template = Template.fromStack(stack);
    });

    test('ECS Cluster が作成されること', () => {
      template.resourceCountIs('AWS::ECS::Cluster', 1);
    });
  });

  // ... (以下、各テストケースを実装)
});
```

---

## 10. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 10 | 67% | EARS要件定義書・設計文書に基づく確実なテスト |
| 🟡 黄信号 | 5 | 33% | CDK/AWS 仕様から妥当な推測によるテスト |
| 🔴 赤信号 | 0 | 0% | 推測によるテスト |

---

## 11. 参考リソース

### 11.1 プロジェクト内ドキュメント

- `docs/implements/aws-cdk-serverless-architecture/TASK-0012/note.md` - タスクノート
- `docs/implements/aws-cdk-serverless-architecture/TASK-0012/requirements.md` - TDD用要件定義書
- `docs/spec/aws-cdk-serverless-architecture/requirements.md` - 要件定義書
- `docs/design/aws-cdk-serverless-architecture/architecture.md` - アーキテクチャ設計

### 11.2 既存テストパターン参照

- `infra/test/construct/vpc/vpc-construct.test.ts` - VPC Construct テストパターン
- `infra/test/construct/security/security-group-construct.test.ts` - Security Group テストパターン

### 11.3 AWS ドキュメント

- [AWS CDK ECS Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html)
- [Amazon ECS Container Insights](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-container-insights.html)
- [ECS Cluster API Reference](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Cluster.html)

---

**品質評価**: ✅ **高品質** - 要件に基づく網羅的なテストケース定義完了

**次のステップ**: `/tsumiki:tdd-red TASK-0012` - 失敗するテストケースの実装
