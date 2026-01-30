# ALB Construct テストケース定義書

**タスクID**: TASK-0016
**機能名**: ALB Construct 実装
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-01-31
**フェーズ**: Phase 3 - アプリケーション

---

## テスト概要

| 項目 | 内容 |
|------|------|
| **テスト対象ファイル** | `infra/lib/construct/alb/alb-construct.ts` |
| **テストファイル** | `infra/test/construct/alb/alb-construct.test.ts` |
| **プログラミング言語** | TypeScript |
| **テストフレームワーク** | Jest + aws-cdk-lib/assertions |
| **総テストケース数** | 24 件 |

---

## 1. 正常系テストケース（基本機能）

### TC-ALB-01: ALB リソース作成確認 🔵

- **テスト名**: ALB リソース作成確認
  - **何をテストするか**: AlbConstruct が必須パラメータで正常に ALB を作成すること
  - **期待される動作**: `AWS::ElasticLoadBalancingV2::LoadBalancer` リソースが 1 つ作成される
- **入力値**:
  - `vpc`: テスト用 VPC
  - `securityGroup`: テスト用 Security Group
  - `certificateArn`: `'arn:aws:acm:ap-northeast-1:123456789012:certificate/test-cert'`
  - **入力データの意味**: 必須パラメータのみでの最小構成テスト
- **期待される結果**: ALB リソースが 1 つ作成される
  - **期待結果の理由**: REQ-028 で ALB 作成が要求されている
- **テストの目的**: Construct の基本動作確認
  - **確認ポイント**: `template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1)`
- 🔵 **信頼性**: REQ-028 より

### TC-ALB-02: Internet-facing 確認 🔵

- **テスト名**: Internet-facing 設定確認
  - **何をテストするか**: ALB が Internet-facing で作成されること
  - **期待される動作**: Scheme が 'internet-facing' に設定される
- **入力値**: 必須パラメータのみ（デフォルト設定）
  - **入力データの意味**: デフォルトで Internet-facing が有効であることを確認
- **期待される結果**: `Scheme: 'internet-facing'`
  - **期待結果の理由**: REQ-028 で Internet-facing が要求されている
- **テストの目的**: ALB の公開設定確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', { Scheme: 'internet-facing' })`
- 🔵 **信頼性**: REQ-028 より

### TC-ALB-03: ALB Type 確認 🔵

- **テスト名**: ALB Type 設定確認
  - **何をテストするか**: ALB の Type が 'application' であること
  - **期待される動作**: Type が 'application' に設定される
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: Application Load Balancer として作成されることを確認
- **期待される結果**: `Type: 'application'`
  - **期待結果の理由**: ECS Service への HTTP/HTTPS ルーティングに ALB が必要
- **テストの目的**: ロードバランサータイプ確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', { Type: 'application' })`
- 🔵 **信頼性**: REQ-028 より

### TC-ALB-04: Public Subnet 配置確認 🔵

- **テスト名**: Public Subnet 配置確認
  - **何をテストするか**: ALB が Public Subnet に配置されること
  - **期待される動作**: Subnets に Public Subnet の参照が設定される
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: Internet-facing ALB は Public Subnet に配置が必須
- **期待される結果**: ALB の Subnets プロパティに Public Subnet が設定される
  - **期待結果の理由**: REQ-028 で Public Subnet 配置が要求されている
- **テストの目的**: ネットワーク配置確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', { Subnets: Match.anyValue() })`
- 🔵 **信頼性**: REQ-028 より

---

## 2. Listener テストケース

### TC-ALB-05: HTTP Listener 作成確認 🔵

- **テスト名**: HTTP Listener 作成確認
  - **何をテストするか**: Port 80 の HTTP Listener が作成されること
  - **期待される動作**: `AWS::ElasticLoadBalancingV2::Listener` リソースが Port 80 で作成される
- **入力値**: 必須パラメータのみ（デフォルト設定）
  - **入力データの意味**: HTTP→HTTPS リダイレクト用の Listener
- **期待される結果**: `Port: 80`, `Protocol: 'HTTP'`
  - **期待結果の理由**: REQ-029 で HTTP リクエストの受け入れが要求されている
- **テストの目的**: HTTP Listener 存在確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', { Port: 80, Protocol: 'HTTP' })`
- 🔵 **信頼性**: REQ-029 より

### TC-ALB-06: HTTP → HTTPS リダイレクト確認 🔵

