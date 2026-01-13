# AWS CDK サーバーレスWebサービスアーキテクチャ 設計ヒアリング記録

**作成日**: 2026-01-13
**ヒアリング実施**: 設計フェーズ
**関連アーキテクチャ**: [architecture.md](architecture.md)

---

## ヒアリング目的

承認された要件定義書に基づいて、技術設計の詳細を決定するためのヒアリングを実施しました。

---

## 質問と回答

### Q1: CDK Stack の分割方針

**質問日時**: 2026-01-13
**カテゴリ**: アーキテクチャ設計
**背景**: CDK スタックの分割方法によってデプロイメント戦略と依存関係管理が大きく変わる

**質問内容**: CDK Stack をどのように分割しますか？

**選択肢**:
1. 機能別分割（推奨）- VPC, Security, Database, Application, Distribution, Ops の 6 Stack
2. 環境別分割 - Dev Stack, Prod Stack
3. 単一 Stack - 全リソースを 1 Stack に

**回答**: **機能別分割（推奨）** - 6 Stack 構成

**設計への影響**:
- 6つの独立した Stack による関心の分離
- Stack 間の明確な依存関係定義
- 個別のリソース更新・デプロイが可能
- チーム分散開発に適した構造

---

### Q2: アプリケーションタイプ

**質問日時**: 2026-01-13
**カテゴリ**: アプリケーション設計
**背景**: Frontend/Backend 分離構成が決定済みだが、具体的なアプリケーション形態を確認

**質問内容**: アプリケーションのタイプは？

**選択肢**:
1. SPA + REST API（推奨）
2. SSR (Server-Side Rendering)
3. MPA (Multi Page Application)

**回答**: **SPA + REST API（推奨）**

**設計への影響**:
- Frontend: S3 + CloudFront で SPA を配信
- Backend: ECS Fargate で REST API を提供
- API 設計は RESTful 原則に従う
- CORS 設定が必要

---

### Q3: Aurora Serverless v2 のスケーリング設定

**質問日時**: 2026-01-13
**カテゴリ**: データベース設計
**背景**: Aurora Serverless v2 の ACU (Aurora Capacity Unit) 設定はコストとパフォーマンスに直接影響

**質問内容**: Aurora Serverless v2 のスケーリング範囲は？

**選択肢**:
1. 最小構成 (0.5 - 2 ACU) - コスト優先
2. 標準構成 (1 - 4 ACU) - バランス型
3. 高性能構成 (2 - 8 ACU) - パフォーマンス優先

**回答**: **最小構成 (0.5 - 2 ACU)** - コスト優先

**設計への影響**:
- MinCapacity: 0.5 ACU（最小値）
- MaxCapacity: 2 ACU
- 低負荷時のコスト最小化
- 必要に応じて後から拡張可能

---

### Q4: ソースコード管理

**質問日時**: 2026-01-13
**カテゴリ**: CI/CD 設計
**背景**: 要件定義で CodePipeline/CodeBuild が決定済みだが、ソースリポジトリを確認

**質問内容**: ソースコード管理に使用するサービスは？

**選択肢**:
1. CodeCommit
2. GitHub
3. GitLab
4. Bitbucket

**回答**: **CodeCommit**

**設計への影響**:
- AWS 内でソースコード管理を完結
- CodePipeline との直接連携
- IAM による認証・認可
- 追加の接続設定が不要

---

### Q5: CloudWatch アラームの対象メトリクス

**質問日時**: 2026-01-13
**カテゴリ**: 運用・監視設計
**背景**: 監視対象のメトリクスによってアラート設計が変わる

**質問内容**: CloudWatch アラームで監視するメトリクスは？（複数選択可）

**選択肢**:
1. ECS CPU/Memory 使用率
2. CloudWatch Logs エラーパターン
3. ALB レスポンスタイム
4. Aurora 接続数

**回答**:
- **ECS CPU/Memory 使用率** ✓
- **CloudWatch Logs エラーパターン** ✓

**設計への影響**:
- ECS CPU Utilization > 80% アラーム
- ECS Memory Utilization > 80% アラーム
- CloudWatch Logs Metric Filter でエラーパターン検出
- SNS + AWS Chatbot で Slack 通知

---

### Q6: 設計フェーズの進め方

**質問日時**: 2026-01-13
**カテゴリ**: 進行方針
**背景**: 設計文書作成の範囲を確認

**質問内容**: 設計文書の作成範囲は？

**選択肢**:
1. 一括設計 - すべての設計文書を一度に作成
2. フェーズ分割 - Core → Security → Operations の順に作成

**回答**: **一括設計**

**設計への影響**:
- architecture.md: システム全体のアーキテクチャ
- dataflow.md: データフロー図
- interfaces.ts: TypeScript 型定義（CDK Parameter 等）
- 全文書を一度に作成

---

## ヒアリング結果サマリー

### 確定した設計方針

| 項目 | 決定内容 |
|------|----------|
| Stack 分割 | 機能別 6 Stack |
| アプリタイプ | SPA + REST API |
| Aurora スケール | 0.5 - 2 ACU |
| ソース管理 | CodeCommit |
| 監視メトリクス | ECS CPU/Memory, CW Logs Error |
| 設計進行 | 一括設計 |

### 設計文書一覧

| 文書 | ステータス | パス |
|------|-----------|------|
| アーキテクチャ設計 | ✅ 完了 | [architecture.md](architecture.md) |
| データフロー設計 | ✅ 完了 | [dataflow.md](dataflow.md) |
| 型定義 | ✅ 完了 | [interfaces.ts](interfaces.ts) |
| 設計ヒアリング記録 | ✅ 完了 | [design-interview.md](design-interview.md) |

---

## 関連文書

- **要件定義書**: [requirements.md](../../spec/aws-cdk-serverless-architecture/requirements.md)
- **要件ヒアリング記録**: [interview-record.md](../../spec/aws-cdk-serverless-architecture/interview-record.md)
- **ユーザストーリー**: [user-stories.md](../../spec/aws-cdk-serverless-architecture/user-stories.md)
- **受け入れ基準**: [acceptance-criteria.md](../../spec/aws-cdk-serverless-architecture/acceptance-criteria.md)
