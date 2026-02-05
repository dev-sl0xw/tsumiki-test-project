# CloudWatch Alarms + Chatbot Construct テストケース定義書

**作成日**: 2026-02-04
**タスクID**: TASK-0022
**フェーズ**: Phase 4 - 配信・運用
**関連要件定義**: [cloudwatch-alarms-requirements.md](cloudwatch-alarms-requirements.md)

---

## テスト概要

### テストファイル構成

| Construct | テストファイル |
|-----------|---------------|
| AlarmConstruct | `infra/test/construct/monitoring/alarm-construct.test.ts` |
| ChatbotConstruct | `infra/test/construct/monitoring/chatbot-construct.test.ts` |

### 開発言語・フレームワーク

| 項目 | 内容 | 信頼性 |
|------|------|--------|
| プログラミング言語 | TypeScript 5.x (strict mode) | 🔵 |
| テストフレームワーク | Jest 29.7.0 | 🔵 |
| CDK アサーション | aws-cdk-lib/assertions | 🔵 |
| カバレッジ目標 | Statements 80% 以上 | 🔵 |

---

## AlarmConstruct テストケース

### 1. スナップショットテスト

#### TC-ALARM-001: Dev 環境 CloudFormation テンプレートスナップショット

| 項目 | 内容 |
|------|------|
| **テスト名** | Dev 環境 CloudFormation テンプレートスナップショット |
| **テスト目的** | Dev 環境での Alarm リソース構成の変更を検出する |
| **入力値** | `envName: 'dev'`, `ecsClusterName: 'test-cluster'`, `ecsServiceNames: ['service']` |
| **期待される結果** | スナップショットと一致すること |
| **信頼性** | 🔵 既存テストパターンより |

#### TC-ALARM-002: Prod 環境 CloudFormation テンプレートスナップショット

| 項目 | 内容 |
|------|------|
| **テスト名** | Prod 環境 CloudFormation テンプレートスナップショット |
| **テスト目的** | Prod 環境での Alarm リソース構成の変更を検出する |
| **入力値** | `envName: 'prod'`, `ecsClusterName: 'prod-cluster'`, 全設定有効 |
| **期待される結果** | スナップショットと一致すること |
| **信頼性** | 🔵 既存テストパターンより |

---

### 2. リソース存在確認テスト

#### TC-ALARM-003: SNS Topic 作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | SNS Topic が 1 つ作成されること |
| **テスト目的** | アラーム通知用 SNS Topic の作成を確認 |
| **入力値** | 基本 Props |
| **期待される結果** | `AWS::SNS::Topic` リソースが 1 つ存在すること |
| **信頼性** | 🔵 FR-014 より |

#### TC-ALARM-004: KMS 暗号化キー作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | SNS Topic 暗号化用 KMS キーが作成されること |
| **テスト目的** | SNS Topic の KMS 暗号化設定を確認 |
| **入力値** | 基本 Props |
| **期待される結果** | `AWS::KMS::Key` リソースが存在し、KeyRotation が有効 |
| **信頼性** | 🔵 FR-016, FR-017 より |

#### TC-ALARM-005: ECS CPU Alarm 作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | ECS サービスごとに CPU Alarm が作成されること |
| **テスト目的** | ECS CPU 使用率監視 Alarm の作成を確認 |
| **入力値** | `ecsClusterName`, `ecsServiceNames: ['svc1', 'svc2']` |
| **期待される結果** | サービス数分の `AWS::CloudWatch::Alarm` が作成 |
| **信頼性** | 🔵 FR-001 より |

#### TC-ALARM-006: ECS Memory Alarm 作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | ECS サービスごとに Memory Alarm が作成されること |
| **テスト目的** | ECS Memory 使用率監視 Alarm の作成を確認 |
| **入力値** | `ecsClusterName`, `ecsServiceNames: ['svc1', 'svc2']` |
| **期待される結果** | サービス数分の `AWS::CloudWatch::Alarm` が作成 |
| **信頼性** | 🔵 FR-002 より |

#### TC-ALARM-007: Metric Filter 作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Log Group ごとに Metric Filter が作成されること |
| **テスト目的** | エラーパターン検出用 Metric Filter の作成を確認 |
| **入力値** | `logGroups: [logGroup1, logGroup2]` |
| **期待される結果** | Log Group 数分の `AWS::Logs::MetricFilter` が作成 |
| **信頼性** | 🔵 FR-008 より |

#### TC-ALARM-008: Error Alarm 作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Log Group ごとに Error Alarm が作成されること |
| **テスト目的** | Metric Filter に基づく Error Alarm の作成を確認 |
| **入力値** | `logGroups: [logGroup1, logGroup2]` |
| **期待される結果** | Log Group 数分の Error Alarm が作成 |
| **信頼性** | 🔵 FR-011 より |

