# TASK-0024 開発コンテキストノート

**タスクID**: TASK-0024
**機能名**: Ops Stack 統合 + 最終統合テスト
**作成日**: 2026-02-05

---

## 技術スタック

### 使用技術

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| IaC | AWS CDK | v2.x |
| 言語 | TypeScript | 5.x |
| テスト | Jest | 29.x |
| AWS | CloudWatch, SNS, Chatbot, CodePipeline | - |

### アーキテクチャパターン

- **Stack 分離パターン**: 機能別に Stack を分離（6 Stack 構成）
- **Construct パターン**: 再利用可能な Construct を組み合わせ
- **環境分離パターン**: parameter.ts による Dev/Prod 設定切り替え

---

## 開発ルール

### コーディング規約

- ESLint + Prettier による自動フォーマット
- 型定義は明示的に（any 禁止）
- Construct Props は Interface で定義

### テスト要件

- **カバレッジ目標**: 60% 以上
- **スナップショットテスト**: 必須
- **統合テスト**: 全 Stack の CDK Synth 成功確認

### 命名規則

| 対象 | パターン | 例 |
|------|---------|-----|
| Stack クラス | PascalCase + Stack | OpsStack |
| Construct クラス | PascalCase + Construct | LogGroupConstruct |
| Props Interface | クラス名 + Props | OpsStackProps |
| 定数 | UPPER_SNAKE_CASE | DEFAULT_LOG_RETENTION |
| テストファイル | *.test.ts | ops-stack.test.ts |

---

## 関連実装

### 既存 Construct（再利用対象）

#### Monitoring Constructs

| Construct | ファイル | Props |
|-----------|---------|-------|
| LogGroupConstruct | `infra/lib/construct/monitoring/log-group-construct.ts` | envName, retentionDays, enableEncryption |
| LogExportConstruct | `infra/lib/construct/monitoring/log-export-construct.ts` | envName, enableExport, logGroups, glacierTransitionDays |
| AlarmConstruct | `infra/lib/construct/monitoring/alarm-construct.ts` | envName, ecsClusterName, ecsServiceNames, logGroups, config |
| ChatbotConstruct | `infra/lib/construct/monitoring/chatbot-construct.ts` | envName, slackWorkspaceId, slackChannelId, snsTopics |

#### CI/CD Constructs

| Construct | ファイル | Props |
|-----------|---------|-------|
| CodeCommitConstruct | `infra/lib/construct/cicd/codecommit-construct.ts` | repositoryName, description |
| CodeBuildConstruct | `infra/lib/construct/cicd/codebuild-construct.ts` | projectName, ecrRepository |
| CodePipelineConstruct | `infra/lib/construct/cicd/codepipeline-construct.ts` | pipelineName, repository, buildProject, ecsCluster, ecsService |

### 既存 Stack（参考パターン）

| Stack | ファイル | 参考ポイント |
|-------|---------|-------------|
| DistributionStack | `infra/lib/stack/distribution-stack.ts` | Props 設計、バリデーション、CfnOutput |
| ApplicationStack | `infra/lib/stack/application-stack.ts` | 複数 Construct 統合、依存関係 |

---

## 設計文書

### 参照ドキュメント

| 文書 | パス |
|------|------|
| 要件定義書 | `docs/spec/aws-cdk-serverless-architecture/requirements.md` |
| 設計文書 | `docs/design/aws-cdk-serverless-architecture/architecture.md` |
| タスク定義 | `docs/tasks/aws-cdk-serverless-architecture/TASK-0024.md` |
| 環境設定 | `infra/parameter.ts` |

### Stack 依存関係

```
VPC Stack
    └── Security Stack
            └── Database Stack
                    └── Application Stack
                            ├── Distribution Stack
                            └── Ops Stack (本タスク)
```

---

## 注意事項

### 技術的制約

1. **循環参照禁止**: Ops Stack は Application Stack を参照するが、逆参照は禁止
2. **Construct 新規作成禁止**: 既存の TDD 完了済み Construct のみ使用
3. **Props 必須項目**: config, ecsCluster, ecsServices, vpc は必須

### セキュリティ要件

1. **SNS Topic 暗号化**: AlarmConstruct が自動で KMS 暗号化を設定
2. **CloudWatch Logs 暗号化**: LogGroupConstruct が自動で KMS 暗号化を設定
3. **IAM 最小権限**: 各 Construct が必要最小限の権限を設定

### パフォーマンス考慮

1. **Firehose バッファ**: デフォルト 60秒/1MB（LogExportConstruct）
2. **Alarm 評価期間**: 5分 × 3回 = 15分（AlarmConstruct）

### 既存実装との整合性

- **CfnOutput 命名規則**: PascalCase（例: AlarmTopicArn, PipelineArn）
- **エラーメッセージ形式**: 定数定義して再利用
- **バリデーション位置**: コンストラクタ内で実施

---

## 実装チェックリスト

### 実装前

- [ ] 既存 Construct の Props インターフェースを確認
- [ ] 既存 Stack のパターンを確認（特に DistributionStack）
- [ ] parameter.ts の EnvironmentConfig を確認

### 実装中

- [ ] OpsStackProps インターフェース定義
- [ ] バリデーションロジック実装
- [ ] Construct 統合（依存順序を遵守）
- [ ] CfnOutput 設定
- [ ] テスト実装

### 実装後

- [ ] 全テスト通過確認
- [ ] Dev/Prod 両環境の CDK Synth 成功確認
- [ ] スナップショット更新
