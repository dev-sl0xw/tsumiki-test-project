# TASK-0024: Ops Stack 統合 + 最終統合テスト 要件定義書

**タスクID**: TASK-0024
**機能名**: Ops Stack 統合 + 最終統合テスト
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-05
**信頼性レベル**: 🔵 青信号中心

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 何をする機能か 🔵

**信頼性**: 🔵 *要件定義書 REQ-035〜041、設計文書より*

CloudWatch Logs、CloudWatch Alarms、AWS Chatbot、CI/CD Pipeline を統合する **Ops Stack** を作成し、全 6 Stack（VPC, Security, Database, Application, Distribution, Ops）の統合テストを実施する。

**主要機能**:
- 監視・運用関連リソースの統合管理
- ログ収集・保持・エクスポート機能
- アラーム設定・通知機能（Slack 連携）
- CI/CD パイプライン（CodeCommit → CodeBuild → CodePipeline）
- 環境別設定（Dev/Prod）の適用

### 1.2 どのような問題を解決するか 🔵

**信頼性**: 🔵 *要件定義書より*

- **運用効率化**: ログ・アラーム・CI/CD を一元管理
- **通知の迅速化**: CloudWatch Alarm → SNS → Chatbot → Slack
- **コンプライアンス**: Prod 環境でのログ長期保存（S3 Glacier）
- **デプロイ自動化**: CodePipeline による ECS Rolling Update

### 1.3 想定されるユーザー 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

- **インフラエンジニア**: Stack のデプロイ・管理
- **DevOps エンジニア**: CI/CD パイプラインの運用
- **SRE**: アラーム監視・障害対応

### 1.4 システム内での位置づけ 🔵

**信頼性**: 🔵 *設計文書 architecture.md より*

```
Stack 依存関係:
VPC Stack → Security Stack → Database Stack → Application Stack
                                                    ↓
                                              Distribution Stack
                                                    ↓
                                              Ops Stack (本タスク)

Ops Stack は Application Stack の ECS Cluster/Service を参照し、
ログ収集・アラーム・CI/CD を構成する。
```

### 1.5 参照文書

- **参照したEARS要件**: REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-101, REQ-102, REQ-103
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md` - CDK Stack 構成セクション

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ 🔵

**信頼性**: 🔵 *既存 Construct の Props 定義より*

#### OpsStackProps インターフェース

```typescript
interface OpsStackProps extends cdk.StackProps {
  // 環境設定
  config: EnvironmentConfig;        // 🔵 parameter.ts より

  // Application Stack からの参照
  ecsCluster: ecs.ICluster;         // 🔵 ECS Cluster 参照
  ecsServices: {                    // 🔵 ECS Service 参照
    frontend: ecs.IService;
    backend: ecs.IService;
  };
  vpc: ec2.IVpc;                    // 🔵 VPC 参照（VPC Flow Logs 用）

  // オプション設定
  enableLogExport?: boolean;        // 🔵 S3 Glacier Export (Prod のみ)
  enableChatbot?: boolean;          // 🔵 Chatbot 有効化
  enableCicd?: boolean;             // 🟡 CI/CD 有効化（デフォルト: true）
}
```

#### EnvironmentConfig（parameter.ts より） 🔵

```typescript
interface EnvironmentConfig {
  envName: string;              // 'dev' | 'prod'
  account: string;
  region: string;
  logRetentionDays: number;     // Dev: 3, Prod: 30
  slackWorkspaceId: string;     // Chatbot 用
  slackChannelId: string;       // Chatbot 用
}
```

### 2.2 出力値 🔵

**信頼性**: 🔵 *CDK Stack 出力パターンより*

#### Ops Stack 出力プロパティ

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `logGroups` | `LogGroupConstruct` | ロググループ群 |
| `alarms` | `AlarmConstruct` | アラーム群 |
| `chatbot` | `ChatbotConstruct \| undefined` | Chatbot（有効時のみ） |
| `pipeline` | `CodePipelineConstruct \| undefined` | CI/CD パイプライン |
| `alarmTopic` | `sns.ITopic` | SNS アラームトピック |

#### CfnOutput 出力

| 出力名 | 値 | 説明 |
|--------|-----|------|
| `AlarmTopicArn` | SNS Topic ARN | アラーム通知先 |
| `PipelineArn` | CodePipeline ARN | CI/CD パイプライン ARN（有効時） |

### 2.3 データフロー 🔵

**信頼性**: 🔵 *設計文書 dataflow.md より*

```
ログフロー:
ECS Task → CloudWatch Logs → (Prod) Kinesis Firehose → S3 → Glacier

アラームフロー:
CloudWatch Metrics → CloudWatch Alarm → SNS Topic → Chatbot → Slack

