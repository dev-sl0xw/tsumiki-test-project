# CloudWatch Alarms + Chatbot Construct 詳細要件定義書

**作成日**: 2026-02-04
**タスクID**: TASK-0022
**フェーズ**: Phase 4 - 配信・運用
**関連タスクノート**: [note.md](note.md)

---

## 1. 機能要件 (Functional Requirements)

### 1.1 ECS CPU/Memory Alarms (REQ-039)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-001 | システムは ECS Service の CPU 使用率を監視する Alarm を作成しなければならない | 🔵 | 設計文書・ユーザヒアリング |
| FR-002 | システムは ECS Service の Memory 使用率を監視する Alarm を作成しなければならない | 🔵 | 設計文書・ユーザヒアリング |
| FR-003 | システムは CPU Alarm の閾値をデフォルト 80% に設定しなければならない | 🔵 | 設計文書より |
| FR-004 | システムは Memory Alarm の閾値をデフォルト 80% に設定しなければならない | 🔵 | 設計文書より |
| FR-005 | システムは Alarm の評価期間を 5 分に設定しなければならない | 🟡 | CloudWatch ベストプラクティス |
| FR-006 | システムは Alarm が 3 回連続で閾値超過した場合にトリガーしなければならない | 🟡 | CloudWatch ベストプラクティス |
| FR-007 | システムは Alarm 発生時に SNS Topic に通知しなければならない | 🔵 | REQ-039 |

### 1.2 CloudWatch Logs Error Alarm (REQ-039)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-008 | システムは CloudWatch Logs のエラーパターンを検出する Metric Filter を作成しなければならない | 🔵 | 設計文書より |
| FR-009 | システムは "ERROR" パターンを含むログを検出しなければならない | 🔵 | 設計文書より |
| FR-010 | システムは "Exception" パターンを含むログを検出しなければならない | 🟡 | Java/TypeScript 標準パターン |
| FR-011 | システムは Metric Filter に基づく Alarm を作成しなければならない | 🔵 | 設計文書より |
| FR-012 | システムは Error Alarm の閾値を 1 件以上に設定しなければならない | 🔵 | 設計文書より |
| FR-013 | システムは Error Alarm 発生時に SNS Topic に通知しなければならない | 🔵 | REQ-039 |

### 1.3 SNS Topic (REQ-039)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-014 | システムはアラーム通知用の SNS Topic を作成しなければならない | 🔵 | REQ-039 |
| FR-015 | システムは SNS Topic 名を `{env-name}-alarm-notifications` 形式で作成しなければならない | 🟡 | 命名規則から推測 |
| FR-016 | システムは SNS Topic を KMS で暗号化しなければならない | 🔵 | セキュリティベストプラクティス |
| FR-017 | システムは暗号化用 KMS キーのキーローテーションを有効化しなければならない | 🔵 | セキュリティベストプラクティス |

### 1.4 AWS Chatbot 連携 (REQ-039, REQ-103)

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-018 | システムは AWS Chatbot Slack Channel Configuration を作成しなければならない | 🔵 | REQ-039, REQ-103 |
| FR-019 | システムは Slack Workspace ID をパラメータから取得しなければならない | 🔵 | 設計文書・parameter.ts |
| FR-020 | システムは Slack Channel ID をパラメータから取得しなければならない | 🔵 | 設計文書・parameter.ts |
| FR-021 | システムは Chatbot が SNS Topic を購読するよう設定しなければならない | 🔵 | REQ-039 |
| FR-022 | システムは Chatbot 用の IAM Role を作成しなければならない | 🔵 | AWS Chatbot 要件 |
| FR-023 | システムは Chatbot が CloudWatch へのアクセス権限を持つよう設定しなければならない | 🟡 | AWS Chatbot ベストプラクティス |

### 1.5 Props インターフェース

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| FR-024 | システムは envName パラメータ ('dev' | 'prod') を必須とする Props を定義しなければならない | 🔵 | REQ-042 |
| FR-025 | システムは config (EnvironmentConfig) パラメータを必須とする Props を定義しなければならない | 🔵 | 設計文書 |
| FR-026 | システムは ecsClusterName パラメータをオプションとする Props を定義しなければならない | 🟡 | ECS Alarm 用 |
| FR-027 | システムは ecsServiceNames パラメータをオプションとする Props を定義しなければならない | 🟡 | ECS Alarm 用 |
| FR-028 | システムは logGroups パラメータをオプションとする Props を定義しなければならない | 🟡 | Error Alarm 用 |
| FR-029 | システムは cpuThreshold パラメータをオプション (デフォルト 80) とする Props を定義しなければならない | 🟡 | 設計仕様 |
| FR-030 | システムは memoryThreshold パラメータをオプション (デフォルト 80) とする Props を定義しなければならない | 🟡 | 設計仕様 |

