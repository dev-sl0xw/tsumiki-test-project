# TASK-0012: ECS Cluster Construct 実装 - TDD用要件定義書

**タスクID**: TASK-0012
**機能名**: ECS Cluster Construct 実装
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-23
**フェーズ**: Phase 3 - アプリケーション

---

## 1. 機能の概要

### 1.1 機能説明

| 項目 | 内容 | 信頼性 |
|------|------|--------|
| 何をする機能か | ECS Fargate Cluster を作成する CDK Construct を実装し、Container Insights を有効化してコンテナのメトリクス収集とログ分析を可能にする | 🔵 |
| どのような問題を解決するか | サーバーレスコンテナ実行環境の構築とコンテナレベルのモニタリング基盤を提供する | 🔵 |
| 想定されるユーザー | インフラエンジニア、CDK Stack（Application Stack）から利用される | 🔵 |
| システム内での位置づけ | Application Stack に属し、VPC Stack に依存。Task Definition、Service の前提となるコンポーネント | 🔵 |

**参照したEARS要件**: REQ-012, REQ-013, NFR-301
**参照した設計文書**: architecture.md「コンピューティング層」セクション

### 1.2 アーキテクチャ位置づけ 🔵

```
VPC Stack → Security Stack → Application Stack (ECS Cluster) ← 本タスクの対象
                              ↓
                          Task Definition → Service
```

ECS Cluster は Application Stack の基盤コンポーネントとして、後続の Task Definition (TASK-0014) と Service が依存する。

---

## 2. 入力・出力の仕様

### 2.1 入力パラメータ（Props インターフェース）

| パラメータ名 | 型 | 必須 | デフォルト値 | 説明 | 信頼性 |
|--------------|------|------|-------------|------|--------|
| `vpc` | `ec2.IVpc` | 必須 | - | ECS Cluster を作成する VPC への参照 | 🔵 |
| `clusterName` | `string` | オプション | 自動生成 | ECS Cluster の名前。指定しない場合は CDK が自動生成 | 🔵 |
| `containerInsights` | `boolean` | オプション | `true` | Container Insights の有効/無効。デフォルトで有効 | 🔵 |

**参照したEARS要件**: REQ-012, REQ-013
**参照した設計文書**: interfaces.ts `EcsClusterConfig` インターフェース

### 2.2 出力プロパティ

| プロパティ名 | 型 | 説明 | 信頼性 |
|--------------|------|------|--------|
| `cluster` | `ecs.ICluster` | 作成された ECS Cluster への参照。Task Definition、Service 作成時に参照 | 🔵 |

**参照した設計文書**: note.md「出力プロパティ設計」セクション

### 2.3 型定義（TypeScript）🔵

```typescript
/**
 * EcsClusterConstruct の Props インターフェース
 * @interface EcsClusterConstructProps
 */
export interface EcsClusterConstructProps {
  /**
   * VPC (必須)
   * 【用途】: ECS クラスターを作成する VPC
   * 🔵 信頼性: REQ-012 より
   */
  readonly vpc: ec2.IVpc;

  /**
   * クラスター名 (オプション)
   * 【デフォルト】: 自動生成
   * 🔵 信頼性: 設計文書より
   */
  readonly clusterName?: string;

  /**
   * Container Insights 有効化 (オプション)
   * 【デフォルト】: true
   * 🔵 信頼性: REQ-013 より
   */
  readonly containerInsights?: boolean;
}
```

**参照した設計文書**: interfaces.ts `EcsClusterConfig`

---

## 3. 制約条件

### 3.1 パフォーマンス要件 🔵

| 項目 | 制約内容 | 根拠 |
|------|----------|------|
| 起動タイプ | Fargate 専用（EC2 起動タイプは使用しない） | REQ-012 |

**参照したEARS要件**: REQ-012
**参照した設計文書**: architecture.md「コンピューティング層」

### 3.2 セキュリティ要件 🔵