---

### 3. プロパティ検証テスト

#### TC-ALARM-009: CPU Alarm 閾値確認 (デフォルト 80%)

| 項目 | 内容 |
|------|------|
| **テスト名** | CPU Alarm 閾値がデフォルト 80% であること |
| **テスト目的** | CPU Alarm の閾値設定を確認 |
| **入力値** | `cpuThreshold` 未指定 |
| **期待される結果** | `Threshold: 80` が設定されること |
| **信頼性** | 🔵 FR-003 より |

#### TC-ALARM-010: CPU Alarm 閾値カスタマイズ確認

| 項目 | 内容 |
|------|------|
| **テスト名** | CPU Alarm 閾値がカスタマイズ可能であること |
| **テスト目的** | CPU Alarm の閾値設定のカスタマイズを確認 |
| **入力値** | `cpuThreshold: 70` |
| **期待される結果** | `Threshold: 70` が設定されること |
| **信頼性** | 🟡 FR-029 より |

#### TC-ALARM-011: Memory Alarm 閾値確認 (デフォルト 80%)

| 項目 | 内容 |
|------|------|
| **テスト名** | Memory Alarm 閾値がデフォルト 80% であること |
| **テスト目的** | Memory Alarm の閾値設定を確認 |
| **入力値** | `memoryThreshold` 未指定 |
| **期待される結果** | `Threshold: 80` が設定されること |
| **信頼性** | 🔵 FR-004 より |

#### TC-ALARM-012: Memory Alarm 閾値カスタマイズ確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Memory Alarm 閾値がカスタマイズ可能であること |
| **テスト目的** | Memory Alarm の閾値設定のカスタマイズを確認 |
| **入力値** | `memoryThreshold: 90` |
| **期待される結果** | `Threshold: 90` が設定されること |
| **信頼性** | 🟡 FR-030 より |

#### TC-ALARM-013: Alarm 評価期間確認 (5分)

| 項目 | 内容 |
|------|------|
| **テスト名** | Alarm 評価期間がデフォルト 5 分であること |
| **テスト目的** | Alarm の Period 設定を確認 |
| **入力値** | `evaluationPeriods` 未指定 |
| **期待される結果** | `Period: 300` (5分 = 300秒) が設定されること |
| **信頼性** | 🟡 FR-005 より |

#### TC-ALARM-014: Alarm データポイント確認 (3回)

| 項目 | 内容 |
|------|------|
| **テスト名** | Alarm トリガーがデフォルト 3 回連続であること |
| **テスト目的** | Alarm の DatapointsToAlarm 設定を確認 |
| **入力値** | `datapointsToAlarm` 未指定 |
| **期待される結果** | `DatapointsToAlarm: 3`, `EvaluationPeriods: 3` が設定 |
| **信頼性** | 🟡 FR-006 より |

#### TC-ALARM-015: Error Alarm 閾値確認 (1件以上)

| 項目 | 内容 |
|------|------|
| **テスト名** | Error Alarm 閾値が 1 件以上であること |
| **テスト目的** | Error Alarm の閾値設定を確認 |
| **入力値** | `logGroups` 指定 |
| **期待される結果** | `Threshold: 1`, `ComparisonOperator: GreaterThanOrEqualToThreshold` |
| **信頼性** | 🔵 FR-012 より |

#### TC-ALARM-016: Alarm SNS アクション確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Alarm 発生時に SNS Topic に通知されること |
| **テスト目的** | Alarm の AlarmActions 設定を確認 |
| **入力値** | 基本 Props |
| **期待される結果** | `AlarmActions` に SNS Topic ARN が含まれること |
| **信頼性** | 🔵 FR-007, FR-013 より |

#### TC-ALARM-017: Metric Filter パターン確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Metric Filter が ERROR/Exception パターンを検出すること |
| **テスト目的** | Metric Filter の FilterPattern 設定を確認 |
| **入力値** | `logGroups` 指定 |
| **期待される結果** | FilterPattern に ERROR, Exception が含まれること |
| **信頼性** | 🔵 FR-009, 🟡 FR-010 より |

---

### 4. 公開プロパティ確認テスト

#### TC-ALARM-018: alarmTopic プロパティ確認

| 項目 | 内容 |
|------|------|
| **テスト名** | alarmTopic プロパティが SNS Topic を返すこと |
| **テスト目的** | 公開プロパティ `alarmTopic` の型と値を確認 |
| **入力値** | 基本 Props |
| **期待される結果** | `sns.ITopic` インスタンスが返されること |
| **信頼性** | 🔵 要件定義より |

