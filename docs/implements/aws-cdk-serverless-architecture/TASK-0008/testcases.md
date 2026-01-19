# TDD テストケース定義書: TASK-0008 - Aurora Construct 実装

**タスクID**: TASK-0008
**タスク名**: Aurora Construct 実装
**要件名**: aws-cdk-serverless-architecture
**フェーズ**: Phase 2 - セキュリティ・データベース
**作成日**: 2026-01-19

---

## 1. 概要

### 1.1 テスト対象

Aurora Serverless v2 MySQL クラスターを構築する CDK Construct の実装に対するテストケース定義。

### 1.2 テストファイル構造

```
infra/
└── test/
    └── construct/
        └── database/
            └── aurora-construct.test.ts  # 新規作成
```

### 1.3 開発言語・フレームワーク

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: AWS CDK v2 の公式サポート言語であり、型安全性が担保される
  - **テストに適した機能**: 型チェックによるコンパイル時エラー検出、IntelliSense サポート
- **テストフレームワーク**: Jest + @aws-cdk/assertions
  - **フレームワーク選択の理由**: CDK 公式推奨のテストフレームワーク
  - **テスト実行環境**: Node.js ランタイム、`npm test` で実行

🔵 **信頼性**: note.md、既存テストファイル（vpc-construct.test.ts, security-group-construct.test.ts）より

---

## 2. テストケース一覧

| テストID | カテゴリ | テスト名 | 優先度 | 信頼性 |
|----------|----------|----------|--------|--------|
| TC-AU-01 | 正常系 | Aurora Serverless v2 クラスターリソース作成確認 | 高 | 🔵 |
| TC-AU-02 | 正常系 | エンジンバージョン MySQL 8.0 確認 | 高 | 🔵 |
| TC-AU-03 | 正常系 | ACU 設定（デフォルト min=0.5, max=2）確認 | 高 | 🔵 |
| TC-AU-04 | 正常系 | ストレージ暗号化有効確認 | 高 | 🔵 |
| TC-AU-05 | 正常系 | KMS キー関連付け確認 | 中 | 🟡 |
| TC-AU-06 | 正常系 | 自動バックアップ有効確認 | 高 | 🔵 |
| TC-AU-07 | 正常系 | バックアップ保持期間 7 日間確認 | 中 | 🟡 |
| TC-AU-08 | 正常系 | Security Group 関連付け確認 | 高 | 🔵 |
| TC-AU-09 | 正常系 | Private Isolated Subnet 配置確認 | 高 | 🔵 |
| TC-AU-10 | 正常系 | Secrets Manager シークレット作成確認 | 高 | 🔵 |
| TC-AU-11 | 正常系 | クラスターエンドポイント公開確認 | 中 | 🔵 |
| TC-AU-12 | 正常系 | パブリックアクセス無効確認 | 高 | 🔵 |
| TC-AU-13 | 正常系 | マルチ AZ 構成確認 | 高 | 🔵 |
| TC-AU-14 | バリエーション | カスタム ACU 設定反映確認 | 中 | 🟡 |
| TC-AU-15 | バリエーション | カスタムデータベース名設定確認 | 低 | 🟡 |
| TC-AU-16 | バリエーション | カスタムバックアップ保持期間設定確認 | 低 | 🟡 |
| TC-AU-17 | バリエーション | デフォルト値動作確認 | 中 | 🔵 |
| TC-AU-18 | エッジケース | 最小 ACU 値（0.5）動作確認 | 中 | 🟡 |
| TC-AU-19 | エッジケース | 同一 ACU 値（min=max）動作確認 | 低 | 🟡 |
| TC-AU-20 | エッジケース | 長い環境名でのリソース名生成確認 | 低 | 🔴 |
| TC-AU-21 | 公開プロパティ | cluster プロパティ存在確認 | 高 | 🔵 |
| TC-AU-22 | 公開プロパティ | clusterEndpoint プロパティ存在確認 | 高 | 🔵 |
| TC-AU-23 | 公開プロパティ | secret プロパティ存在確認 | 高 | 🔵 |
| TC-AU-24 | 公開プロパティ | securityGroup プロパティ存在確認 | 高 | 🔵 |

