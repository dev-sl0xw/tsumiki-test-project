# TASK-0018: S3 + OAC Construct 詳細要件定義書

**タスクID**: TASK-0018
**タスクタイプ**: TDD
**フェーズ**: TDD Requirements Phase - 詳細要件整理
**作成日**: 2026-02-01
**対象 Construct**: S3BucketConstruct

---

## 関連文書

- **ノート**: [note.md](note.md)
- **タスク定義**: [../../tasks/aws-cdk-serverless-architecture/TASK-0018.md](../../tasks/aws-cdk-serverless-architecture/TASK-0018.md)
- **要件定義書**: [../../spec/aws-cdk-serverless-architecture/requirements.md](../../spec/aws-cdk-serverless-architecture/requirements.md)
- **設計文書**: [../../design/aws-cdk-serverless-architecture/architecture.md](../../design/aws-cdk-serverless-architecture/architecture.md)
- **参照実装**: [../../../../infra/lib/construct/security/waf-construct.ts](../../../../infra/lib/construct/security/waf-construct.ts)

---

## 1. 機能要件 (Functional Requirements)

### 1.1 S3 バケット作成要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| REQ-S3-001 | S3 バケットリソースが作成されること | 🔵 | REQ-031 |
| REQ-S3-002 | バケット名が `{envName}-{suffix}` 形式で命名されること | 🟡 | 設計文書より妥当な推測 |
| REQ-S3-003 | BlockPublicAccess.BLOCK_ALL でパブリックアクセスを完全ブロックすること | 🔵 | REQ-031, NFR-104 |
| REQ-S3-004 | BucketEncryption.S3_MANAGED でサーバーサイド暗号化すること | 🔵 | REQ-031 |
| REQ-S3-005 | バージョニングを有効化できること（デフォルト: true） | 🔵 | REQ-031 |
| REQ-S3-006 | 削除ポリシーを環境に応じて設定できること | 🟡 | 設計文書より妥当な推測 |
| REQ-S3-007 | 静的コンテンツ用と Sorry Page 用を同一バケットで管理できること | 🔵 | REQ-031 |

### 1.2 OAC (Origin Access Control) 要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| REQ-OAC-001 | CloudFront OAC リソースが作成されること | 🔵 | REQ-032 |
| REQ-OAC-002 | signingBehavior が 'always' であること | 🔵 | REQ-032 |
| REQ-OAC-003 | signingProtocol が 'sigv4' であること | 🔵 | REQ-032 |
| REQ-OAC-004 | originAccessControlOriginType が 's3' であること | 🔵 | REQ-032 |
| REQ-OAC-005 | OAC 名が `{envName}-oac` 形式で命名されること | 🟡 | 設計文書より妥当な推測 |
| REQ-OAC-006 | OAC ID が外部から参照可能であること | 🔵 | CloudFront 連携要件 |

### 1.3 バケットポリシー要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| REQ-BP-001 | CloudFront からの署名付きリクエストのみを許可するポリシーが設定されること | 🔵 | REQ-032 |
| REQ-BP-002 | Principal が `cloudfront.amazonaws.com` であること | 🔵 | REQ-032 |
| REQ-BP-003 | Action が `s3:GetObject` であること | 🔵 | REQ-032 |
| REQ-BP-004 | Condition で `aws:SourceArn` が CloudFront Distribution ARN と一致すること | 🔵 | REQ-032 |
| REQ-BP-005 | Resource が `{bucketArn}/*` 形式であること | 🔵 | REQ-032 |
| REQ-BP-006 | `addCloudFrontBucketPolicy()` メソッドで後からポリシーを追加できること | 🟡 | note.md 循環参照対応 |

### 1.4 Props バリデーション要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| REQ-VAL-001 | envName が空文字列の場合、エラーをスローすること | 🟡 | WafConstruct パターン準拠 |
| REQ-VAL-002 | envName が 20 文字を超える場合、エラーをスローすること | 🟡 | WafConstruct パターン準拠 |
| REQ-VAL-003 | envName が不正な形式（特殊文字含む等）の場合、エラーをスローすること | 🟡 | WafConstruct パターン準拠 |
| REQ-VAL-004 | bucketNameSuffix が不正な場合、適切に処理されること | 🟡 | 設計文書より妥当な推測 |