#### TC-ALARM-019: cpuAlarms プロパティ確認

| 項目 | 内容 |
|------|------|
| **テスト名** | cpuAlarms プロパティが Alarm 配列を返すこと |
| **テスト目的** | 公開プロパティ `cpuAlarms` の型と値を確認 |
| **入力値** | `ecsServiceNames: ['svc1', 'svc2']` |
| **期待される結果** | 2 つの `cloudwatch.IAlarm` を含む配列 |
| **信頼性** | 🔵 要件定義より |

#### TC-ALARM-020: memoryAlarms プロパティ確認

| 項目 | 内容 |
|------|------|
| **テスト名** | memoryAlarms プロパティが Alarm 配列を返すこと |
| **テスト目的** | 公開プロパティ `memoryAlarms` の型と値を確認 |
| **入力値** | `ecsServiceNames: ['svc1', 'svc2']` |
| **期待される結果** | 2 つの `cloudwatch.IAlarm` を含む配列 |
| **信頼性** | 🔵 要件定義より |

#### TC-ALARM-021: errorAlarms プロパティ確認

| 項目 | 内容 |
|------|------|
| **テスト名** | errorAlarms プロパティが Alarm 配列を返すこと |
| **テスト目的** | 公開プロパティ `errorAlarms` の型と値を確認 |
| **入力値** | `logGroups: [logGroup1]` |
| **期待される結果** | 1 つの `cloudwatch.IAlarm` を含む配列 |
| **信頼性** | 🔵 要件定義より |

#### TC-ALARM-022: allAlarms プロパティ確認

| 項目 | 内容 |
|------|------|
| **テスト名** | allAlarms プロパティが全 Alarm を返すこと |
| **テスト目的** | 公開プロパティ `allAlarms` の集約を確認 |
| **入力値** | ECS + Log Groups 設定 |
| **期待される結果** | CPU + Memory + Error Alarms の合計数 |
| **信頼性** | 🟡 設計仕様より |

---

### 5. 条件付きリソース作成テスト

#### TC-ALARM-023: ECS 設定なしで ECS Alarm が作成されないこと

| 項目 | 内容 |
|------|------|
| **テスト名** | ECS クラスター/サービス未指定時に ECS Alarm が作成されない |
| **テスト目的** | 条件付きリソース作成の動作を確認 |
| **入力値** | `ecsClusterName`, `ecsServiceNames` 未指定 |
| **期待される結果** | `cpuAlarms.length === 0`, `memoryAlarms.length === 0` |
| **信頼性** | 🟡 設計仕様より |

#### TC-ALARM-024: Log Groups なしで Error Alarm が作成されないこと

| 項目 | 内容 |
|------|------|
| **テスト名** | logGroups 未指定時に Error Alarm が作成されない |
| **テスト目的** | 条件付きリソース作成の動作を確認 |
| **入力値** | `logGroups` 未指定 |
| **期待される結果** | `errorAlarms.length === 0` |
| **信頼性** | 🟡 設計仕様より |

#### TC-ALARM-025: 全オプション未指定でも SNS Topic は作成されること

| 項目 | 内容 |
|------|------|
| **テスト名** | 最小構成でも SNS Topic が作成されること |
| **テスト目的** | 必須リソースの作成を確認 |
| **入力値** | `envName`, `config` のみ |
| **期待される結果** | `AWS::SNS::Topic` が 1 つ存在 |
| **信頼性** | 🔵 FR-014 より |

---

### 6. 異常系テスト

#### TC-ALARM-026: envName 空文字でエラー

| 項目 | 内容 |
|------|------|
| **テスト名** | envName が空文字の場合エラーが発生すること |
| **テスト目的** | 入力バリデーションの動作を確認 |
| **入力値** | `envName: ''` |
| **期待される結果** | エラーがスローされること |
| **信頼性** | 🟡 既存パターンより |

#### TC-ALARM-027: cpuThreshold 範囲外でエラー

| 項目 | 内容 |
|------|------|
| **テスト名** | cpuThreshold が 0 以下または 100 超の場合エラー |
| **テスト目的** | 閾値バリデーションの動作を確認 |
| **入力値** | `cpuThreshold: 0` または `cpuThreshold: 101` |
| **期待される結果** | エラーがスローされること |
| **信頼性** | 🟡 設計仕様より |

#### TC-ALARM-028: memoryThreshold 範囲外でエラー