---

## 3. 正常系テストケース

### TC-AU-01: Aurora Serverless v2 クラスターリソース作成確認

- **テスト名**: Aurora Serverless v2 クラスターリソースが作成されること
  - **何をテストするか**: AuroraConstruct インスタンス化時に AWS::RDS::DBCluster リソースが作成される
  - **期待される動作**: CloudFormation テンプレートに DBCluster リソースが含まれる
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'dev',
  });
  ```
  - **入力データの意味**: 最小必須パラメータでの Construct 作成
- **期待される結果**: `template.resourceCountIs('AWS::RDS::DBCluster', 1)`
  - **期待結果の理由**: 1 つの Aurora クラスターが作成される
- **テストの目的**: REQ-022 の検証
  - **確認ポイント**: Aurora MySQL Serverless v2 の使用

🔵 **信頼性**: REQ-022、TASK-0008.md より

---

### TC-AU-02: エンジンバージョン MySQL 8.0 確認

- **テスト名**: エンジンバージョンが Aurora MySQL 8.0 であること
  - **何をテストするか**: DBCluster の Engine プロパティが Aurora MySQL である
  - **期待される動作**: Engine が `aurora-mysql` で EngineVersion が 8.0 互換である
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 標準構成での検証
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    Engine: 'aurora-mysql',
    EngineVersion: Match.stringLikeRegexp('8\\.0.*'),
  });
  ```
  - **期待結果の理由**: Aurora MySQL 3.x は MySQL 8.0 互換
- **テストの目的**: REQ-022 の検証
  - **確認ポイント**: 正しいエンジンバージョンの使用

🔵 **信頼性**: REQ-022、architecture.md より

---

### TC-AU-03: ACU 設定（デフォルト min=0.5, max=2）確認

- **テスト名**: ACU 設定がデフォルト値（min=0.5, max=2）で作成されること
  - **何をテストするか**: ServerlessV2ScalingConfiguration の MinCapacity/MaxCapacity が正しい
  - **期待される動作**: 指定した ACU 範囲でスケーリング設定される
- **入力値**: minCapacity/maxCapacity 未指定での AuroraConstruct 作成
  - **入力データの意味**: デフォルト値のフォールバック動作確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    ServerlessV2ScalingConfiguration: {
      MinCapacity: 0.5,
      MaxCapacity: 2,
    },
  });
  ```
  - **期待結果の理由**: architecture.md で指定された開発環境向けデフォルト値
- **テストの目的**: REQ-022、NFR-202 の検証
  - **確認ポイント**: コスト効率的な ACU 設定

🔵 **信頼性**: architecture.md データベース層、REQ-022 より

---

### TC-AU-04: ストレージ暗号化有効確認

- **テスト名**: ストレージ暗号化が有効であること
  - **何をテストするか**: DBCluster の StorageEncrypted プロパティが true である
  - **期待される動作**: ストレージレベルでの暗号化が有効になる
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: セキュリティ設定がデフォルトで適用されることを確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    StorageEncrypted: true,
  });
  ```
  - **期待結果の理由**: REQ-026 でストレージ暗号化が必須
- **テストの目的**: REQ-026、NFR-102 の検証
  - **確認ポイント**: データセキュリティの確保

🔵 **信頼性**: REQ-026、NFR-102 より

---

### TC-AU-05: KMS キー関連付け確認

- **テスト名**: KMS キーが関連付けられていること
  - **何をテストするか**: DBCluster の KmsKeyId プロパティが設定されている
  - **期待される動作**: カスタマーマネージドキーまたは AWS マネージドキーで暗号化
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 暗号化キーの自動設定確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    KmsKeyId: Match.anyValue(),
  });
  ```
  - **期待結果の理由**: StorageEncrypted: true の場合、KMS キーが必要
- **テストの目的**: REQ-026 の検証
  - **確認ポイント**: 暗号化キーの適切な設定

🟡 **信頼性**: REQ-026 からの妥当な推測（KMS キー自動生成の可能性あり）

---

### TC-AU-06: 自動バックアップ有効確認

- **テスト名**: 自動バックアップが有効であること
  - **何をテストするか**: DBCluster の BackupRetentionPeriod が 1 以上である
  - **期待される動作**: 自動バックアップが有効化され、指定期間保持される
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: バックアップ設定のデフォルト動作確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    BackupRetentionPeriod: Match.anyValue(),
  });
  // BackupRetentionPeriod >= 1 であることを別途確認
  ```
  - **期待結果の理由**: REQ-027 で自動バックアップが必須
