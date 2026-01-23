# TASK-0012: ECS Cluster Construct 実装 - TDD開発タスクノート

**作成日時**: 2026-01-23
**タスクID**: TASK-0012
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 3 - アプリケーション

---

## 1. プロジェクトコンテキスト

### 1.1 プロジェクト概要

AWS CDK v2 (TypeScript) を使用した高可用性・セキュリティ強化されたサーバーレスWebサービスアーキテクチャの構築プロジェクト。

**主要特徴**:
- ECS Fargate によるコンテナベースのアプリケーション実行
- Aurora MySQL Serverless v2 によるスケーラブルなデータベース
- CloudFront + ALB による高性能な配信とロードバランシング
- Sidecar パターンによるセキュアな DB 接続
- VPC Endpoint による内部通信最適化とコスト削減

### 1.2 プロジェクト構成

```
infra/
├── bin/                       # CDK App エントリーポイント
├── lib/
│   ├── construct/
│   │   ├── vpc/               # VPC, Endpoints Construct
│   │   ├── security/          # Security Group, IAM Role, WAF Construct
│   │   ├── database/          # Aurora Construct
│   │   ├── ecs/               # (対象) ECS Cluster, Task Definition, Service
│   │   └── monitoring/        # Alarm, Dashboard Construct
│   └── stack/                 # Stack 定義
├── test/                      # テスト
│   └── construct/             # Construct 単体テスト
├── parameter.ts               # 環境別パラメータ
└── package.json
```

---

## 2. 技術スタック

### 2.1 開発環境

| 項目 | 技術/ツール |
|------|------------|
| IaC フレームワーク | AWS CDK v2 |
| 言語 | TypeScript (strict mode) |
| テストフレームワーク | Jest |
| リージョン | ap-northeast-1 (Tokyo) |

### 2.2 対象 AWS リソース

| リソース | 用途 |
|----------|------|
| ECS Cluster | Fargate 専用クラスター |
| Container Insights | コンテナメトリクス収集 |

### 2.3 依存関係

- `aws-cdk-lib/aws-ecs` - ECS Cluster 作成
- `aws-cdk-lib/aws-ec2` - VPC 参照
- `constructs` - Construct 基底クラス

---

## 3. 開発ルール

### 3.1 コーディング規約

#### ファイル構成

```typescript
/**
 * [タイトル]
 *
 * TASK-XXXX: [タスク名]
 * フェーズ: [現在のフェーズ]
 *
 * 【機能概要】: ...
 * 【実装方針】: ...
 * 【テスト対応】: TC-XXX-01 〜 TC-XXX-XX の全Xテストケースに対応
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @module [モジュール名]
 */
```

#### 定数定義パターン

```typescript
// ============================================================================
// 【定数定義】: [説明]
// 🔵 信頼性: [根拠]
// ============================================================================

/**
 * 【定数名】: [説明]
 * 🔵 信頼性: [要件番号] より
 */
const DEFAULT_XXX = 'value';
```

#### インターフェース定義パターン

```typescript
/**
 * [Construct名] の Props インターフェース
 *
 * 【設計方針】: [説明]
 * 【再利用性】: [説明]
 * 🔵 信頼性: [根拠]
 *
 * @interface [Interface名]
 */
export interface XxxConstructProps {
  /**
   * [プロパティ説明]
   *
   * 【用途】: [説明]
   * 【デフォルト】: [値]
   * 🔵 信頼性: [根拠]
   *
   * @default [デフォルト値]
   * @type {[型]}
   */
  readonly propName?: PropType;
}
```

#### Construct 実装パターン

```typescript
/**
 * [Construct名]
 *
 * 【機能概要】: [説明]
 * 【実装方針】: [説明]
 * 【テスト対応】: TC-XXX-01 〜 TC-XXX-XX の全テストケースに対応
 *
 * 🔵 信頼性レベル: 要件定義書に基づく実装
 *
 * @class [クラス名]
 * @extends Construct
 *
 * @example
 * ```typescript
 * const xxx = new XxxConstruct(stack, 'Xxx', {
 *   ...
 * });
 * ```
 */
export class XxxConstruct extends Construct {
  /**
   * 【プロパティ】: [説明]
   *
   * 【用途】: [説明]
   * 🔵 信頼性: [根拠]
   *
   * @readonly
   * @type {[型]}
   */
  public readonly propName: PropType;

  constructor(scope: Construct, id: string, props: XxxConstructProps) {
    super(scope, id);

    // ========================================================================
    // 【処理セクション】: [説明]
    // 🔵 信頼性: [根拠]
    // ========================================================================

    // 【具体的処理】: [説明]
    // 🔵 信頼性: [要件番号] より
  }
}
```

### 3.2 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | ケバブケース | `ecs-cluster-construct.ts` |
| クラス名 | パスカルケース | `EcsClusterConstruct` |
| インターフェース名 | パスカルケース | `EcsClusterConstructProps` |
| 定数 | スネークケース(大文字) | `DEFAULT_CONTAINER_INSIGHTS` |
| 変数・プロパティ | キャメルケース | `containerInsights` |
| テストファイル | `*.test.ts` | `ecs-cluster-construct.test.ts` |