- **テスト名**: HTTP → HTTPS リダイレクト確認
  - **何をテストするか**: HTTP Listener がリダイレクトアクションを持つこと
  - **期待される動作**: DefaultActions に Redirect アクションが設定される
- **入力値**: 必須パラメータのみ（デフォルト設定）
  - **入力データの意味**: セキュリティのため HTTP は HTTPS にリダイレクト
- **期待される結果**: リダイレクトアクション（StatusCode: 'HTTP_301', Port: '443', Protocol: 'HTTPS'）
  - **期待結果の理由**: REQ-029 で HTTP→HTTPS リダイレクトが要求されている
- **テストの目的**: リダイレクト設定確認
  - **確認ポイント**: `DefaultActions` に `Type: 'redirect'` が含まれる
- 🔵 **信頼性**: REQ-029 より

### TC-ALB-07: HTTPS Listener 作成確認 🔵

- **テスト名**: HTTPS Listener 作成確認
  - **何をテストするか**: Port 443 の HTTPS Listener が作成されること
  - **期待される動作**: `AWS::ElasticLoadBalancingV2::Listener` リソースが Port 443 で作成される
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: HTTPS トラフィックを受け入れる Listener
- **期待される結果**: `Port: 443`, `Protocol: 'HTTPS'`
  - **期待結果の理由**: REQ-028 で HTTPS Listener が要求されている
- **テストの目的**: HTTPS Listener 存在確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', { Port: 443, Protocol: 'HTTPS' })`
- 🔵 **信頼性**: REQ-028 より

### TC-ALB-08: ACM Certificate 設定確認 🔵

- **テスト名**: ACM Certificate 設定確認
  - **何をテストするか**: HTTPS Listener に ACM 証明書が設定されること
  - **期待される動作**: Certificates プロパティに証明書 ARN が設定される
- **入力値**: `certificateArn: 'arn:aws:acm:ap-northeast-1:123456789012:certificate/test-cert'`
  - **入力データの意味**: SSL/TLS 終端に使用する ACM 証明書
- **期待される結果**: 指定した証明書 ARN が Certificates に設定される
  - **期待結果の理由**: REQ-030 で ACM 証明書管理が要求されている
- **テストの目的**: 証明書関連付け確認
  - **確認ポイント**: `Certificates` 配列に `CertificateArn` が含まれる
- 🔵 **信頼性**: REQ-030 より

---

## 3. Target Group テストケース

### TC-ALB-09: Target Group 作成確認 🔵

- **テスト名**: Target Group 作成確認
  - **何をテストするか**: Target Group が作成されること
  - **期待される動作**: `AWS::ElasticLoadBalancingV2::TargetGroup` リソースが 1 つ作成される
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: ECS Service へのルーティング先
- **期待される結果**: Target Group リソースが 1 つ作成される
  - **期待結果の理由**: ALB から ECS Service へのルーティングに必要
- **テストの目的**: Target Group 存在確認
  - **確認ポイント**: `template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1)`
- 🔵 **信頼性**: REQ-028 より

### TC-ALB-10: Target Type 確認 🔵

- **テスト名**: Target Type 設定確認
  - **何をテストするか**: Target Group の Target Type が 'ip' であること
  - **期待される動作**: TargetType が 'ip' に設定される
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: Fargate タスクは IP ベースでターゲット登録
- **期待される結果**: `TargetType: 'ip'`
  - **期待結果の理由**: ECS Fargate は awsvpc ネットワークモードで IP ベース
- **テストの目的**: Fargate 互換性確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', { TargetType: 'ip' })`
- 🔵 **信頼性**: 設計文書より

### TC-ALB-11: Health Check Path 確認 🟡

- **テスト名**: Health Check Path 設定確認
  - **何をテストするか**: ヘルスチェックパスが設定されること
  - **期待される動作**: HealthCheckPath が設定される
- **入力値**: デフォルト設定（`healthCheckPath` 未指定）
  - **入力データの意味**: デフォルトのヘルスチェックパス '/health'
- **期待される結果**: `HealthCheckPath: '/health'`
  - **期待結果の理由**: アプリケーションの正常性確認に必要
- **テストの目的**: ヘルスチェック設定確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', { HealthCheckPath: '/health' })`
- 🟡 **信頼性**: 設計文書から妥当な推測

### TC-ALB-12: Health Check 詳細設定確認 🟡

- **テスト名**: Health Check 詳細設定確認
  - **何をテストするか**: ヘルスチェックの詳細パラメータが正しく設定されること
  - **期待される動作**: HealthyThresholdCount, UnhealthyThresholdCount, HealthCheckTimeoutSeconds, HealthCheckIntervalSeconds が設定される