- **テストの目的**: REQ-027 の検証
  - **確認ポイント**: データ保護の確保

🔵 **信頼性**: REQ-027 より

---

### TC-AU-07: バックアップ保持期間 7 日間確認

- **テスト名**: バックアップ保持期間が 7 日間であること
  - **何をテストするか**: DBCluster の BackupRetentionPeriod が 7 である
  - **期待される動作**: バックアップが 7 日間保持される
- **入力値**: backupRetentionDays 未指定での AuroraConstruct 作成
  - **入力データの意味**: デフォルトバックアップ保持期間の確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    BackupRetentionPeriod: 7,
  });
  ```
  - **期待結果の理由**: architecture.md で 7 日間保持が指定
- **テストの目的**: REQ-027 の検証
  - **確認ポイント**: 適切な保持期間設定

🟡 **信頼性**: architecture.md（7日）より妥当な推測

---

### TC-AU-08: Security Group 関連付け確認

- **テスト名**: 適切な Security Group が関連付けられていること
  - **何をテストするか**: DBCluster の VpcSecurityGroupIds に Props で渡した SG が含まれる
  - **期待される動作**: Aurora 用 Security Group が正しく関連付けられる
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'dev',
  });
  ```
  - **入力データの意味**: Security Group の明示的な指定
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    VpcSecurityGroupIds: Match.arrayWith([
      Match.objectLike({
        'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*')]),
      }),
    ]),
  });
  ```
  - **期待結果の理由**: REQ-024, REQ-025 でアクセス制御が必須
- **テストの目的**: REQ-024, REQ-025 の検証
  - **確認ポイント**: ネットワークセキュリティの確保

🔵 **信頼性**: REQ-024, REQ-025、TASK-0008.md より

---

### TC-AU-09: Private Isolated Subnet 配置確認

- **テスト名**: Private Isolated Subnet に配置されていること
  - **何をテストするか**: DBCluster の DBSubnetGroupName が Private Isolated Subnet を参照
  - **期待される動作**: Aurora が外部から隔離されたサブネットに配置される
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: サブネット配置の自動設定確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
    SubnetIds: Match.arrayWith([Match.anyValue()]),
  });
  ```
  - **期待結果の理由**: REQ-023 で Private DB Subnet への配置が必須
- **テストの目的**: REQ-023, REQ-024 の検証
  - **確認ポイント**: ネットワーク隔離の確保

🔵 **信頼性**: REQ-023、architecture.md より

---

### TC-AU-10: Secrets Manager シークレット作成確認

- **テスト名**: Secrets Manager でシークレットが作成されること
  - **何をテストするか**: AWS::SecretsManager::Secret リソースが作成される
  - **期待される動作**: DB 認証情報が Secrets Manager で自動管理される
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 認証情報管理の自動設定確認
- **期待される結果**:
  ```typescript
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);
  ```
  - **期待結果の理由**: CDK の fromGeneratedSecret で自動生成
- **テストの目的**: セキュリティ要件の検証
  - **確認ポイント**: 認証情報の安全な管理

🔵 **信頼性**: note.md CDK 実装制約、BLEA datastore.ts より

---

### TC-AU-11: クラスターエンドポイント公開確認

- **テスト名**: クラスターエンドポイントが公開されること
  - **何をテストするか**: AuroraConstruct の clusterEndpoint プロパティが定義されている
  - **期待される動作**: Writer エンドポイントが後続リソースから参照可能
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 公開プロパティの存在確認
- **期待される結果**:
  ```typescript
  expect(aurora.clusterEndpoint).toBeDefined();
  expect(aurora.clusterEndpoint.hostname).toBeDefined();
  ```
  - **期待結果の理由**: ECS からの接続に必要
