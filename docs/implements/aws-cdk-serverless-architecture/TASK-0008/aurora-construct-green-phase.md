# TDD Green Phase 記録: Aurora Construct 実装

**タスクID**: TASK-0008
**タスク名**: Aurora Construct 実装
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Green Phase（テストを通すための最小実装）
**作成日**: 2026-01-20

---

## 1. 概要

Aurora Serverless v2 MySQL クラスターを構築する CDK Construct の実装を行い、全テストケースが成功する状態（Green）を達成しました。

---

## 2. テスト結果

### 2.1 実行コマンド

```bash
cd /Volumes/data/aws-workspace/tsumiki-test-project/infra
npm test -- aurora-construct.test.ts
```

### 2.2 結果サマリー

- **テスト総数**: 30 テスト
- **成功**: 30 テスト
- **失敗**: 0 テスト
- **ステータス**: Green Phase 成功

### 2.3 テスト結果詳細

| カテゴリ | テスト数 | 結果 |
|----------|----------|------|
| 正常系テストケース (TC-AU-01〜13) | 18 | 全 PASS |
| バリエーションテストケース (TC-AU-14〜17) | 5 | 全 PASS |
| エッジケーステストケース (TC-AU-18〜20) | 3 | 全 PASS |
| 公開プロパティテストケース (TC-AU-21〜24) | 4 | 全 PASS |

---

## 3. 実装内容

### 3.1 実装ファイル

`infra/lib/construct/database/aurora-construct.ts`

### 3.2 実装した機能

#### 3.2.1 Aurora Serverless v2 クラスター
- **エンジン**: Aurora MySQL 3.05.2（MySQL 8.0 互換）
- **インスタンスタイプ**: Serverless v2
- **スケーリング設定**:
  - MinCapacity: デフォルト 0.5 ACU（カスタマイズ可能）
  - MaxCapacity: デフォルト 2 ACU（カスタマイズ可能）

#### 3.2.2 ストレージ暗号化
- KMS カスタマーマネージドキーを使用
- 自動キーローテーション有効
- `storageEncrypted: true`

#### 3.2.3 自動バックアップ
- バックアップ保持期間: デフォルト 7 日間（カスタマイズ可能）
- 削除時: スナップショット作成

#### 3.2.4 ネットワーク設定
- Private Isolated Subnet に配置
- DB サブネットグループ自動作成
- 外部 Security Group を受け入れ

#### 3.2.5 Secrets Manager 統合
- マスターユーザー認証情報の自動生成
- `rds.Credentials.fromGeneratedSecret()` を使用

#### 3.2.6 公開プロパティ

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `cluster` | `rds.DatabaseCluster` | Aurora クラスターリソース |
| `clusterEndpoint` | `rds.Endpoint` | Writer エンドポイント |
| `secret` | `secretsmanager.ISecret` | 認証情報シークレット |
| `securityGroup` | `ec2.ISecurityGroup` | 関連付けられた Security Group |

---

## 4. テストファイルの修正

### 4.1 修正内容

Red Phase で作成されたテストファイルに以下の問題があり、修正を行いました。

#### 4.1.1 TC-AU-08, TC-AU-09: CDK assertions の制約対応

**問題**: `Match.anyValue()` は `Match.arrayWith()` 内でネストできない

**修正前**:
```typescript
template.hasResourceProperties('AWS::RDS::DBCluster', {
  VpcSecurityGroupIds: Match.arrayWith([Match.anyValue()]),
});
```

**修正後**:
```typescript
const clusters = template.findResources('AWS::RDS::DBCluster');
const clusterValues = Object.values(clusters);
expect(clusterValues.length).toBe(1);
const vpcSecurityGroupIds = clusterValues[0].Properties.VpcSecurityGroupIds;
expect(vpcSecurityGroupIds).toBeDefined();
expect(Array.isArray(vpcSecurityGroupIds)).toBe(true);
expect(vpcSecurityGroupIds.length).toBeGreaterThan(0);
```