- **入力値**: デフォルト設定
  - **入力データの意味**: AWS 推奨のデフォルト値
- **期待される結果**:
  - `HealthyThresholdCount: 2`
  - `UnhealthyThresholdCount: 2`
  - `HealthCheckTimeoutSeconds: 5`
  - `HealthCheckIntervalSeconds: 30`
  - **期待結果の理由**: AWS デフォルト値に基づく設定
- **テストの目的**: ヘルスチェック詳細確認
  - **確認ポイント**: 各ヘルスチェックパラメータの値を検証
- 🟡 **信頼性**: AWS デフォルト値から妥当な推測

---

## 4. Security 設定テストケース

### TC-ALB-13: Security Group 関連付け確認 🔵

- **テスト名**: Security Group 関連付け確認
  - **何をテストするか**: ALB に Security Group が関連付けられること
  - **期待される動作**: SecurityGroups プロパティに Security Group 参照が設定される
- **入力値**: `securityGroup`: テスト用 Security Group
  - **入力データの意味**: TASK-0005 で作成した ALB Security Group
- **期待される結果**: SecurityGroups に Security Group の参照が含まれる
  - **期待結果の理由**: ALB のネットワークアクセス制御に必要
- **テストの目的**: Security Group 関連付け確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', { SecurityGroups: Match.anyValue() })`
- 🔵 **信頼性**: TASK-0005 より

### TC-ALB-14: SSL Policy 確認 🔵

- **テスト名**: SSL Policy 設定確認
  - **何をテストするか**: HTTPS Listener に適切な SSL Policy が設定されること
  - **期待される動作**: SslPolicy が設定される（TLS 1.2 以上）
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: セキュリティベストプラクティスに基づく TLS 設定
- **期待される結果**: `SslPolicy` が設定される（推奨値）
  - **期待結果の理由**: NFR-105 で HTTPS 強制、TLS 1.2 以上が要求されている
- **テストの目的**: TLS セキュリティ確認
  - **確認ポイント**: HTTPS Listener に `SslPolicy` が設定される
- 🔵 **信頼性**: NFR-105 より

---

## 5. デフォルト値テストケース

### TC-ALB-15: Internet-facing デフォルト値確認 🔵

- **テスト名**: Internet-facing デフォルト値確認
  - **何をテストするか**: `internetFacing` 未指定時にデフォルトで true になること
  - **期待される動作**: Scheme が 'internet-facing' に設定される
- **入力値**: `internetFacing` パラメータを省略
  - **入力データの意味**: デフォルト動作の確認
- **期待される結果**: `Scheme: 'internet-facing'`
  - **期待結果の理由**: REQ-028 で Internet-facing がデフォルト
- **テストの目的**: デフォルト値確認
  - **確認ポイント**: パラメータ省略時の動作
- 🔵 **信頼性**: REQ-028 より

### TC-ALB-16: HTTP リダイレクト デフォルト値確認 🔵

- **テスト名**: HTTP リダイレクト デフォルト値確認
  - **何をテストするか**: `enableHttpToHttpsRedirect` 未指定時にデフォルトで true になること
  - **期待される動作**: HTTP Listener にリダイレクトアクションが設定される
- **入力値**: `enableHttpToHttpsRedirect` パラメータを省略
  - **入力データの意味**: デフォルトでリダイレクト有効
- **期待される結果**: HTTP Listener にリダイレクトアクション設定
  - **期待結果の理由**: REQ-029 で HTTP→HTTPS リダイレクトがデフォルト
- **テストの目的**: デフォルト値確認
  - **確認ポイント**: パラメータ省略時の動作
- 🔵 **信頼性**: REQ-029 より

### TC-ALB-17: Target Port デフォルト値確認 🟡

- **テスト名**: Target Port デフォルト値確認
  - **何をテストするか**: `targetPort` 未指定時にデフォルトで 80 になること
  - **期待される動作**: Target Group の Port が 80 に設定される
- **入力値**: `targetPort` パラメータを省略
  - **入力データの意味**: 一般的な HTTP ポート
- **期待される結果**: `Port: 80`
  - **期待結果の理由**: 設計文書でデフォルト 80 と定義
- **テストの目的**: デフォルト値確認
  - **確認ポイント**: `template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', { Port: 80 })`
- 🟡 **信頼性**: 設計文書から妥当な推測