---

## 2. 非機能要件 (Non-Functional Requirements)

### 2.1 セキュリティ

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| NFR-001 | システムは SNS Topic を KMS 暗号化しなければならない | 🔵 | セキュリティベストプラクティス |
| NFR-002 | システムは IAM Role に最小権限の原則を適用しなければならない | 🔵 | セキュリティベストプラクティス |
| NFR-003 | システムは Chatbot Role に必要最小限の CloudWatch 読み取り権限のみを付与しなければならない | 🟡 | 最小権限原則 |

### 2.2 運用性

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| NFR-004 | システムは Alarm 名を識別しやすい形式で設定しなければならない | 🟡 | 運用ベストプラクティス |
| NFR-005 | システムは Alarm の説明を日本語で記述しなければならない | 🟡 | プロジェクト規約 |
| NFR-006 | システムは Slack 通知に CloudWatch コンソールへのリンクを含めなければならない | 🔵 | 設計文書 |

### 2.3 可用性

| ID | 要件 | 信頼性 | 根拠 |
|----|------|--------|------|
| NFR-007 | システムは Chatbot 設定が環境パラメータなしでもエラーにならないようにしなければならない | 🟡 | 設計仕様 |
| NFR-008 | システムは Slack Workspace/Channel ID が空の場合 Chatbot を作成しないオプションを提供しなければならない | 🟡 | 設計仕様 |

---

## 3. 入出力仕様

### 3.1 AlarmConstruct Props インターフェース

```typescript
export interface AlarmConstructProps {
  /**
   * 環境名 (必須)
   * 🔵 信頼性: REQ-042 より
   */
  readonly envName: 'dev' | 'prod';

  /**
   * 環境設定 (必須)
   * 🔵 信頼性: 設計文書より
   */
  readonly config: EnvironmentConfig;

  /**
   * ECS クラスター名 (オプション)
   * 🟡 信頼性: ECS Alarm 用 - 設計仕様
   */
  readonly ecsClusterName?: string;

  /**
   * ECS サービス名配列 (オプション)
   * 🟡 信頼性: ECS Alarm 用 - 設計仕様
   */
  readonly ecsServiceNames?: string[];

  /**
   * Log Groups (オプション)
   * 🟡 信頼性: Error Alarm 用 - 設計仕様
   */
  readonly logGroups?: logs.ILogGroup[];

  /**
   * CPU 使用率閾値 (オプション、デフォルト 80)
   * 🔵 信頼性: 設計文書より
   */
  readonly cpuThreshold?: number;

  /**
   * Memory 使用率閾値 (オプション、デフォルト 80)
   * 🔵 信頼性: 設計文書より
   */
  readonly memoryThreshold?: number;

  /**
   * 評価期間（分）(オプション、デフォルト 5)
   * 🟡 信頼性: CloudWatch ベストプラクティス
   */
  readonly evaluationPeriods?: number;

  /**
   * データポイント数 (オプション、デフォルト 3)
   * 🟡 信頼性: CloudWatch ベストプラクティス
   */
  readonly datapointsToAlarm?: number;
}
```

### 3.2 ChatbotConstruct Props インターフェース

```typescript
export interface ChatbotConstructProps {
  /**
   * 環境名 (必須)
   * 🔵 信頼性: REQ-042 より
   */
  readonly envName: 'dev' | 'prod';

  /**
   * SNS Topics (必須)
   * 🔵 信頼性: REQ-039 より
   */
  readonly snsTopics: sns.ITopic[];

  /**
   * Slack Workspace ID (オプション)
   * 🔵 信頼性: 設計文書・parameter.ts より
   */
  readonly slackWorkspaceId?: string;

  /**
   * Slack Channel ID (オプション)
   * 🔵 信頼性: 設計文書・parameter.ts より
   */
  readonly slackChannelId?: string;

  /**
   * Chatbot 有効化フラグ (オプション、デフォルト true)
   * 🟡 信頼性: 設計仕様
   */
  readonly enableChatbot?: boolean;
}
```

### 3.3 公開プロパティ

#### AlarmConstruct

| プロパティ | 型 | 説明 | 信頼性 |
|-----------|-----|------|--------|
| `alarmTopic` | `sns.ITopic` | アラーム通知用 SNS Topic | 🔵 |
| `cpuAlarms` | `cloudwatch.IAlarm[]` | CPU 使用率 Alarm 配列 | 🔵 |
| `memoryAlarms` | `cloudwatch.IAlarm[]` | Memory 使用率 Alarm 配列 | 🔵 |
| `errorAlarms` | `cloudwatch.IAlarm[]` | エラーパターン Alarm 配列 | 🔵 |
| `allAlarms` | `cloudwatch.IAlarm[]` | 全 Alarm 配列 | 🟡 |