### 1.5 公開プロパティ要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| REQ-PROP-001 | `bucket` プロパティで S3 バケットが参照可能であること | 🔵 | note.md |
| REQ-PROP-002 | `bucketArn` プロパティでバケット ARN が参照可能であること | 🔵 | note.md |
| REQ-PROP-003 | `bucketDomainName` プロパティでバケットドメイン名が参照可能であること | 🔵 | note.md |
| REQ-PROP-004 | `originAccessControl` プロパティで OAC が参照可能であること | 🔵 | note.md |
| REQ-PROP-005 | `originAccessControlId` プロパティで OAC ID が参照可能であること | 🔵 | note.md |

---

## 2. 非機能要件 (Non-functional Requirements)

### 2.1 セキュリティ要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| NFR-SEC-001 | S3 バケットへの直接パブリックアクセスを禁止すること | 🔵 | NFR-104 |
| NFR-SEC-002 | CloudFront 経由でのみ S3 バケットへアクセス可能にすること | 🔵 | NFR-104 |
| NFR-SEC-003 | SigV4 署名による認証を強制すること | 🔵 | REQ-032 |
| NFR-SEC-004 | サーバーサイド暗号化を強制すること | 🔵 | REQ-031 |

### 2.2 可用性要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| NFR-AVL-001 | S3 Standard ストレージクラスを使用すること | 🟡 | 高可用性要件から推測 |
| NFR-AVL-002 | バージョニングによりオブジェクト復旧が可能であること | 🔵 | REQ-031 |

### 2.3 運用性要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| NFR-OPS-001 | CfnOutput で主要プロパティを出力すること | 🟡 | note.md |
| NFR-OPS-002 | 環境ごとに異なる削除ポリシーを設定可能にすること | 🟡 | 運用要件から推測 |

### 2.4 コスト最適化要件

| 要件ID | 要件内容 | 信頼性 | 参照元 |
|--------|----------|--------|--------|
| NFR-COST-001 | 不要なオブジェクトの自動削除はライフサイクルポリシーで対応すること | 🔴 | 推測 |

---

## 3. Props インターフェース定義

```typescript
/**
 * S3BucketConstruct の Props インターフェース
 *
 * 【設計方針】: 必須パラメータ + オプショナルパラメータ（デフォルト値提供）
 * 【再利用性】: 様々な S3 バケット構成に対応
 *
 * @interface S3BucketConstructProps
 */
export interface S3BucketConstructProps {
  /**
   * 環境名 (必須)
   *
   * 【用途】: リソース命名に使用（例: "dev", "prod"）
   * 【制約】: 小文字英数字とハイフンのみ、1-20文字
   *
   * 🔵 信頼性: requirements.md より
   *
   * @type {string}
   * @required
   */
  readonly envName: string;

  /**
   * バケット名サフィックス (オプション)
   *
   * 【用途】: S3 バケット名のカスタマイズ
   * 【デフォルト】: 'static-content'
   * 【命名規則】: {envName}-{bucketNameSuffix}-{accountId}
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @type {string}
   * @default 'static-content'
   */
  readonly bucketNameSuffix?: string;

  /**
   * バージョニング有効化 (オプション)
   *
   * 【用途】: S3 オブジェクトのバージョン管理
   * 【デフォルト】: true
   *
   * 🔵 信頼性: REQ-031 より
   *
   * @type {boolean}
   * @default true
   */
  readonly versioned?: boolean;

  /**
   * 削除ポリシー (オプション)
   *
   * 【用途】: Stack 削除時のバケット処理
   * 【デフォルト】: cdk.RemovalPolicy.RETAIN
   * 【推奨】: dev 環境は DESTROY、prod 環境は RETAIN
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @type {cdk.RemovalPolicy}
   * @default cdk.RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  /**
   * 自動削除有効化 (オプション)
   *
   * 【用途】: Stack 削除時にバケット内オブジェクトも削除
   * 【デフォルト】: false
   * 【注意】: removalPolicy: DESTROY と組み合わせて使用
   *
   * 🟡 信頼性: 設計文書から妥当な推測
   *
   * @type {boolean}
   * @default false
   */
  readonly autoDeleteObjects?: boolean;
}
```

---

## 4. 公開プロパティ定義