### TC-ALB-18: Health Check Path デフォルト値確認 🟡

- **テスト名**: Health Check Path デフォルト値確認
  - **何をテストするか**: `healthCheckPath` 未指定時にデフォルトで '/health' になること
  - **期待される動作**: HealthCheckPath が '/health' に設定される
- **入力値**: `healthCheckPath` パラメータを省略
  - **入力データの意味**: 一般的なヘルスチェックエンドポイント
- **期待される結果**: `HealthCheckPath: '/health'`
  - **期待結果の理由**: 設計文書でデフォルト '/health' と定義
- **テストの目的**: デフォルト値確認
  - **確認ポイント**: パラメータ省略時の動作
- 🟡 **信頼性**: 設計文書から妥当な推測

---

## 6. 公開プロパティテストケース

### TC-ALB-19: loadBalancer プロパティ確認 🔵

- **テスト名**: loadBalancer プロパティ確認
  - **何をテストするか**: Construct から loadBalancer プロパティにアクセスできること
  - **期待される動作**: loadBalancer プロパティが IApplicationLoadBalancer 型で定義されている
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: 出力プロパティの可用性確認
- **期待される結果**: `albConstruct.loadBalancer` が undefined でない
  - **期待結果の理由**: 外部から ALB リソースへのアクセスが必要
- **テストの目的**: プロパティ定義確認
  - **確認ポイント**: `expect(albConstruct.loadBalancer).toBeDefined()`
- 🔵 **信頼性**: 要件定義書より

### TC-ALB-20: targetGroup プロパティ確認 🔵

- **テスト名**: targetGroup プロパティ確認
  - **何をテストするか**: Construct から targetGroup プロパティにアクセスできること
  - **期待される動作**: targetGroup プロパティが IApplicationTargetGroup 型で定義されている
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: ECS Service との連携に必要
- **期待される結果**: `albConstruct.targetGroup` が undefined でない
  - **期待結果の理由**: ECS Service に Target Group を渡す必要がある
- **テストの目的**: プロパティ定義確認
  - **確認ポイント**: `expect(albConstruct.targetGroup).toBeDefined()`
- 🔵 **信頼性**: 要件定義書より

### TC-ALB-21: httpsListener プロパティ確認 🔵

- **テスト名**: httpsListener プロパティ確認
  - **何をテストするか**: Construct から httpsListener プロパティにアクセスできること
  - **期待される動作**: httpsListener プロパティが IApplicationListener 型で定義されている
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: HTTPS Listener への参照
- **期待される結果**: `albConstruct.httpsListener` が undefined でない
  - **期待結果の理由**: Listener ルール追加などに必要
- **テストの目的**: プロパティ定義確認
  - **確認ポイント**: `expect(albConstruct.httpsListener).toBeDefined()`
- 🔵 **信頼性**: 要件定義書より

### TC-ALB-22: httpListener プロパティ確認 🔵

- **テスト名**: httpListener プロパティ確認
  - **何をテストするか**: Construct から httpListener プロパティにアクセスできること
  - **期待される動作**: httpListener プロパティが IApplicationListener 型で定義されている
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: HTTP Listener への参照
- **期待される結果**: `albConstruct.httpListener` が undefined でない
  - **期待結果の理由**: HTTP Listener へのアクセスが必要
- **テストの目的**: プロパティ定義確認
  - **確認ポイント**: `expect(albConstruct.httpListener).toBeDefined()`
- 🔵 **信頼性**: 要件定義書より

### TC-ALB-23: dnsName プロパティ確認 🔵

- **テスト名**: dnsName プロパティ確認
  - **何をテストするか**: Construct から dnsName プロパティにアクセスできること
  - **期待される動作**: dnsName プロパティが string 型で定義されている
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: CloudFront Origin 設定に必要
- **期待される結果**: `albConstruct.dnsName` が undefined でない
  - **期待結果の理由**: CloudFront から ALB への接続に DNS 名が必要
- **テストの目的**: プロパティ定義確認
  - **確認ポイント**: `expect(albConstruct.dnsName).toBeDefined()`
- 🔵 **信頼性**: 要件定義書より

---

## 7. スナップショットテストケース

### TC-ALB-24: CloudFormation テンプレート確認 🔵

- **テスト名**: CloudFormation テンプレートスナップショット確認
  - **何をテストするか**: 生成される CloudFormation テンプレートが期待通りであること
  - **期待される動作**: テンプレートがスナップショットと一致する
- **入力値**: 必須パラメータのみ
  - **入力データの意味**: 基本構成でのテンプレート検証