| 項目 | 制約内容 | 根拠 |
|------|----------|------|
| Container Insights | 有効化必須（モニタリングのため） | REQ-013, NFR-301 |
| ログ送信 | CloudWatch Logs にメトリクスを送信 | NFR-301 |

**参照したEARS要件**: REQ-013, NFR-301
**参照した設計文書**: architecture.md「運用・監視層」

### 3.3 技術的制約 🔵

| 項目 | 制約内容 | 根拠 |
|------|----------|------|
| IaC フレームワーク | AWS CDK v2 (TypeScript) | REQ-401 |
| リージョン | ap-northeast-1 (Tokyo) | REQ-403 |
| 依存リソース | VPC Construct (TASK-0010) が前提 | アーキテクチャ設計 |

**参照したEARS要件**: REQ-401, REQ-403
**参照した設計文書**: architecture.md「Stack 依存関係」

### 3.4 アーキテクチャ制約 🔵

| 項目 | 制約内容 | 根拠 |
|------|----------|------|
| Stack 配置 | Application Stack に含める | アーキテクチャ設計 |
| 依存関係 | VPC Stack → Application Stack (ECS Cluster) | Stack 依存関係図 |
| 後続依存 | Task Definition、Service が本 Construct に依存 | アーキテクチャ設計 |

**参照した設計文書**: architecture.md「Stack 依存関係」「各 Stack の責務」

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン 🔵

```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { EcsClusterConstruct } from '../lib/construct/ecs/ecs-cluster-construct';

// VPC の取得（VpcConstruct から）
const vpc = vpcConstruct.vpc;

// デフォルト設定での使用（Container Insights 有効）
const ecsCluster = new EcsClusterConstruct(this, 'EcsCluster', {
  vpc: vpc,
});

// 後続の Task Definition で参照
const cluster = ecsCluster.cluster;
```

**参照した設計文書**: note.md「基本実装コード」

### 4.2 カスタム設定での使用パターン 🔵

```typescript
// カスタム設定での使用
const ecsCluster = new EcsClusterConstruct(this, 'EcsCluster', {
  vpc: vpc,
  clusterName: 'my-app-cluster',
  containerInsights: true,  // 明示的に指定
});
```

### 4.3 データフロー 🔵

```
                                    ┌─────────────────┐
                                    │   CloudWatch    │
                                    │     Logs        │
                                    └────────▲────────┘
                                             │ メトリクス送信
                                             │ (Container Insights)
┌─────────────────┐     ┌────────────────────┴───────────────────┐
│  VPC Construct  │────►│          ECS Cluster Construct         │
│    (TASK-0010)  │     │                                        │
└─────────────────┘     │  - Fargate 専用クラスター              │
                        │  - Container Insights: enabled         │
                        └────────────────────┬───────────────────┘
                                             │
                                             ▼
                        ┌────────────────────────────────────────┐
                        │        Task Definition (TASK-0014)     │
                        │               Service                   │
                        └────────────────────────────────────────┘
```

**参照した設計文書**: dataflow.md、architecture.md

### 4.4 エッジケース 🟡

| ケース | 説明 | 期待される動作 | 信頼性 |
|--------|------|----------------|--------|
| `clusterName` 未指定 | クラスター名を指定しない場合 | CDK が一意の名前を自動生成 | 🟡 |
| `containerInsights` 未指定 | Container Insights を指定しない場合 | デフォルトで `true`（有効）として処理 | 🔵 |
| `containerInsights: false` 指定 | Container Insights を無効化する場合 | CloudWatch へのメトリクス送信を無効化（非推奨） | 🟡 |
| VPC が null/undefined | 無効な VPC が渡された場合 | CDK/CloudFormation でエラー発生 | 🟡 |

**参照したEARS要件**: REQ-013（Container Insights 有効化が要件）
**参照した設計文書**: interfaces.ts デフォルト設定

### 4.5 エラーケース 🟡