| 項目 | 内容 |
|------|------|
| **テスト名** | memoryThreshold が 0 以下または 100 超の場合エラー |
| **テスト目的** | 閾値バリデーションの動作を確認 |
| **入力値** | `memoryThreshold: 0` または `memoryThreshold: 101` |
| **期待される結果** | エラーがスローされること |
| **信頼性** | 🟡 設計仕様より |

---

## ChatbotConstruct テストケース

### 1. スナップショットテスト

#### TC-CHATBOT-001: Chatbot 有効時テンプレートスナップショット

| 項目 | 内容 |
|------|------|
| **テスト名** | Chatbot 有効時 CloudFormation テンプレートスナップショット |
| **テスト目的** | Chatbot リソース構成の変更を検出する |
| **入力値** | 全 Slack 設定有効 |
| **期待される結果** | スナップショットと一致すること |
| **信頼性** | 🔵 既存テストパターンより |

#### TC-CHATBOT-002: Chatbot 無効時テンプレートスナップショット

| 項目 | 内容 |
|------|------|
| **テスト名** | Chatbot 無効時 CloudFormation テンプレートスナップショット |
| **テスト目的** | Chatbot 無効時のリソース構成を確認 |
| **入力値** | Slack ID 未指定 |
| **期待される結果** | スナップショットと一致（Chatbot リソースなし） |
| **信頼性** | 🟡 設計仕様より |

---

### 2. リソース存在確認テスト

#### TC-CHATBOT-003: Slack Channel Configuration 作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | SlackChannelConfiguration が作成されること |
| **テスト目的** | Chatbot リソースの作成を確認 |
| **入力値** | `slackWorkspaceId`, `slackChannelId` 指定 |
| **期待される結果** | `AWS::Chatbot::SlackChannelConfiguration` が存在 |
| **信頼性** | 🔵 FR-018 より |

#### TC-CHATBOT-004: Chatbot IAM Role 作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Chatbot 用 IAM Role が作成されること |
| **テスト目的** | Chatbot IAM Role の作成を確認 |
| **入力値** | 全 Slack 設定有効 |
| **期待される結果** | `AWS::IAM::Role` が存在 |
| **信頼性** | 🔵 FR-022 より |

#### TC-CHATBOT-005: Slack ID 未指定時 Chatbot 未作成確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Slack ID 未指定時に Chatbot が作成されないこと |
| **テスト目的** | 条件付きリソース作成の動作を確認 |
| **入力値** | `slackWorkspaceId`, `slackChannelId` 未指定 |
| **期待される結果** | `AWS::Chatbot::SlackChannelConfiguration` が 0 |
| **信頼性** | 🟡 NFR-008 より |

---

### 3. プロパティ検証テスト

#### TC-CHATBOT-006: Slack Workspace ID 設定確認

| 項目 | 内容 |
|------|------|
| **テスト名** | SlackWorkspaceId が正しく設定されること |
| **テスト目的** | Chatbot の Slack 連携設定を確認 |
| **入力値** | `slackWorkspaceId: 'T12345678'` |
| **期待される結果** | `SlackWorkspaceId: 'T12345678'` が設定 |
| **信頼性** | 🔵 FR-019 より |

#### TC-CHATBOT-007: Slack Channel ID 設定確認

| 項目 | 内容 |
|------|------|
| **テスト名** | SlackChannelId が正しく設定されること |
| **テスト目的** | Chatbot の Slack 連携設定を確認 |
| **入力値** | `slackChannelId: 'C12345678'` |
| **期待される結果** | `SlackChannelId: 'C12345678'` が設定 |
| **信頼性** | 🔵 FR-020 より |

#### TC-CHATBOT-008: SNS Topic 購読確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Chatbot が SNS Topic を購読すること |
| **テスト目的** | Chatbot と SNS Topic の連携を確認 |
| **入力値** | `snsTopics: [topic]` |
| **期待される結果** | `SnsTopicArns` に Topic ARN が含まれること |
| **信頼性** | 🔵 FR-021 より |

#### TC-CHATBOT-009: Chatbot Role CloudWatch 権限確認

| 項目 | 内容 |
|------|------|
| **テスト名** | Chatbot Role に CloudWatch 読み取り権限があること |
| **テスト目的** | IAM Role のポリシーを確認 |
| **入力値** | 全 Slack 設定有効 |
| **期待される結果** | CloudWatch 読み取り権限が付与されていること |
| **信頼性** | 🟡 FR-023 より |

---

### 4. 公開プロパティ確認テスト

#### TC-CHATBOT-010: slackChannelConfiguration プロパティ確認