#### 4.1.2 TC-AU-18: AWS CDK バリデーション制約対応

**問題**: AWS CDK では `serverlessV2MaxCapacity >= 1` の制約があり、`maxCapacity: 0.5` は無効

**修正前**:
```typescript
minCapacity: 0.5,
maxCapacity: 0.5,
```

**修正後**:
```typescript
minCapacity: 0.5,
maxCapacity: 1,
```

---

## 5. 実装コードの主要部分

```typescript
// Aurora クラスター作成
this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
  // エンジン設定: Aurora MySQL 3.x (MySQL 8.0 互換)
  engine: rds.DatabaseClusterEngine.auroraMysql({
    version: rds.AuroraMysqlEngineVersion.VER_3_05_2,
  }),

  // 認証情報: Secrets Manager で自動生成
  credentials: rds.Credentials.fromGeneratedSecret(MASTER_USERNAME),

  // Serverless v2 Writer インスタンス
  writer: rds.ClusterInstance.serverlessV2('Writer', {
    publiclyAccessible: false,
  }),

  // Serverless v2 スケーリング設定
  serverlessV2MinCapacity: minCapacity,
  serverlessV2MaxCapacity: maxCapacity,

  // VPC・サブネット設定
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  securityGroups: [securityGroup],

  // データベース名
  defaultDatabaseName: databaseName,

  // ストレージ暗号化
  storageEncrypted: true,
  storageEncryptionKey: encryptionKey,

  // バックアップ設定
  backup: { retention: cdk.Duration.days(backupRetentionDays) },

  // 削除保護
  removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
});
```

---

## 6. 要件との対応

### 6.1 機能要件

| 要件ID | 要件内容 | 実装状況 |
|--------|----------|----------|
| REQ-022 | Aurora MySQL Serverless v2 を使用 | ✅ 実装完了 |
| REQ-023 | Private DB Subnet に配置 | ✅ 実装完了 |
| REQ-024 | 外部からの直接アクセス遮断 | ✅ 実装完了 |
| REQ-025 | ECS SG からの 3306 のみ許可 | ✅ Props で受け入れ |
| REQ-026 | Storage Encryption 有効化 | ✅ 実装完了 |
| REQ-027 | 自動バックアップ有効化 | ✅ 実装完了 |

### 6.2 非機能要件

| 要件ID | 要件内容 | 実装状況 |
|--------|----------|----------|
| NFR-102 | ストレージ暗号化 | ✅ KMS キーで暗号化 |
| NFR-202 | Aurora Serverless v2 によるコスト効率 | ✅ ACU 0.5-2 設定 |

---

## 7. 次のステップ

### 7.1 Refactor フェーズで検討する改善点

1. **定数の共通化**: 複数の Construct で使用する定数を共通モジュールに抽出
2. **エラーハンドリング**: Props バリデーションの強化
3. **監視設定**: CloudWatch アラームの追加（BLEA 参考実装に基づく）
4. **RDS イベント通知**: SNS 通知の設定

### 7.2 統合テスト

- Database Stack への組み込みテスト
- Application Stack との連携テスト

---

## 8. 参考資料

- **BLEA 参考実装**: `baseline-environment-on-aws/usecases/blea-guest-ecs-app-sample/lib/construct/datastore.ts`
- **要件定義書**: `docs/implements/aws-cdk-serverless-architecture/TASK-0008/requirements.md`
- **テストケース定義**: `docs/implements/aws-cdk-serverless-architecture/TASK-0008/testcases.md`
- **Red Phase 記録**: `docs/implements/aws-cdk-serverless-architecture/TASK-0008/aurora-construct-red-phase.md`

---

## 関連ファイル

- **実装ファイル**: `infra/lib/construct/database/aurora-construct.ts`
- **テストファイル**: `infra/test/construct/database/aurora-construct.test.ts`