### 3.3 テスト要件

#### テストファイル構成

```typescript
/**
 * [Construct名] テスト
 *
 * TASK-XXXX: [タスク名]
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-XXX-01: [テスト概要]
 * - TC-XXX-02: [テスト概要]
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { XxxConstruct } from '../../../lib/construct/xxx/xxx-construct';

describe('XxxConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let xxxConstruct: XxxConstruct;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    // テスト対象の Construct をインスタンス化
  });

  describe('TC-XXX-01: [テスト概要]', () => {
    // 【テスト目的】: [説明]
    // 【テスト内容】: [説明]
    // 【期待される動作】: [説明]
    // 🔵 信頼性: [要件番号] より

    beforeEach(() => {
      xxxConstruct = new XxxConstruct(stack, 'TestXxx', { ... });
      template = Template.fromStack(stack);
    });

    test('[テスト名]', () => {
      // 【検証項目】: [説明]
      // 🔵 信頼性: [要件番号] より
      template.hasResourceProperties('AWS::XXX::XXX', {
        ...
      });
    });
  });
});
```

#### テスト実行コマンド

```bash
# テスト実行
npm test

# 特定テスト実行
npm test -- ecs-cluster-construct.test.ts

# スナップショット更新
npm test -- -u
```

---

## 4. 関連要件

### 4.1 対象要件 (requirements.md より)

| 要件ID | 要件内容 | 信頼性 |
|--------|----------|--------|
| REQ-012 | システムは Fargate 専用の ECS クラスターを作成しなければならない | 🔵 |
| REQ-013 | システムは Container Insights を有効化しなければならない | 🔵 |

### 4.2 関連非機能要件

| 要件ID | 要件内容 | 信頼性 |
|--------|----------|--------|
| NFR-301 | システムは Container Insights を有効化してモニタリング可能にしなければならない | 🔵 |

---

## 5. 設計仕様

### 5.1 アーキテクチャ位置づけ (architecture.md より)

ECS Cluster は Application Stack に属し、以下の依存関係を持つ:

```
VPC Stack → Security Stack → Application Stack (ECS Cluster)
                              ↓
                          Task Definition → Service
```

### 5.2 ECS クラスター仕様

| 設定項目 | 設定値 | 根拠 |
|----------|--------|------|
| 起動タイプ | Fargate | REQ-012 |
| Container Insights | 有効 | REQ-013, NFR-301 |
| クラスター名 | `${envName}-cluster` 形式 | 命名規則 |

### 5.3 型定義 (interfaces.ts より)

```typescript
/**
 * ECS クラスター設定 🔵
 * @description ECS クラスターの基本設定 (REQ-012〜013)
 */
export interface EcsClusterConfig {
  /** クラスター名のサフィックス */
  readonly clusterNameSuffix: string;

  /** Container Insights 有効化 */
  readonly containerInsights: boolean;
}
```

### 5.4 Props インターフェース設計

```typescript
export interface EcsClusterConstructProps {
  /**
   * VPC (必須)
   * 【用途】: ECS クラスターを作成する VPC
   */
  readonly vpc: ec2.IVpc;

  /**
   * クラスター名 (オプション)
   * 【デフォルト】: 自動生成
   */
  readonly clusterName?: string;

  /**
   * Container Insights 有効化 (オプション)
   * 【デフォルト】: true
   */
  readonly containerInsights?: boolean;
}
```

### 5.5 出力プロパティ設計

```typescript
export class EcsClusterConstruct extends Construct {
  /**
   * 【プロパティ】: ECS クラスター
   * 【用途】: Task Definition、Service 作成時に参照
   */
  public readonly cluster: ecs.ICluster;
}
```

---

## 6. 既存実装パターン参照

### 6.1 VpcConstruct パターン

**ファイル**: `lib/construct/vpc/vpc-construct.ts`

- デフォルト値を定数として外出し
- Props のオプショナルプロパティにデフォルト値を提供
- JSDoc による詳細なドキュメント
- 信頼性レベルの明記

### 6.2 SecurityGroupConstruct パターン

**ファイル**: `lib/construct/security/security-group-construct.ts`

- 複数リソースの一元管理
- リソース間の参照設定
- 最小権限の原則に基づく設計

### 6.3 WafConstruct パターン

**ファイル**: `lib/construct/security/waf-construct.ts`

- 入力バリデーション関数
- カスタム設定のサポート
- 公開メソッドによる関連付け機能

---

## 7. テストケース概要

### 7.1 基本テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ECS-CLUSTER-01 | ECS Cluster リソース作成確認 | AWS::ECS::Cluster が 1 つ作成される |
| TC-ECS-CLUSTER-02 | Cluster 名確認 | 指定した名前または自動生成名が設定される |
| TC-ECS-CLUSTER-03 | Container Insights 有効化確認 | containerInsights が enabled |
| TC-ECS-CLUSTER-04 | 公開プロパティ確認 | cluster プロパティが定義されている |