| 項目 | 内容 |
|------|------|
| **テスト名** | slackChannelConfiguration が設定を返すこと |
| **テスト目的** | 公開プロパティの型と値を確認 |
| **入力値** | 全 Slack 設定有効 |
| **期待される結果** | `SlackChannelConfiguration` インスタンスが返る |
| **信頼性** | 🔵 要件定義より |

#### TC-CHATBOT-011: slackChannelConfiguration 未設定時 undefined

| 項目 | 内容 |
|------|------|
| **テスト名** | Slack 未設定時に undefined が返ること |
| **テスト目的** | 条件付きプロパティの動作を確認 |
| **入力値** | Slack ID 未指定 |
| **期待される結果** | `slackChannelConfiguration === undefined` |
| **信頼性** | 🟡 設計仕様より |

#### TC-CHATBOT-012: isChatbotEnabled プロパティ確認 (有効時)

| 項目 | 内容 |
|------|------|
| **テスト名** | Chatbot 有効時に isChatbotEnabled が true を返すこと |
| **テスト目的** | 有効化フラグの動作を確認 |
| **入力値** | 全 Slack 設定有効 |
| **期待される結果** | `isChatbotEnabled === true` |
| **信頼性** | 🟡 設計仕様より |

#### TC-CHATBOT-013: isChatbotEnabled プロパティ確認 (無効時)

| 項目 | 内容 |
|------|------|
| **テスト名** | Chatbot 無効時に isChatbotEnabled が false を返すこと |
| **テスト目的** | 有効化フラグの動作を確認 |
| **入力値** | Slack ID 未指定 |
| **期待される結果** | `isChatbotEnabled === false` |
| **信頼性** | 🟡 設計仕様より |

---

### 5. 異常系テスト

#### TC-CHATBOT-014: snsTopics 空配列でエラー

| 項目 | 内容 |
|------|------|
| **テスト名** | snsTopics が空配列の場合エラーが発生すること |
| **テスト目的** | 入力バリデーションの動作を確認 |
| **入力値** | `snsTopics: []` |
| **期待される結果** | エラーがスローされること |
| **信頼性** | 🟡 設計仕様より |

#### TC-CHATBOT-015: Workspace ID のみ指定でエラー

| 項目 | 内容 |
|------|------|
| **テスト名** | slackWorkspaceId のみ指定の場合エラー |
| **テスト目的** | Slack 設定の一貫性チェック |
| **入力値** | `slackWorkspaceId` のみ、`slackChannelId` なし |
| **期待される結果** | エラーがスローされること |
| **信頼性** | 🟡 設計仕様より |

#### TC-CHATBOT-016: Channel ID のみ指定でエラー

| 項目 | 内容 |
|------|------|
| **テスト名** | slackChannelId のみ指定の場合エラー |
| **テスト目的** | Slack 設定の一貫性チェック |
| **入力値** | `slackChannelId` のみ、`slackWorkspaceId` なし |
| **期待される結果** | エラーがスローされること |
| **信頼性** | 🟡 設計仕様より |

---

## テストケースサマリー

### AlarmConstruct

| カテゴリ | テスト数 | 信頼性 🔵 | 信頼性 🟡 |
|----------|----------|-----------|-----------|
| スナップショット | 2 | 2 | 0 |
| リソース存在確認 | 6 | 6 | 0 |
| プロパティ検証 | 9 | 5 | 4 |
| 公開プロパティ | 5 | 4 | 1 |
| 条件付きリソース | 3 | 1 | 2 |
| 異常系 | 3 | 0 | 3 |
| **小計** | **28** | **18** | **10** |

### ChatbotConstruct

| カテゴリ | テスト数 | 信頼性 🔵 | 信頼性 🟡 |
|----------|----------|-----------|-----------|
| スナップショット | 2 | 1 | 1 |
| リソース存在確認 | 3 | 2 | 1 |
| プロパティ検証 | 4 | 3 | 1 |
| 公開プロパティ | 4 | 1 | 3 |
| 異常系 | 3 | 0 | 3 |
| **小計** | **16** | **7** | **9** |

### 合計

| 項目 | 値 |
|------|-----|
| **総テストケース数** | 44 |
| **🔵 青信号** | 25 (57%) |
| **🟡 黄信号** | 19 (43%) |
| **🔴 赤信号** | 0 (0%) |

---

## 品質評価

**✅ 高品質**

- **テストケース分類**: 正常系・異常系・境界値が網羅されている
- **期待値定義**: 各テストケースの期待値が明確
- **技術選択**: Jest + aws-cdk-lib/assertions で確定
- **実装可能性**: 既存パターン（TASK-0021）を参考に実現可能

---

*このテストケース定義書は TDD 開発のテストケース洗い出しフェーズで作成されました*