- **期待される結果**: テンプレートがスナップショットと一致
  - **期待結果の理由**: 意図しないテンプレート変更を検出
- **テストの目的**: リグレッション防止
  - **確認ポイント**: `expect(template.toJSON()).toMatchSnapshot()`
- 🔵 **信頼性**: CDK ベストプラクティスより

---

## 8. 開発言語・フレームワーク

### 8.1 プログラミング言語 🔵

- **言語**: TypeScript (strict mode)
  - **言語選択の理由**: REQ-401 で AWS CDK v2 (TypeScript) が指定されている
  - **テストに適した機能**: 型安全性、IntelliSense サポート

### 8.2 テストフレームワーク 🔵

- **フレームワーク**: Jest + aws-cdk-lib/assertions
  - **フレームワーク選択の理由**: AWS CDK 公式テストライブラリ、既存テストパターンとの一貫性
  - **テスト実行環境**: `npm test` コマンドで実行

### 8.3 テスト実行コマンド

```bash
# 全テスト実行
npm test

# 特定テストファイル実行
npm test -- alb-construct.test.ts

# スナップショット更新
npm test -- -u

# カバレッジレポート
npm test -- --coverage
```

---

## 9. テストケース実装時の日本語コメント指針

### 9.1 テストケース開始時のコメント

```typescript
// 【テスト目的】: [このテストで何を確認するかを日本語で明記]
// 【テスト内容】: [具体的にどのような処理をテストするかを説明]
// 【期待される動作】: [正常に動作した場合の結果を説明]
// 🔵🟡🔴 この内容の信頼性レベルを記載
```

### 9.2 Given-When-Then コメント

```typescript
// 【テストデータ準備】: [なぜこのデータを用意するかの理由]
// 【初期条件設定】: [テスト実行前の状態を説明]

// 【実際の処理実行】: [どの機能/メソッドを呼び出すかを説明]
// 【処理内容】: [実行される処理の内容を日本語で説明]

// 【結果検証】: [何を検証するかを具体的に説明]
// 【期待値確認】: [期待される結果とその理由を説明]
```

### 9.3 expect ステートメントのコメント

```typescript
// 【検証項目】: ALB リソースが1つ存在する 🔵
template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);

// 【確認内容】: Internet-facing 設定が有効 🔵
template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
  Scheme: 'internet-facing',
});
```

---

## 10. 要件定義との対応関係

### 10.1 参照した機能要件

| 要件ID | 内容 | 対応テストケース |
|--------|------|------------------|
| REQ-028 | ALB を Public Subnet に配置、Internet-facing | TC-ALB-01〜04, TC-ALB-15 |
| REQ-029 | HTTP→HTTPS リダイレクト | TC-ALB-05〜06, TC-ALB-16 |
| REQ-030 | ACM で SSL 証明書管理 | TC-ALB-07〜08 |

### 10.2 参照した非機能要件

| 要件ID | 内容 | 対応テストケース |
|--------|------|------------------|
| NFR-001 | Multi-AZ 構成による高可用性 | TC-ALB-04 |
| NFR-105 | HTTPS 強制 | TC-ALB-14 |

### 10.3 参照した設計文書

| 文書 | 該当セクション | 対応テストケース |
|------|----------------|------------------|
| `architecture.md` | Application Stack | TC-ALB-01〜04 |
| `interfaces.ts` | `AlbConfig`, `HealthCheckConfig` | TC-ALB-11〜12, TC-ALB-17〜18 |

---

## 11. 信頼性レベルサマリー

| レベル | 件数 | 割合 | 内容 |
|--------|------|------|------|
| 🔵 青信号 | 20 | 83% | 要件定義書・設計文書より確認済み |
| 🟡 黄信号 | 4 | 17% | 妥当な推測によるテストケース |
| 🔴 赤信号 | 0 | 0% | 推測によるテストケースなし |

**品質評価**: ✅ **高品質**
- テストケース分類: 正常系・デフォルト値・公開プロパティ・スナップショットが網羅
- 期待値定義: 各テストケースの期待値が明確
- 技術選択: TypeScript + Jest + aws-cdk-lib/assertions で確定
- 実装可能性: 既存テストパターン (ECS Service, Security Group) を参照可能

---

## 12. 次のステップ

テストケースの洗い出しが完了しました。次のステップ:

```
/tsumiki:tdd-red
```

Red フェーズ（失敗するテストの作成）を開始し、テストファイルを実装します。