### 7.2 デフォルト値テストケース

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ECS-CLUSTER-05 | Container Insights デフォルト値確認 | 未指定時に true (enabled) |
| TC-ECS-CLUSTER-06 | Cluster 名デフォルト値確認 | 未指定時に自動生成 |

### 7.3 スナップショットテスト

| テストID | テスト概要 | 検証項目 |
|----------|-----------|----------|
| TC-ECS-CLUSTER-07 | CloudFormation テンプレート確認 | 期待通りのテンプレートが生成される |

---

## 8. 実装ガイド

### 8.1 実装ファイル

| ファイルパス | 内容 |
|--------------|------|
| `lib/construct/ecs/ecs-cluster-construct.ts` | Construct 実装 |
| `test/construct/ecs/ecs-cluster-construct.test.ts` | テストファイル |

### 8.2 基本実装コード

```typescript
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: デフォルト値
// 🔵 信頼性: REQ-013 より
// ============================================================================

/**
 * 【デフォルト Container Insights 設定】: Container Insights の有効/無効
 * 🔵 信頼性: REQ-013 より (有効化が必須)
 */
const DEFAULT_CONTAINER_INSIGHTS = true;

export interface EcsClusterConstructProps {
  readonly vpc: ec2.IVpc;
  readonly clusterName?: string;
  readonly containerInsights?: boolean;
}

export class EcsClusterConstruct extends Construct {
  public readonly cluster: ecs.ICluster;

  constructor(scope: Construct, id: string, props: EcsClusterConstructProps) {
    super(scope, id);

    const containerInsights = props.containerInsights ?? DEFAULT_CONTAINER_INSIGHTS;

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: props.clusterName,
      containerInsights: containerInsights,
    });
  }
}
```

---

## 9. 注意事項

### 9.1 セキュリティ考慮事項

- Container Insights は CloudWatch Logs にメトリクスを送信するため、適切な IAM 権限が必要
- ECS Cluster 自体はネットワーク境界を持たない（Service/Task レベルで設定）

### 9.2 パフォーマンス考慮事項

- Container Insights は追加コストが発生（CloudWatch の料金）
- 本番環境では必須、開発環境では検討が必要

### 9.3 依存タスク

| タスクID | タスク名 | 関係 |
|----------|----------|------|
| TASK-0010 | VPC Construct 実装 | 前提（VPC が必要） |
| TASK-0013 | Sidecar Container イメージ作成 | 後続 |
| TASK-0014 | Task Definition Construct 実装 | 後続（Cluster を参照） |

### 9.4 CDK ベストプラクティス

- `npx` を使用してワークスペースローカルの CDK バージョンを使用
- テスト更新時は `npm test -- -u` でスナップショット更新
- Stack 間の依存関係は CDK が自動解決（明示的な addDependency は不要）

---

## 10. 参考リソース

### 10.1 プロジェクト内ドキュメント

- `docs/spec/aws-cdk-serverless-architecture/requirements.md` - 要件定義書
- `docs/design/aws-cdk-serverless-architecture/architecture.md` - アーキテクチャ設計
- `docs/design/aws-cdk-serverless-architecture/dataflow.md` - データフロー設計
- `docs/design/aws-cdk-serverless-architecture/interfaces.ts` - 型定義
- `docs/tasks/aws-cdk-serverless-architecture/TASK-0012.md` - タスク詳細

### 10.2 既存実装参照

- `lib/construct/vpc/vpc-construct.ts` - VPC Construct 実装パターン
- `lib/construct/security/security-group-construct.ts` - Security Group 実装パターン
- `lib/construct/security/waf-construct.ts` - WAF Construct 実装パターン
- `test/construct/vpc/vpc-construct.test.ts` - テストパターン

### 10.3 AWS ドキュメント

- [AWS CDK ECS Module](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html)
- [Amazon ECS Container Insights](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-container-insights.html)

---

## 11. TDD 実行手順

### 11.1 Red フェーズ

1. `/tsumiki:tdd-requirements TASK-0012` - 詳細要件定義
2. `/tsumiki:tdd-testcases` - テストケース洗い出し
3. `/tsumiki:tdd-red` - 失敗するテスト実装

### 11.2 Green フェーズ

4. `/tsumiki:tdd-green` - テストを通す最小実装

### 11.3 Refactor フェーズ

5. `/tsumiki:tdd-refactor` - コード品質改善

### 11.4 完了確認

6. `/tsumiki:tdd-verify-complete` - 品質確認・テスト網羅性確認

---

**信頼性レベルサマリー**:
- 🔵 青信号: 要件定義書・設計文書より確認済み
- 🟡 黄信号: 妥当な推測による設計
- 🔴 赤信号: 推測による設計（なし）

**品質評価**: 高品質 - 対象要件が明確で、既存実装パターンが確立されている