```typescript
/**
 * S3BucketConstruct の公開プロパティ
 *
 * 【設計方針】: CloudFront 連携に必要な全プロパティを公開
 */

/**
 * S3 バケット
 *
 * 【用途】: CloudFront Origin 設定、バケットポリシー追加
 * 【参照元】: CloudFrontConstruct
 *
 * 🔵 信頼性: note.md 公開プロパティより
 *
 * @readonly
 * @type {s3.IBucket}
 */
public readonly bucket: s3.IBucket;

/**
 * バケット ARN
 *
 * 【用途】: IAM ポリシー、CloudFormation 出力
 * 【参照元】: バケットポリシー設定
 *
 * 🔵 信頼性: note.md 公開プロパティより
 *
 * @readonly
 * @type {string}
 */
public readonly bucketArn: string;

/**
 * バケットドメイン名
 *
 * 【用途】: CloudFront Origin 設定
 * 【形式】: {bucket-name}.s3.{region}.amazonaws.com
 *
 * 🔵 信頼性: note.md 公開プロパティより
 *
 * @readonly
 * @type {string}
 */
public readonly bucketDomainName: string;

/**
 * バケット名
 *
 * 【用途】: ログ出力、識別
 *
 * 🔵 信頼性: note.md 公開プロパティより
 *
 * @readonly
 * @type {string}
 */
public readonly bucketName: string;

/**
 * Origin Access Control (OAC)
 *
 * 【用途】: CloudFront Distribution 設定
 * 【参照元】: CloudFrontConstruct
 *
 * 🔵 信頼性: note.md 公開プロパティより
 *
 * @readonly
 * @type {cloudfront.CfnOriginAccessControl}
 */
public readonly originAccessControl: cloudfront.CfnOriginAccessControl;

/**
 * OAC ID
 *
 * 【用途】: CloudFront Distribution OAC 設定
 * 【参照元】: CloudFrontConstruct
 *
 * 🔵 信頼性: note.md 公開プロパティより
 *
 * @readonly
 * @type {string}
 */
public readonly originAccessControlId: string;
```

---

## 5. 公開メソッド定義

```typescript
/**
 * CloudFront バケットポリシー追加
 *
 * 【用途】: CloudFront Distribution 作成後にバケットポリシーを追加
 * 【背景】: S3 と CloudFront の循環参照を解決
 *
 * 🟡 信頼性: note.md 循環参照対応より
 *
 * @param {string} distributionArn - CloudFront Distribution の ARN
 * @returns {void}
 *
 * @example
 * ```typescript
 * // S3BucketConstruct 作成後
 * const s3Bucket = new S3BucketConstruct(this, 'S3Bucket', {
 *   envName: 'dev',
 * });
 *
 * // CloudFrontConstruct 作成後
 * const cloudfront = new CloudFrontConstruct(this, 'CloudFront', {
 *   s3Bucket: s3Bucket.bucket,
 *   oac: s3Bucket.originAccessControl,
 *   // ...
 * });
 *
 * // バケットポリシー追加
 * s3Bucket.addCloudFrontBucketPolicy(cloudfront.distribution.distributionArn);
 * ```
 */
public addCloudFrontBucketPolicy(distributionArn: string): void;
```

---

## 6. デフォルト値定義

| プロパティ | デフォルト値 | 信頼性 | 根拠 |
|-----------|-------------|--------|------|
| `bucketNameSuffix` | `'static-content'` | 🟡 | 設計文書より妥当な推測 |
| `versioned` | `true` | 🔵 | REQ-031 |
| `removalPolicy` | `cdk.RemovalPolicy.RETAIN` | 🟡 | 本番環境でのデータ保護 |
| `autoDeleteObjects` | `false` | 🟡 | 安全なデフォルト |
| OAC `signingBehavior` | `'always'` | 🔵 | REQ-032 |
| OAC `signingProtocol` | `'sigv4'` | 🔵 | REQ-032 |
| OAC `originAccessControlOriginType` | `'s3'` | 🔵 | REQ-032 |
| BlockPublicAccess | `BLOCK_ALL` | 🔵 | REQ-031, NFR-104 |
| BucketEncryption | `S3_MANAGED` | 🔵 | REQ-031 |

---

## 7. 制約事項 (Constraints)

### 7.1 技術的制約

