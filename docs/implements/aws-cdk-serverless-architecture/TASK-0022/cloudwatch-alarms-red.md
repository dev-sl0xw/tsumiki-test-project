# CloudWatch Alarms + Chatbot Construct Red Phase 記録

**作成日**: 2026-02-05
**タスクID**: TASK-0022
**フェーズ**: TDD Red Phase - 失敗するテストケースの作成

---

## 作成したテストファイル

### 1. AlarmConstruct テスト

**ファイル**: `infra/test/construct/monitoring/alarm-construct.test.ts`

| カテゴリ | テストケース数 |
|----------|---------------|
| スナップショットテスト | 2 |
| リソース存在確認テスト | 6 |
| プロパティ検証テスト | 9 |
| 公開プロパティ確認テスト | 5 |
| 条件付きリソース作成テスト | 3 |
| 異常系テスト | 3 |
| **合計** | **28** |

### 2. ChatbotConstruct テスト

**ファイル**: `infra/test/construct/monitoring/chatbot-construct.test.ts`

| カテゴリ | テストケース数 |
|----------|---------------|
| スナップショットテスト | 2 |
| リソース存在確認テスト | 3 |
| プロパティ検証テスト | 4 |
| 公開プロパティ確認テスト | 4 |
| 異常系テスト | 3 |
| **合計** | **16** |

---

## テスト実行結果

```
FAIL test/construct/monitoring/chatbot-construct.test.ts
  ● Test suite failed to run
    error TS2307: Cannot find module '../../../lib/construct/monitoring/chatbot-construct'

FAIL test/construct/monitoring/alarm-construct.test.ts
  ● Test suite failed to run
    error TS2307: Cannot find module '../../../lib/construct/monitoring/alarm-construct'

Test Suites: 2 failed, 2 total
Tests:       0 total
```

**失敗理由**: 実装ファイルが存在しないため、モジュールのインポートに失敗

---

## 次のステップ (Green Phase)

### 作成すべきファイル

1. **AlarmConstruct**: `infra/lib/construct/monitoring/alarm-construct.ts`
   - AlarmConstructProps インターフェース
   - AlarmConstruct クラス
   - SNS Topic (KMS 暗号化)
   - ECS CPU/Memory Alarm
   - Metric Filter + Error Alarm

2. **ChatbotConstruct**: `infra/lib/construct/monitoring/chatbot-construct.ts`
   - ChatbotConstructProps インターフェース
   - ChatbotConstruct クラス
   - Slack Channel Configuration
   - IAM Role with CloudWatch 権限

### Green Phase 実行コマンド

```bash
/tsumiki:tdd-green aws-cdk-serverless-architecture TASK-0022
```

---

## テストケース信頼性サマリー

| レベル | AlarmConstruct | ChatbotConstruct | 合計 |
|--------|----------------|------------------|------|
| 🔵 青信号 | 18 | 7 | 25 |
| 🟡 黄信号 | 10 | 9 | 19 |
| **合計** | 28 | 16 | 44 |

---

*この記録は TDD 開発の Red Phase で作成されました*