- **テストの目的**: dataflow.md 接続フローの検証
  - **確認ポイント**: 接続情報の取得可能性

🔵 **信頼性**: dataflow.md、requirements.md 出力プロパティより

---

### TC-AU-12: パブリックアクセス無効確認

- **テスト名**: パブリックアクセスが無効であること
  - **何をテストするか**: DBCluster が PubliclyAccessible: false または未設定である
  - **期待される動作**: インターネットからの直接アクセスが不可能
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: セキュリティ設定のデフォルト動作確認
- **期待される結果**: パブリックアクセスが許可されていないこと
  - **期待結果の理由**: REQ-024, REQ-404 で外部アクセス禁止
- **テストの目的**: REQ-024, REQ-404 の検証
  - **確認ポイント**: 外部攻撃からの保護

🔵 **信頼性**: REQ-024, REQ-404 より

---

### TC-AU-13: マルチ AZ 構成確認

- **テスト名**: マルチ AZ 構成が有効であること
  - **何をテストするか**: DBSubnetGroup が複数の AZ にまたがるサブネットを含む
  - **期待される動作**: 高可用性のためのマルチ AZ 配置が実現される
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 高可用性設定の自動適用確認
- **期待される結果**:
  ```typescript
  const subnetGroup = template.findResources('AWS::RDS::DBSubnetGroup');
  // SubnetIds が 2 つ以上の異なる AZ のサブネットを含む
  ```
  - **期待結果の理由**: VPC が 2 AZ 構成のため自動的にマルチ AZ
- **テストの目的**: REQ-023、高可用性要件の検証
  - **確認ポイント**: 障害耐性の確保

🔵 **信頼性**: architecture.md、VPC Construct 実装より

---

## 4. バリエーションテストケース

### TC-AU-14: カスタム ACU 設定反映確認

- **テスト名**: カスタム ACU 設定が反映されること
  - **何をテストするか**: Props で指定した minCapacity/maxCapacity が適用される
  - **期待される動作**: 指定した ACU 範囲でクラスターが作成される
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'dev',
    minCapacity: 1,
    maxCapacity: 4,
  });
  ```
  - **入力データの意味**: カスタム ACU 値での動作確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    ServerlessV2ScalingConfiguration: {
      MinCapacity: 1,
      MaxCapacity: 4,
    },
  });
  ```
  - **期待結果の理由**: Props が正しく反映される
- **テストの目的**: パラメータカスタマイズの検証
  - **確認ポイント**: 柔軟な設定対応

🟡 **信頼性**: requirements.md Props 定義からの妥当な推測

---

### TC-AU-15: カスタムデータベース名設定確認

- **テスト名**: カスタムデータベース名が設定できること
  - **何をテストするか**: Props で指定した databaseName が適用される
  - **期待される動作**: 指定したデータベース名でクラスターが作成される
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'dev',
    databaseName: 'customdb',
  });
  ```
  - **入力データの意味**: カスタムデータベース名での動作確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    DatabaseName: 'customdb',
  });
  ```
  - **期待結果の理由**: Props が正しく反映される
- **テストの目的**: パラメータカスタマイズの検証
  - **確認ポイント**: 命名の柔軟性

🟡 **信頼性**: requirements.md Props 定義からの妥当な推測

---

### TC-AU-16: カスタムバックアップ保持期間設定確認

- **テスト名**: カスタムバックアップ保持期間が設定できること
  - **何をテストするか**: Props で指定した backupRetentionDays が適用される
  - **期待される動作**: 指定した保持期間でバックアップが設定される
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'dev',
    backupRetentionDays: 14,
  });
  ```
  - **入力データの意味**: カスタム保持期間での動作確認
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    BackupRetentionPeriod: 14,
  });
  ```
  - **期待結果の理由**: Props が正しく反映される