CI/CD フロー:
CodeCommit → CodePipeline → CodeBuild → ECS Rolling Update
```

### 2.4 参照文書

- **参照したEARS要件**: REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, REQ-040, REQ-041
- **参照した設計文書**:
  - `infra/parameter.ts` - EnvironmentConfig
  - `infra/lib/construct/monitoring/*.ts` - Construct Props

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 アーキテクチャ制約 🔵

**信頼性**: 🔵 *設計文書より*

| 制約項目 | 制約内容 | 根拠 |
|----------|----------|------|
| Stack 数 | 全 6 Stack（VPC, Security, Database, Application, Distribution, Ops） | 設計文書 |
| 循環参照禁止 | Stack 間の循環参照は禁止 | CDK ベストプラクティス |
| Construct 再利用 | 既存 Construct を再利用（新規作成禁止） | TDD 完了済み |

### 3.2 セキュリティ制約 🔵

**信頼性**: 🔵 *要件定義書 NFR-101〜105より*

| 制約項目 | 制約内容 |
|----------|----------|
| SNS Topic 暗号化 | KMS 暗号化必須 |
| CloudWatch Logs 暗号化 | KMS 暗号化必須 |
| S3 バケット暗号化 | SSE-S3 または KMS |
| IAM 最小権限 | 各ロールに必要最小限の権限 |

### 3.3 パフォーマンス制約 🟡

**信頼性**: 🟡 *AWS ベストプラクティスから推測*

| 制約項目 | 制約内容 |
|----------|----------|
| Firehose バッファ | 60秒 / 1MB（デフォルト） |
| Alarm 評価期間 | 5分 × 3回（15分） |

### 3.4 環境別制約 🔵

**信頼性**: 🔵 *要件定義書 REQ-042, REQ-101, REQ-102より*

| 環境 | ログ保持期間 | S3 Glacier Export | 手動承認 |
|------|-------------|-------------------|----------|
| Dev | 3日 | 無効 | 無効 |
| Prod | 30日 | 有効（30日後） | オプション |

### 3.5 参照文書

- **参照したEARS要件**: REQ-042, REQ-101, REQ-102, NFR-101〜105
- **参照した設計文書**: `docs/design/aws-cdk-serverless-architecture/architecture.md`

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン 🔵

**信頼性**: 🔵 *要件定義書より*

#### パターン1: Dev 環境デプロイ

```typescript
// bin/app.ts
const opsStack = new OpsStack(app, 'Dev-OpsStack', {
  config: devConfig,
  ecsCluster: applicationStack.cluster,
  ecsServices: {
    frontend: applicationStack.frontendService,
    backend: applicationStack.backendService,
  },
  vpc: vpcStack.vpc,
  enableLogExport: false,  // Dev は無効
  enableChatbot: false,    // Slack 未設定のため無効
  enableCicd: true,
});
```

#### パターン2: Prod 環境デプロイ

```typescript
const opsStack = new OpsStack(app, 'Prod-OpsStack', {
  config: prodConfig,
  ecsCluster: applicationStack.cluster,
  ecsServices: {
    frontend: applicationStack.frontendService,
    backend: applicationStack.backendService,
  },
  vpc: vpcStack.vpc,
  enableLogExport: true,   // Prod は有効
  enableChatbot: true,     // Slack 連携有効
  enableCicd: true,
});
```

### 4.2 エッジケース 🔵

**信頼性**: 🔵 *既存 Construct の実装より*

| エッジケース | 期待動作 | 根拠 |
|-------------|---------|------|
| Slack 設定なしで Chatbot 有効 | Chatbot は作成されない（スキップ） | ChatbotConstruct 実装 |
| CI/CD 無効設定 | CodeCommit/Build/Pipeline は作成されない | オプション設定 |
| envName が空 | バリデーションエラー | 既存 Stack のパターン |
| envName が 20 文字超過 | バリデーションエラー | DistributionStack パターン |

### 4.3 エラーケース 🟡

**信頼性**: 🟡 *CDK ベストプラクティスから推測*

| エラーケース | 期待動作 |
|-------------|---------|
| ECS Cluster 参照が null | CDK Synth 失敗（必須プロパティ） |
| VPC 参照が null | CDK Synth 失敗（必須プロパティ） |
| Stack 循環参照 | CDK Synth 失敗 |

### 4.4 参照文書

- **参照したEARS要件**: EDGE-001〜003
- **参照した設計文書**: `infra/lib/stack/distribution-stack.ts`（パターン参考）

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照した機能要件 🔵

| 要件ID | 要件内容 | 対応実装 |
|--------|---------|---------|
| REQ-035 | ECS、RDS、VPC Flow Log を CloudWatch Logs に収集 | LogGroupConstruct |
| REQ-036 | Dev 環境でログ保持期間 1-3 日 | LogGroupConstruct (retentionDays: 3) |
| REQ-037 | Prod 環境でログ保持期間 15-30 日 | LogGroupConstruct (retentionDays: 30) |
| REQ-038 | Prod 環境でログを S3 Glacier に長期保存 | LogExportConstruct |
| REQ-039 | CloudWatch Alarm 発生時に Slack 通知 | AlarmConstruct + ChatbotConstruct |
| REQ-040 | CI/CD パイプライン構築 | CodePipelineConstruct |
| REQ-041 | CodePipeline / CodeBuild による自動デプロイ | CodePipelineConstruct + CodeBuildConstruct |
| REQ-042 | Dev と Prod 2 環境構成 | parameter.ts + OpsStackProps.config |

### 5.2 参照した非機能要件 🔵

| 要件ID | 要件内容 | 対応実装 |
|--------|---------|---------|
| NFR-301 | Container Insights 有効化 | EcsClusterConstruct（Application Stack） |
| NFR-302 | ECS Exec 有効化 | EcsServiceConstruct（Application Stack） |

### 5.3 参照した条件付き要件 🔵

| 要件ID | 条件 | 要件内容 | 対応実装 |
|--------|------|---------|---------|
| REQ-101 | Prod 環境 | 30日後に S3 Glacier 移管 | LogExportConstruct (glacierTransitionDays: 30) |
| REQ-102 | Dev 環境 | 3日後にログ削除 | LogGroupConstruct (retentionDays: 3) |
| REQ-103 | Alarm 発生時 | Slack 通知送信 | ChatbotConstruct |

### 5.4 参照した設計文書

| 文書 | 該当セクション |
|------|--------------|
| architecture.md | CDK Stack 構成、Stack 依存関係、各 Stack の責務 |
| dataflow.md | ログフロー、アラームフロー |
| interfaces.ts | EnvironmentConfig |

---

## 6. 実装対象 Construct 一覧

### 6.1 使用する既存 Construct 🔵

**信頼性**: 🔵 *TASK-0021〜0023 で実装済み*

| Construct | ファイルパス | 用途 |
|-----------|------------|------|
| LogGroupConstruct | `infra/lib/construct/monitoring/log-group-construct.ts` | ロググループ作成 |
| LogExportConstruct | `infra/lib/construct/monitoring/log-export-construct.ts` | S3 Glacier エクスポート |
| AlarmConstruct | `infra/lib/construct/monitoring/alarm-construct.ts` | CloudWatch Alarm |
| ChatbotConstruct | `infra/lib/construct/monitoring/chatbot-construct.ts` | Slack 連携 |
| CodeCommitConstruct | `infra/lib/construct/cicd/codecommit-construct.ts` | Git リポジトリ |
| CodeBuildConstruct | `infra/lib/construct/cicd/codebuild-construct.ts` | ビルドプロジェクト |
| CodePipelineConstruct | `infra/lib/construct/cicd/codepipeline-construct.ts` | CI/CD パイプライン |

### 6.2 Construct 統合順序 🔵

**信頼性**: 🔵 *Construct 間の依存関係より*

```
1. LogGroupConstruct 作成
   ↓
2. LogExportConstruct 作成（Prod のみ、LogGroups 依存）
   ↓
3. AlarmConstruct 作成（LogGroups 依存、SNS Topic 作成）
   ↓
4. ChatbotConstruct 作成（SNS Topic 依存）
   ↓
5. CodeCommitConstruct 作成
   ↓
6. CodeBuildConstruct 作成
   ↓
7. CodePipelineConstruct 作成（Repository, BuildProject, ECS 依存）
```

---

## 7. テスト要件サマリー

### 7.1 ユニットテスト要件 🔵

**信頼性**: 🔵 *TASK-0024 タスク定義より*

| テスト分類 | テスト内容 |
|-----------|----------|
| Stack 作成テスト | Ops Stack が作成されること |
| Construct 統合テスト | 各 Construct が正しく統合されること |
| 環境別設定テスト | Dev/Prod 設定が正しく適用されること |
| バリデーションテスト | 不正な Props でエラーが発生すること |
| スナップショットテスト | Dev/Prod 環境のスナップショットが一致すること |

### 7.2 統合テスト要件 🔵

**信頼性**: 🔵 *TASK-0024 タスク定義より*

| テスト分類 | テスト内容 |
|-----------|----------|
| 全 Stack Synth テスト | 全 6 Stack の CDK Synth が成功すること |
| Stack 間依存テスト | Stack 間の参照が正しく解決されること |
| 循環参照テスト | 循環参照が発生しないこと |

---

## 8. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 対象項目 |
|--------|------|------|----------|
| 🔵 青信号 | 28 | 93% | 要件定義書・設計文書・既存実装より |
| 🟡 黄信号 | 2 | 7% | AWS ベストプラクティスからの推測 |
| 🔴 赤信号 | 0 | 0% | なし |

**品質評価**: ✅ **高品質** - 全ての項目が要件定義書・設計文書・既存 Construct 実装により確認済み

---

## 9. 次のステップ

```
次のお勧めステップ: `/tsumiki:tdd-testcases aws-cdk-serverless-architecture TASK-0024` でテストケースの洗い出しを行います。
```