| エラー条件 | 期待される動作 | 信頼性 |
|------------|----------------|--------|
| VPC 未指定 | TypeScript コンパイルエラー（必須パラメータ） | 🟡 |
| 無効な VPC 参照 | CDK synth 時にエラー | 🟡 |
| クラスター名の重複 | CloudFormation デプロイ時にエラー | 🟡 |

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー

- **US-003**: コンテナアプリケーションの実行基盤構築 🔵

### 5.2 参照した機能要件 🔵

| 要件ID | 要件内容 | 対応内容 |
|--------|----------|----------|
| REQ-012 | システムは Fargate 専用の ECS クラスターを作成しなければならない | ECS Cluster を Fargate 起動タイプで作成 |
| REQ-013 | システムは Container Insights を有効化しなければならない | `containerInsights: true` をデフォルト設定 |

### 5.3 参照した非機能要件 🔵

| 要件ID | 要件内容 | 対応内容 |
|--------|----------|----------|
| NFR-301 | システムは Container Insights を有効化してモニタリング可能にしなければならない | CloudWatch へのメトリクス送信を有効化 |

### 5.4 参照したEdgeケース 🟡

| ケースID | 内容 | 対応 |
|----------|------|------|
| EDGE-002 | ECS タスクが失敗した場合、自動的に新しいタスクを起動しなければならない | Service レベルで対応（本 Construct の範囲外） |

### 5.5 参照した受け入れ基準 🔵

- ECS Cluster リソースが正常に作成されること
- Fargate 起動タイプがサポートされていること
- Container Insights が有効化されていること
- ユニットテストがすべてパスすること
- スナップショットテストがパスすること

### 5.6 参照した設計文書

| 文書 | 該当セクション | 参照内容 |
|------|----------------|----------|
| **architecture.md** | コンピューティング層、Stack 依存関係 | ECS Cluster の位置づけ、依存関係 |
| **dataflow.md** | アプリケーション層 | データフローの確認 |
| **interfaces.ts** | `EcsClusterConfig` | 型定義、デフォルト値 |
| **note.md** | 全体 | 開発コンテキスト、実装パターン |

---

## 6. 受け入れ基準

### 6.1 機能要件の受け入れ基準 🔵

| AC-ID | 受け入れ基準 | 検証方法 | 信頼性 |
|-------|--------------|----------|--------|
| AC-001 | `AWS::ECS::Cluster` リソースが 1 つ作成されること | CDK Template Assertion | 🔵 |
| AC-002 | `ClusterSettings` に `containerInsights: enabled` が設定されること | CDK Template Assertion | 🔵 |
| AC-003 | `clusterName` を指定した場合、その名前が設定されること | CDK Template Assertion | 🔵 |
| AC-004 | `clusterName` 未指定の場合、自動生成されること | CDK Template Assertion | 🔵 |
| AC-005 | `containerInsights` 未指定の場合、デフォルトで `enabled` になること | CDK Template Assertion | 🔵 |
| AC-006 | 公開プロパティ `cluster` が `ecs.ICluster` 型で取得できること | TypeScript 型チェック | 🔵 |

### 6.2 非機能要件の受け入れ基準 🔵

| AC-ID | 受け入れ基準 | 検証方法 | 信頼性 |
|-------|--------------|----------|--------|
| AC-101 | スナップショットテストがパスすること | Jest Snapshot Test | 🔵 |
| AC-102 | 全テストケースがパスすること | `npm test` | 🔵 |
| AC-103 | TypeScript コンパイルが成功すること | `npm run build` | 🔵 |

### 6.3 コーディング標準の受け入れ基準 🔵

| AC-ID | 受け入れ基準 | 検証方法 | 信頼性 |
|-------|--------------|----------|--------|
| AC-201 | JSDoc コメントが全パブリック API に記述されていること | コードレビュー | 🔵 |
| AC-202 | 信頼性レベル（🔵🟡🔴）がコメントに記載されていること | コードレビュー | 🔵 |
| AC-203 | 既存実装パターン（VpcConstruct）に準拠していること | コードレビュー | 🔵 |
| AC-204 | ファイル名が `ecs-cluster-construct.ts` であること | ファイル確認 | 🔵 |