- **テストの目的**: パラメータカスタマイズの検証
  - **確認ポイント**: バックアップ設定の柔軟性

🟡 **信頼性**: requirements.md Props 定義からの妥当な推測

---

### TC-AU-17: デフォルト値動作確認

- **テスト名**: オプションパラメータ未指定時にデフォルト値が適用されること
  - **何をテストするか**: minCapacity, maxCapacity, databaseName, backupRetentionDays のデフォルト動作
  - **期待される動作**: 要件定義書で指定されたデフォルト値が適用される
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'dev',
    // minCapacity, maxCapacity, databaseName, backupRetentionDays は未指定
  });
  ```
  - **入力データの意味**: 最小必須パラメータのみでの動作確認
- **期待される結果**:
  - minCapacity: 0.5
  - maxCapacity: 2
  - databaseName: 'appdb'
  - backupRetentionDays: 7
  - **期待結果の理由**: requirements.md で定義されたデフォルト値
- **テストの目的**: デフォルト値フォールバックの検証
  - **確認ポイント**: 適切なデフォルト設定

🔵 **信頼性**: requirements.md Props 定義より

---

## 5. エッジケーステストケース

### TC-AU-18: 最小 ACU 値（0.5）動作確認

- **テスト名**: 最小 ACU 値（0.5）での動作確認
  - **何をテストするか**: minCapacity: 0.5 が正常に設定される
  - **期待される動作**: Aurora Serverless v2 の最小 ACU で動作する
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'dev',
    minCapacity: 0.5,
    maxCapacity: 0.5,
  });
  ```
  - **入力データの意味**: Aurora Serverless v2 の下限値テスト
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    ServerlessV2ScalingConfiguration: {
      MinCapacity: 0.5,
      MaxCapacity: 0.5,
    },
  });
  ```
  - **期待結果の理由**: 0.5 ACU は Aurora Serverless v2 の最小値
- **テストの目的**: 境界値の検証
  - **確認ポイント**: 最小構成での動作保証

🟡 **信頼性**: note.md Aurora Serverless v2 制約からの妥当な推測

---

### TC-AU-19: 同一 ACU 値（min=max）動作確認

- **テスト名**: 同一 ACU 値（min=max）での動作確認
  - **何をテストするか**: minCapacity と maxCapacity が同じ値で正常に設定される
  - **期待される動作**: 固定キャパシティでクラスターが作成される
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'dev',
    minCapacity: 2,
    maxCapacity: 2,
  });
  ```
  - **入力データの意味**: スケーリングなし（固定キャパシティ）のテスト
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    ServerlessV2ScalingConfiguration: {
      MinCapacity: 2,
      MaxCapacity: 2,
    },
  });
  ```
  - **期待結果の理由**: 固定キャパシティは有効な設定
- **テストの目的**: エッジケースの検証
  - **確認ポイント**: 固定キャパシティモードの動作

🟡 **信頼性**: Aurora Serverless v2 仕様からの妥当な推測

---

### TC-AU-20: 長い環境名でのリソース名生成確認

- **テスト名**: 環境名が長い場合のリソース名生成
  - **何をテストするか**: envName が長い場合でもリソースが正常に作成される
  - **期待される動作**: リソース名が適切にトランケートされる
- **入力値**:
  ```typescript
  const aurora = new AuroraConstruct(stack, 'TestAurora', {
    vpc,
    securityGroup: auroraSg,
    envName: 'very-long-environment-name-for-testing-purposes',
  });
  ```
  - **入力データの意味**: 長い環境名での境界テスト
- **期待される結果**: リソースが正常に作成される（CloudFormation 制限内）
  - **期待結果の理由**: AWS リソース名制限を超えない
- **テストの目的**: 堅牢性の検証
  - **確認ポイント**: 入力バリデーションまたは適切なトランケート

🔴 **信頼性**: 要件定義書にない推測（実装時に検討が必要）

---

## 6. 公開プロパティテストケース

### TC-AU-21: cluster プロパティ存在確認

- **テスト名**: cluster プロパティが定義されていること
  - **何をテストするか**: AuroraConstruct.cluster が DatabaseCluster 型で定義される
  - **期待される動作**: 作成されたクラスターへの参照が公開される
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 公開プロパティの存在確認
- **期待される結果**:
  ```typescript
  expect(aurora.cluster).toBeDefined();
  ```
  - **期待結果の理由**: 後続リソースからの参照に必要
- **テストの目的**: インターフェース仕様の検証
  - **確認ポイント**: 公開 API の正確性

🔵 **信頼性**: requirements.md 出力プロパティより

---

### TC-AU-22: clusterEndpoint プロパティ存在確認

- **テスト名**: clusterEndpoint プロパティが定義されていること
  - **何をテストするか**: AuroraConstruct.clusterEndpoint が Endpoint 型で定義される
  - **期待される動作**: Writer エンドポイントへの参照が公開される
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 公開プロパティの存在確認
- **期待される結果**:
  ```typescript
  expect(aurora.clusterEndpoint).toBeDefined();
  ```
  - **期待結果の理由**: ECS からの接続に必要
- **テストの目的**: インターフェース仕様の検証
  - **確認ポイント**: 公開 API の正確性

🔵 **信頼性**: requirements.md 出力プロパティより

---

### TC-AU-23: secret プロパティ存在確認

- **テスト名**: secret プロパティが定義されていること
  - **何をテストするか**: AuroraConstruct.secret が ISecret 型で定義される
  - **期待される動作**: Secrets Manager シークレットへの参照が公開される
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 公開プロパティの存在確認
- **期待される結果**:
  ```typescript
  expect(aurora.secret).toBeDefined();
  ```
  - **期待結果の理由**: 認証情報管理に必要
- **テストの目的**: インターフェース仕様の検証
  - **確認ポイント**: 公開 API の正確性

🔵 **信頼性**: requirements.md 出力プロパティより

---

### TC-AU-24: securityGroup プロパティ存在確認

- **テスト名**: securityGroup プロパティが定義されていること
  - **何をテストするか**: AuroraConstruct.securityGroup が ISecurityGroup 型で定義される
  - **期待される動作**: 関連付けられた Security Group への参照が公開される
- **入力値**: デフォルト設定での AuroraConstruct 作成
  - **入力データの意味**: 公開プロパティの存在確認
- **期待される結果**:
  ```typescript
  expect(aurora.securityGroup).toBeDefined();
  ```
  - **期待結果の理由**: ネットワーク設定の参照に必要
- **テストの目的**: インターフェース仕様の検証
  - **確認ポイント**: 公開 API の正確性

🔵 **信頼性**: requirements.md 出力プロパティより

---

## 7. 要件定義との対応関係

### 参照した機能概要

- **セクション**: requirements.md 1. 機能の概要
- **内容**: Aurora Serverless v2 MySQL クラスターを構築する再利用可能な CDK Construct

### 参照した入力・出力仕様

- **セクション**: requirements.md 2. 入力・出力の仕様
- **内容**: AuroraConstructProps インターフェース、公開プロパティ定義

### 参照した制約条件

- **セクション**: requirements.md 3. 制約条件
- **内容**: 技術的制約（IaC, リージョン, エンジン）、セキュリティ制約、パフォーマンス制約

### 参照した使用例

- **セクション**: requirements.md 4. 想定される使用例
- **内容**: Database Stack での基本的な使用パターン、Sidecar パターンのデータフロー

---

## 8. 実装順序の推奨

### Phase 1: コア機能（高優先度）

1. TC-AU-01: Aurora クラスターリソース作成
2. TC-AU-02: エンジンバージョン確認
3. TC-AU-03: ACU 設定確認
4. TC-AU-04: ストレージ暗号化確認
5. TC-AU-06: 自動バックアップ確認

### Phase 2: セキュリティ機能（高優先度）

6. TC-AU-08: Security Group 関連付け
7. TC-AU-09: Private Subnet 配置
8. TC-AU-12: パブリックアクセス無効
9. TC-AU-10: Secrets Manager シークレット

### Phase 3: 公開プロパティ（高優先度）

10. TC-AU-21: cluster プロパティ
11. TC-AU-22: clusterEndpoint プロパティ
12. TC-AU-23: secret プロパティ
13. TC-AU-24: securityGroup プロパティ

### Phase 4: 追加機能（中優先度）

14. TC-AU-05: KMS キー関連付け
15. TC-AU-07: バックアップ保持期間
16. TC-AU-11: クラスターエンドポイント公開
17. TC-AU-13: マルチ AZ 構成
18. TC-AU-17: デフォルト値動作

### Phase 5: バリエーション・エッジケース（低優先度）

19. TC-AU-14: カスタム ACU 設定
20. TC-AU-15: カスタムデータベース名
21. TC-AU-16: カスタムバックアップ保持期間
22. TC-AU-18: 最小 ACU 値
23. TC-AU-19: 同一 ACU 値
24. TC-AU-20: 長い環境名

---

## 9. テストファイル構造の提案

```typescript
/**
 * Aurora Construct テスト
 *
 * TASK-0008: Aurora Construct 実装
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * テストケース:
 * - TC-AU-01 〜 TC-AU-24
 *
 * 🔵 信頼性: 要件定義書 REQ-022〜027 に基づくテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AuroraConstruct } from '../../../lib/construct/database/aurora-construct';

describe('AuroraConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.IVpc;
  let auroraSg: ec2.ISecurityGroup;
  let auroraConstruct: AuroraConstruct;
  let template: Template;

  beforeEach(() => {
    // 【テストデータ準備】: CDK App、Stack、VPC、Security Group を作成
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
    vpc = new ec2.Vpc(stack, 'TestVpc');
    auroraSg = new ec2.SecurityGroup(stack, 'TestAuroraSg', { vpc });
  });

  // ============================================================================
  // 正常系テストケース
  // ============================================================================
  describe('正常系テストケース', () => {
    // TC-AU-01 〜 TC-AU-13
  });

  // ============================================================================
  // バリエーションテストケース
  // ============================================================================
  describe('バリエーションテストケース', () => {
    // TC-AU-14 〜 TC-AU-17
  });

  // ============================================================================
  // エッジケーステストケース
  // ============================================================================
  describe('エッジケーステストケース', () => {
    // TC-AU-18 〜 TC-AU-20
  });

  // ============================================================================
  // 公開プロパティテストケース
  // ============================================================================
  describe('公開プロパティテストケース', () => {
    // TC-AU-21 〜 TC-AU-24
  });
});
```

---

## 10. 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 17 | 71% |
| 🟡 黄信号 | 6 | 25% |
| 🔴 赤信号 | 1 | 4% |

---

## 11. 品質評価

### 評価結果: ✅ 高品質

- **テストケース分類**: 正常系 13件、バリエーション 4件、エッジケース 3件、公開プロパティ 4件 - 網羅的
- **期待値定義**: 各テストケースで具体的な期待値とアサーション方法を定義
- **技術選択**: TypeScript + Jest + @aws-cdk/assertions で確定
- **実装可能性**: CDK 標準パターンに準拠、BLEA 参考実装あり
- **信頼性レベル**: 🔵（青信号）が 71% で要件定義書に基づく確実な設計

### 改善推奨事項

1. **TC-AU-05（KMS キー）**: 実装時に AWS マネージドキーまたはカスタマーマネージドキーの選択を明確化
2. **TC-AU-20（長い環境名）**: 実装時にバリデーションロジックの追加を検討

---

## 関連文書

- **タスクノート**: `docs/implements/aws-cdk-serverless-architecture/TASK-0008/note.md`
- **要件定義書**: `docs/implements/aws-cdk-serverless-architecture/TASK-0008/requirements.md`
- **既存テスト参考**: `infra/test/construct/vpc/vpc-construct.test.ts`
- **既存テスト参考**: `infra/test/construct/security/security-group-construct.test.ts`
- **BLEA 参考実装**: `baseline-environment-on-aws/usecases/blea-guest-ecs-app-sample/lib/construct/datastore.ts`