#### ChatbotConstruct

| プロパティ | 型 | 説明 | 信頼性 |
|-----------|-----|------|--------|
| `slackChannelConfiguration` | `chatbot.SlackChannelConfiguration \| undefined` | Chatbot 設定（未設定時 undefined） | 🔵 |
| `chatbotRole` | `iam.IRole \| undefined` | Chatbot IAM Role | 🔵 |
| `isChatbotEnabled` | `boolean` | Chatbot 有効化状態 | 🟡 |

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン

```typescript
// 🔵 信頼性: 設計文書・REQ-039 より
const alarmConstruct = new AlarmConstruct(this, 'Alarm', {
  envName: 'prod',
  config: prodConfig,
  ecsClusterName: 'my-cluster',
  ecsServiceNames: ['frontend-service', 'backend-service'],
  logGroups: [frontendLogGroup, backendLogGroup],
});

const chatbotConstruct = new ChatbotConstruct(this, 'Chatbot', {
  envName: 'prod',
  snsTopics: [alarmConstruct.alarmTopic],
  slackWorkspaceId: prodConfig.slackWorkspaceId,
  slackChannelId: prodConfig.slackChannelId,
});
```

### 4.2 エッジケース

#### 4.2.1 Slack 設定なしの場合

```typescript
// 🟡 信頼性: 設計仕様より - Chatbot は作成されない
const chatbotConstruct = new ChatbotConstruct(this, 'Chatbot', {
  envName: 'dev',
  snsTopics: [alarmConstruct.alarmTopic],
  // slackWorkspaceId, slackChannelId 未指定
});
// chatbotConstruct.isChatbotEnabled === false
```

#### 4.2.2 ECS サービスなしの場合

```typescript
// 🟡 信頼性: 設計仕様より - ECS Alarm は作成されない
const alarmConstruct = new AlarmConstruct(this, 'Alarm', {
  envName: 'prod',
  config: prodConfig,
  // ecsClusterName, ecsServiceNames 未指定
  logGroups: [logGroup],
});
// alarmConstruct.cpuAlarms.length === 0
// alarmConstruct.memoryAlarms.length === 0
```

#### 4.2.3 Log Groups なしの場合

```typescript
// 🟡 信頼性: 設計仕様より - Error Alarm は作成されない
const alarmConstruct = new AlarmConstruct(this, 'Alarm', {
  envName: 'prod',
  config: prodConfig,
  ecsClusterName: 'my-cluster',
  ecsServiceNames: ['service'],
  // logGroups 未指定
});
// alarmConstruct.errorAlarms.length === 0
```

---

## 5. EARS要件・設計文書との対応関係

### 5.1 参照した機能要件

| 要件ID | 要件内容 | 対応する機能 |
|--------|----------|--------------|
| REQ-039 | CloudWatch Alarm 発生時に AWS Chatbot を通じて Slack に通知しなければならない | Chatbot 連携、SNS 通知 |
| REQ-103 | CloudWatch Alarm が発生した場合、システムは Slack に通知を送信しなければならない | アラーム → SNS → Chatbot → Slack |

### 5.2 参照した非機能要件

| 要件ID | 要件内容 | 対応する機能 |
|--------|----------|--------------|
| NFR-301 | Container Insights を有効化してモニタリング可能にしなければならない | ECS Alarm メトリクス |

### 5.3 参照した設計文書

| セクション | 内容 | 対応 |
|-----------|------|------|
| architecture.md - CloudWatch Alarms | ECS CPU/Memory 閾値 80%、Error Pattern | AlarmConstruct 実装 |
| architecture.md - parameter.ts | slackWorkspaceId, slackChannelId | ChatbotConstruct Props |
| architecture.md - Stack 構成 | Ops Stack 責務 | 本 Construct の位置づけ |

---

## 6. 実装ファイル

| カテゴリ | ファイルパス |
|----------|-------------|
| AlarmConstruct | `infra/lib/construct/monitoring/alarm-construct.ts` |
| ChatbotConstruct | `infra/lib/construct/monitoring/chatbot-construct.ts` |
| テスト (Alarm) | `infra/test/construct/monitoring/alarm-construct.test.ts` |
| テスト (Chatbot) | `infra/test/construct/monitoring/chatbot-construct.test.ts` |

---

## 7. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 26 | 68% |
| 🟡 黄信号 | 12 | 32% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質 - 要件の大部分が要件定義書・設計文書により確認済み

---

*この要件定義書は TDD 開発の要件整理フェーズで作成されました*