---

## 7. テストケース概要

### 7.1 基本テストケース 🔵

| テストID | テスト概要 | 検証項目 | 信頼性 |
|----------|-----------|----------|--------|
| TC-ECS-CLUSTER-01 | ECS Cluster リソース作成確認 | `AWS::ECS::Cluster` が 1 つ作成される | 🔵 |
| TC-ECS-CLUSTER-02 | Cluster 名指定時の確認 | 指定した名前が `ClusterName` に設定される | 🔵 |
| TC-ECS-CLUSTER-03 | Container Insights 有効化確認 | `ClusterSettings.containerInsights` が `enabled` | 🔵 |
| TC-ECS-CLUSTER-04 | 公開プロパティ確認 | `cluster` プロパティが `ecs.ICluster` として取得可能 | 🔵 |

### 7.2 デフォルト値テストケース 🔵

| テストID | テスト概要 | 検証項目 | 信頼性 |
|----------|-----------|----------|--------|
| TC-ECS-CLUSTER-05 | Container Insights デフォルト値確認 | 未指定時に `enabled` が設定される | 🔵 |
| TC-ECS-CLUSTER-06 | Cluster 名デフォルト値確認 | 未指定時に自動生成（CDK が生成する形式） | 🟡 |

### 7.3 スナップショットテスト 🔵

| テストID | テスト概要 | 検証項目 | 信頼性 |
|----------|-----------|----------|--------|
| TC-ECS-CLUSTER-07 | CloudFormation テンプレート確認 | 期待通りのテンプレートが生成される | 🔵 |

---

## 8. 実装ファイル

| ファイルパス | 内容 | 信頼性 |
|--------------|------|--------|
| `infra/lib/construct/ecs/ecs-cluster-construct.ts` | Construct 実装 | 🔵 |
| `infra/test/construct/ecs/ecs-cluster-construct.test.ts` | テストファイル | 🔵 |

---

## 9. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 説明 |
|--------|------|------|------|
| 🔵 青信号 | 45 | 90% | EARS要件定義書・設計文書を参考にした確実な要件 |
| 🟡 黄信号 | 5 | 10% | EARS要件定義書・設計文書から妥当な推測 |
| 🔴 赤信号 | 0 | 0% | EARS要件定義書・設計文書にない推測 |

---

## 10. 品質判定結果

| 評価項目 | 判定 | 詳細 |
|----------|------|------|
| 要件の曖昧さ | ✅ なし | REQ-012, REQ-013 が明確に定義されている |
| 入出力定義 | ✅ 完全 | Props インターフェースと出力プロパティが明確 |
| 制約条件 | ✅ 明確 | Fargate 専用、Container Insights 有効化が明確 |
| 実装可能性 | ✅ 確実 | 既存パターン（VpcConstruct）を参考に実装可能 |
| 信頼性レベル | ✅ 良好 | 🔵（青信号）が90%を占める |

**総合評価**: ✅ **高品質** - 要件が明確で、既存実装パターンに準拠した実装が可能

---

## 11. 参考リソース

### 11.1 プロジェクト内ドキュメント

- `docs/spec/aws-cdk-serverless-architecture/requirements.md` - 要件定義書
- `docs/design/aws-cdk-serverless-architecture/architecture.md` - アーキテクチャ設計
- `docs/design/aws-cdk-serverless-architecture/dataflow.md` - データフロー設計
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - 型定義
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0012.md` - タスク詳細
- `docs/implements/aws-cdk-serverless-architecture/TASK-0012/note.md` - タスクノート

### 11.2 既存実装参照

- `infra/lib/construct/vpc/vpc-construct.ts` - VPC Construct 実装パターン
- `infra/test/construct/vpc/vpc-construct.test.ts` - テストパターン

### 11.3 AWS ドキュメント

- [AWS CDK ECS Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html)
- [Amazon ECS Container Insights](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-container-insights.html)