| 項目 | 制約内容 | 信頼性 | 参照元 |
|------|----------|--------|--------|
| IaC | AWS CDK v2 (TypeScript) | 🔵 | REQ-401 |
| リージョン | ap-northeast-1 (Tokyo) | 🔵 | REQ-403 |
| S3 暗号化 | S3_MANAGED (AES-256) のみ | 🔵 | REQ-031 |
| パブリックアクセス | 完全ブロック必須 | 🔵 | REQ-031, NFR-104 |
| OAC 署名 | SigV4 必須 | 🔵 | REQ-032 |

### 7.2 命名制約

| リソース | 命名規則 | 例 | 信頼性 |
|----------|----------|-----|--------|
| S3 バケット | `{envName}-{suffix}-{accountId}` | `dev-static-content-123456789012` | 🟡 |
| OAC | `{envName}-oac` | `dev-oac` | 🟡 |

### 7.3 OAC vs OAI の選択理由

| 項目 | OAC (選択) | OAI (非選択) | 信頼性 |
|------|------------|--------------|--------|
| SigV4 署名 | サポート | 非サポート | 🔵 |
| SSE-KMS | サポート | 限定的 | 🔵 |
| 複数バケット | 1つの OAC で複数バケット可 | バケットごとに必要 | 🔵 |
| AWS 推奨 | 推奨 (新方式) | レガシー | 🔵 |

### 7.4 循環参照の解決

**課題**: S3BucketConstruct 作成時に CloudFront Distribution ARN が必要だが、CloudFront は S3 Bucket を参照する必要がある

**解決策**:
1. S3BucketConstruct でバケットと OAC を作成
2. CloudFrontConstruct でバケットと OAC を参照して Distribution を作成
3. S3BucketConstruct の `addCloudFrontBucketPolicy()` メソッドで CloudFront Distribution ARN を後から設定

信頼性: 🟡 *note.md 設計より*

---

## 8. エッジケース

### 8.1 入力エッジケース

| ID | エッジケース | 期待動作 | 信頼性 |
|----|-------------|----------|--------|
| EDGE-INPUT-001 | envName が空文字列 | エラースロー | 🟡 |
| EDGE-INPUT-002 | envName が 21 文字以上 | エラースロー | 🟡 |
| EDGE-INPUT-003 | envName に特殊文字含む | エラースロー | 🟡 |
| EDGE-INPUT-004 | envName がハイフンで開始 | エラースロー | 🟡 |
| EDGE-INPUT-005 | envName がハイフンで終了 | エラースロー | 🟡 |
| EDGE-INPUT-006 | bucketNameSuffix が空文字列 | デフォルト値使用 | 🟡 |

### 8.2 構成エッジケース

| ID | エッジケース | 期待動作 | 信頼性 |
|----|-------------|----------|--------|
| EDGE-CONFIG-001 | 複数環境で同一アカウントに作成 | バケット名の一意性で区別 | 🟡 |
| EDGE-CONFIG-002 | `addCloudFrontBucketPolicy()` 複数回呼び出し | ポリシーが追加される | 🟡 |
| EDGE-CONFIG-003 | CloudFront なしで使用 | OAC は作成されるがポリシーなし | 🟡 |

---

## 9. テスト要件サマリー

### 9.1 S3 バケットテスト (TC-S3-xxx)

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-S3-001 | S3 バケットリソースが作成されること | REQ-S3-001 | 🔵 |
| TC-S3-002 | BlockPublicAcls が true であること | REQ-S3-003 | 🔵 |
| TC-S3-003 | BlockPublicPolicy が true であること | REQ-S3-003 | 🔵 |
| TC-S3-004 | IgnorePublicAcls が true であること | REQ-S3-003 | 🔵 |
| TC-S3-005 | RestrictPublicBuckets が true であること | REQ-S3-003 | 🔵 |
| TC-S3-006 | サーバーサイド暗号化が S3_MANAGED であること | REQ-S3-004 | 🔵 |
| TC-S3-007 | バージョニングが有効であること（デフォルト） | REQ-S3-005 | 🔵 |
| TC-S3-008 | バージョニングを無効化できること | REQ-S3-005 | 🟡 |
| TC-S3-009 | 削除ポリシーがデフォルトで RETAIN であること | REQ-S3-006 | 🟡 |
| TC-S3-010 | 削除ポリシーを DESTROY に設定できること | REQ-S3-006 | 🟡 |

### 9.2 OAC テスト (TC-OAC-xxx)

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-OAC-001 | OAC リソースが作成されること | REQ-OAC-001 | 🔵 |
| TC-OAC-002 | signingBehavior が 'always' であること | REQ-OAC-002 | 🔵 |
| TC-OAC-003 | signingProtocol が 'sigv4' であること | REQ-OAC-003 | 🔵 |
| TC-OAC-004 | originAccessControlOriginType が 's3' であること | REQ-OAC-004 | 🔵 |
| TC-OAC-005 | OAC 名が命名規則に従っていること | REQ-OAC-005 | 🟡 |
| TC-OAC-006 | OAC ID が取得可能であること | REQ-OAC-006 | 🔵 |

### 9.3 バケットポリシーテスト (TC-BP-xxx)

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-BP-001 | `addCloudFrontBucketPolicy()` でポリシーが追加されること | REQ-BP-001 | 🔵 |
| TC-BP-002 | Principal が cloudfront.amazonaws.com であること | REQ-BP-002 | 🔵 |
| TC-BP-003 | Action が s3:GetObject であること | REQ-BP-003 | 🔵 |
| TC-BP-004 | Condition で aws:SourceArn が設定されること | REQ-BP-004 | 🔵 |
| TC-BP-005 | Resource が正しい形式であること | REQ-BP-005 | 🔵 |

### 9.4 バリデーションテスト (TC-VAL-xxx)

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-VAL-001 | envName が空の場合エラーとなること | REQ-VAL-001 | 🟡 |
| TC-VAL-002 | envName が長すぎる場合エラーとなること | REQ-VAL-002 | 🟡 |
| TC-VAL-003 | envName が不正な形式の場合エラーとなること | REQ-VAL-003 | 🟡 |
| TC-VAL-004 | デフォルト値が正しく適用されること | - | 🔵 |
| TC-VAL-005 | オプションパラメータが正しく反映されること | - | 🔵 |

### 9.5 プロパティテスト (TC-PROP-xxx)

| テストID | テスト内容 | 関連要件 | 信頼性 |
|----------|-----------|----------|--------|
| TC-PROP-001 | bucket プロパティが参照可能であること | REQ-PROP-001 | 🔵 |
| TC-PROP-002 | bucketArn プロパティが参照可能であること | REQ-PROP-002 | 🔵 |
| TC-PROP-003 | bucketDomainName プロパティが参照可能であること | REQ-PROP-003 | 🔵 |
| TC-PROP-004 | originAccessControl プロパティが参照可能であること | REQ-PROP-004 | 🔵 |
| TC-PROP-005 | originAccessControlId プロパティが参照可能であること | REQ-PROP-005 | 🔵 |

---

## 10. 信頼性レベルサマリー

### 機能要件

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青 | 21 | 81% |
| 🟡 黄 | 5 | 19% |
| 🔴 赤 | 0 | 0% |

### 非機能要件

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青 | 6 | 67% |
| 🟡 黄 | 2 | 22% |
| 🔴 赤 | 1 | 11% |

### テスト要件

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青 | 21 | 75% |
| 🟡 黄 | 7 | 25% |
| 🔴 赤 | 0 | 0% |

### 総合評価

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青 | 48 | 77% |
| 🟡 黄 | 14 | 22% |
| 🔴 赤 | 1 | 1% |

**品質評価**: 高品質 - 大部分の要件が REQ-031, REQ-032, NFR-104 により確認済み

---

## 11. 次のステップ

1. `/tsumiki:tdd-testcases` - 本要件に基づくテストケース作成
2. `/tsumiki:tdd-red` - テスト実装（失敗確認）
3. `/tsumiki:tdd-green` - 最小実装
4. `/tsumiki:tdd-refactor` - リファクタリング
5. `/tsumiki:tdd-verify-complete` - 品質確認

---

## 12. 参照ファイル一覧

### 仕様書

- `docs/tasks/aws-cdk-serverless-architecture/TASK-0018.md`
- `docs/spec/aws-cdk-serverless-architecture/requirements.md`

### 設計書

- `docs/design/aws-cdk-serverless-architecture/architecture.md`

### 実装参照（パターン）

- `infra/lib/construct/security/waf-construct.ts` (Props, バリデーション, 定数定義パターン)
- `infra/lib/construct/alb/alb-construct.ts` (Props, 公開プロパティパターン)

### 実装ファイル（作成予定）

- `infra/lib/construct/storage/s3-bucket-construct.ts`
- `infra/test/construct/storage/s3-bucket-construct.test.ts`
