# AWS CDK サーバーレスWebサービスアーキテクチャ 受け入れ基準

**作成日**: 2026-01-12
**関連要件定義**: [requirements.md](requirements.md)
**関連ユーザストーリー**: [user-stories.md](user-stories.md)
**ヒアリング記録**: [interview-record.md](interview-record.md)

**【信頼性レベル凡例】**:
- 🔵 **青信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングを参考にした確実な基準
- 🟡 **黄信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングから妥当な推測による基準
- 🔴 **赤信号**: PRD・EARS要件定義書・設計文書・ユーザヒアリングにない推測による基準

---

## REQ-001〜007: VPC & ネットワーク基盤 🔵

**信頼性**: 🔵 *requirements.md 3.1節より*

### Given（前提条件）
- AWS アカウントが利用可能
- ap-northeast-1 リージョンが選択されている
- CDK Bootstrap が完了している

### When（実行条件）
- VPC Stack をデプロイする

### Then（期待結果）
- CIDR `10.0.0.0/16` の VPC が作成される
- 2つの AZ にそれぞれ Public/Private App/Private DB Subnet が作成される
- Internet Gateway が VPC にアタッチされる
- NAT Gateway が各 AZ に 1 つずつ作成される

### テストケース

#### 正常系

- [ ] **TC-VPC-01**: VPC が CIDR 10.0.0.0/16 で作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: VPC の CIDR Block が `10.0.0.0/16` である
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-VPC-02**: Public Subnet が /24 で各 AZ に作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: 各 AZ に /24 の Public Subnet が存在する
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-VPC-03**: Private App Subnet が /23 で各 AZ に作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: 各 AZ に /23 の Private App Subnet が存在する
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-VPC-04**: Private DB Subnet が /24 で各 AZ に作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: 各 AZ に /24 の Private DB Subnet が存在する
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-VPC-05**: NAT Gateway が各 AZ に 1 つずつ作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: NAT Gateway が 2 つ存在する
  - **信頼性**: 🔵 *requirements.md 3.1節より*

#### 異常系

- [ ] **TC-VPC-E01**: CIDR が重複する場合エラーになる 🟡
  - **入力**: 既存 VPC と CIDR が重複する状態でデプロイ
  - **期待結果**: CloudFormation エラーが発生する
  - **信頼性**: 🟡 *AWS 仕様から妥当な推測*

---

## REQ-008〜011: VPC Endpoints 🔵

**信頼性**: 🔵 *requirements.md 3.1節より*

### Given（前提条件）
- VPC とサブネットが作成済み

### When（実行条件）
- VPC Endpoints をデプロイする

### Then（期待結果）
- Systems Manager 用 Endpoints が作成される
- ECR 用 Endpoints が作成される
- CloudWatch Logs 用 Endpoint が作成される
- S3 Gateway Endpoint が作成される

### テストケース

#### 正常系

- [ ] **TC-VPCE-01**: SSM Interface Endpoints が作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: ssm, ssmmessages, ec2messages の Endpoint が存在する
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-VPCE-02**: ECR Interface Endpoints が作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: ecr.api, ecr.dkr の Endpoint が存在する
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-VPCE-03**: CloudWatch Logs Interface Endpoint が作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: logs の Endpoint が存在する
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-VPCE-04**: S3 Gateway Endpoint が作成される 🔵
  - **入力**: VPC Stack デプロイ
  - **期待結果**: S3 Gateway Endpoint が存在し、ルートテーブルに追加されている
  - **信頼性**: 🔵 *requirements.md 3.1節より*

---

## REQ-012〜021: ECS Fargate 🔵

**信頼性**: 🔵 *requirements.md 3.2節・ユーザヒアリングより*

### Given（前提条件）
- VPC とサブネットが作成済み
- ECR にコンテナイメージが Push 済み

### When（実行条件）
- ECS Stack をデプロイする

### Then（期待結果）
- ECS クラスターが作成される（Container Insights 有効）
- Task Definition が作成される（App + Sidecar）
- ECS Service が作成される（Desired Count: 2）

### テストケース

#### 正常系

- [ ] **TC-ECS-01**: ECS クラスターが作成され Container Insights が有効 🔵
  - **入力**: ECS Stack デプロイ
  - **期待結果**: クラスターが存在し、Container Insights が有効
  - **信頼性**: 🔵 *requirements.md 3.2節より*

- [ ] **TC-ECS-02**: Task Definition が 0.5 vCPU / 1GB で作成される 🔵
  - **入力**: ECS Stack デプロイ
  - **期待結果**: CPU: 512, Memory: 1024 の Task Definition が存在する
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-ECS-03**: Task Definition に App Container が含まれる 🔵
  - **入力**: ECS Stack デプロイ
  - **期待結果**: App Container が定義されている
  - **信頼性**: 🔵 *requirements.md 3.2節より*

- [ ] **TC-ECS-04**: Task Definition に Sidecar Container が含まれる 🔵
  - **入力**: ECS Stack デプロイ
  - **期待結果**: Alpine ベースの Sidecar Container が定義されている
  - **信頼性**: 🔵 *requirements.md 3.2節より*

- [ ] **TC-ECS-05**: Task Role に SSM 権限が付与されている 🔵
  - **入力**: ECS Stack デプロイ
  - **期待結果**: Task Role に `AmazonSSMManagedInstanceCore` がアタッチされている
  - **信頼性**: 🔵 *requirements.md 3.2節より*

- [ ] **TC-ECS-06**: ECS Service で ECS Exec が有効 🔵
  - **入力**: ECS Stack デプロイ
  - **期待結果**: `enableExecuteCommand: true` が設定されている
  - **信頼性**: 🔵 *requirements.md 3.2節より*

- [ ] **TC-ECS-07**: ECS Service の Desired Count が 2 以上 🔵
  - **入力**: ECS Stack デプロイ
  - **期待結果**: Desired Count >= 2
  - **信頼性**: 🔵 *requirements.md 3.2節より*

- [ ] **TC-ECS-08**: Frontend と Backend が別々の Service として作成される 🔵
  - **入力**: ECS Stack デプロイ
  - **期待結果**: 2 つの ECS Service が存在する
  - **信頼性**: 🔵 *ユーザヒアリングより*

#### 異常系

- [ ] **TC-ECS-E01**: ECR イメージが存在しない場合タスク起動に失敗する 🟡
  - **入力**: 存在しない ECR イメージを指定してデプロイ
  - **期待結果**: タスクが起動に失敗し、イベントにエラーが記録される
  - **信頼性**: 🟡 *ECS 仕様から妥当な推測*

---

## REQ-022〜027: Aurora MySQL Serverless v2 🔵

**信頼性**: 🔵 *requirements.md 3.3節・ユーザヒアリングより*

### Given（前提条件）
- VPC と DB Subnet が作成済み
- Security Group が作成済み

### When（実行条件）
- Database Stack をデプロイする

### Then（期待結果）
- Aurora MySQL Serverless v2 クラスターが作成される
- Private DB Subnet に配置される
- ECS からの 3306 のみ許可される
- Storage Encryption が有効
- 自動バックアップが有効

### テストケース

#### 正常系

- [ ] **TC-DB-01**: Aurora MySQL Serverless v2 クラスターが作成される 🔵
  - **入力**: Database Stack デプロイ
  - **期待結果**: Aurora Serverless v2 クラスターが存在する
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-DB-02**: Aurora が Private DB Subnet に配置される 🔵
  - **入力**: Database Stack デプロイ
  - **期待結果**: DB インスタンスが Private DB Subnet に存在する
  - **信頼性**: 🔵 *requirements.md 3.3節より*

- [ ] **TC-DB-03**: Security Group で ECS からの 3306 のみ許可 🔵
  - **入力**: Database Stack デプロイ
  - **期待結果**: Inbound ルールが ECS SG からの 3306 のみ
  - **信頼性**: 🔵 *requirements.md 3.3節より*

- [ ] **TC-DB-04**: Storage Encryption が有効 🔵
  - **入力**: Database Stack デプロイ
  - **期待結果**: `storageEncrypted: true`
  - **信頼性**: 🔵 *requirements.md 3.3節より*

- [ ] **TC-DB-05**: 自動バックアップが有効 🔵
  - **入力**: Database Stack デプロイ
  - **期待結果**: Backup Retention Period > 0
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-DB-06**: Secrets Manager でクレデンシャルが管理される 🟡
  - **入力**: Database Stack デプロイ
  - **期待結果**: Secrets Manager にシークレットが存在する
  - **信頼性**: 🟡 *AWS ベストプラクティスから妥当な推測*

#### 異常系

- [ ] **TC-DB-E01**: 外部からの直接接続が拒否される 🔵
  - **入力**: インターネットから Aurora エンドポイントに接続
  - **期待結果**: 接続が拒否される
  - **信頼性**: 🔵 *requirements.md 3.3節より*

---

## REQ-028〜034: セキュリティ & ロードバランシング 🔵

**信頼性**: 🔵 *requirements.md 3.4節・ユーザヒアリングより*

### Given（前提条件）
- VPC と Public Subnet が作成済み
- ACM で証明書が発行済み

### When（実行条件）
- Security Stack と Distribution Stack をデプロイする

### Then（期待結果）
- ALB が Public Subnet に作成される
- HTTP→HTTPS リダイレクトが設定される
- CloudFront + S3 が作成される
- WAF が CloudFront に接続される

### テストケース

#### 正常系

- [ ] **TC-ALB-01**: ALB が Public Subnet に Internet-facing で作成される 🔵
  - **入力**: Security Stack デプロイ
  - **期待結果**: ALB が Public Subnet に存在し、scheme が internet-facing
  - **信頼性**: 🔵 *requirements.md 3.4節より*

- [ ] **TC-ALB-02**: HTTP→HTTPS リダイレクトが設定される 🔵
  - **入力**: HTTP でアクセス
  - **期待結果**: HTTPS にリダイレクトされる
  - **信頼性**: 🔵 *requirements.md 3.4節より*

- [ ] **TC-ALB-03**: ACM 証明書が使用される 🔵
  - **入力**: Security Stack デプロイ
  - **期待結果**: HTTPS リスナーに ACM 証明書がアタッチされている
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-CF-01**: CloudFront ディストリビューションが作成される 🔵
  - **入力**: Distribution Stack デプロイ
  - **期待結果**: CloudFront ディストリビューションが存在する
  - **信頼性**: 🔵 *requirements.md 3.4節より*

- [ ] **TC-CF-02**: S3 バケットが OAC で保護される 🔵
  - **入力**: Distribution Stack デプロイ
  - **期待結果**: S3 バケットポリシーが CloudFront からのみアクセス許可
  - **信頼性**: 🔵 *requirements.md 3.4節より*

- [ ] **TC-WAF-01**: WAF が CloudFront に接続される 🔵
  - **入力**: Security Stack デプロイ
  - **期待結果**: WAF Web ACL が CloudFront に関連付けられている
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-WAF-02**: AWS Managed Rules が適用される 🔵
  - **入力**: Security Stack デプロイ
  - **期待結果**: Common RuleSet, SQL Injection ルールが適用されている
  - **信頼性**: 🔵 *requirements.md 3.4節より*

---

## REQ-035〜039: モニタリング & 運用 🔵

**信頼性**: 🔵 *requirements.md 3.5節・ユーザヒアリングより*

### Given（前提条件）
- ECS、RDS が作成済み
- Slack ワークスペースが設定済み

### When（実行条件）
- Ops Stack をデプロイする

### Then（期待結果）
- CloudWatch Logs が設定される
- ログ保持期間が環境別に設定される
- CloudWatch アラームが作成される
- AWS Chatbot で Slack 通知が設定される

### テストケース

#### 正常系

- [ ] **TC-LOG-01**: ECS ログが CloudWatch Logs に収集される 🔵
  - **入力**: ECS タスクを実行
  - **期待結果**: CloudWatch Logs にログが出力される
  - **信頼性**: 🔵 *requirements.md 3.5節より*

- [ ] **TC-LOG-02**: Dev 環境でログ保持期間が 3 日 🔵
  - **入力**: Dev 環境デプロイ
  - **期待結果**: ロググループの Retention が 3 日
  - **信頼性**: 🔵 *requirements.md 3.5節より*

- [ ] **TC-LOG-03**: Prod 環境でログ保持期間が 30 日 🔵
  - **入力**: Prod 環境デプロイ
  - **期待結果**: ロググループの Retention が 30 日
  - **信頼性**: 🔵 *requirements.md 3.5節より*

- [ ] **TC-LOG-04**: Prod ログが S3 Glacier に長期保存される 🔵
  - **入力**: 30 日経過後
  - **期待結果**: ログが S3 Glacier に移管される
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-ALERT-01**: CloudWatch アラーム発生時 Slack 通知される 🔵
  - **入力**: アラーム条件を満たす
  - **期待結果**: Slack チャンネルに通知が届く
  - **信頼性**: 🔵 *requirements.md 3.5節より*

---

## REQ-040〜041: CI/CD パイプライン 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

### Given（前提条件）
- ソースリポジトリが設定済み
- ECS Service が作成済み

### When（実行条件）
- CI/CD Stack をデプロイし、コードをプッシュする

### Then（期待結果）
- CodePipeline が作成される
- CodeBuild でビルドが実行される
- ECS にデプロイされる

### テストケース

#### 正常系

- [ ] **TC-CICD-01**: CodePipeline が作成される 🔵
  - **入力**: CI/CD Stack デプロイ
  - **期待結果**: CodePipeline が存在する
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-CICD-02**: コードプッシュでパイプラインが起動する 🟡
  - **入力**: ソースリポジトリにコードをプッシュ
  - **期待結果**: パイプラインが自動起動する
  - **信頼性**: 🟡 *CodePipeline 仕様から妥当な推測*

- [ ] **TC-CICD-03**: ビルド成功後 ECS にデプロイされる 🟡
  - **入力**: パイプライン実行
  - **期待結果**: 新しいタスクがデプロイされる
  - **信頼性**: 🟡 *CodePipeline 仕様から妥当な推測*

---

## REQ-042〜043: 環境構成 🔵

**信頼性**: 🔵 *ユーザヒアリングより*

### Given（前提条件）
- CDK プロジェクトが初期化済み
- parameter.ts が設定済み

### When（実行条件）
- Dev/Prod 環境をデプロイする

### Then（期待結果）
- Dev 環境と Prod 環境が独立して作成される
- 環境別のパラメータが適用される

### テストケース

#### 正常系

- [ ] **TC-ENV-01**: Dev 環境が作成される 🔵
  - **入力**: Dev 環境デプロイ
  - **期待結果**: Dev 用リソースが作成される
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-ENV-02**: Prod 環境が作成される 🔵
  - **入力**: Prod 環境デプロイ
  - **期待結果**: Prod 用リソースが作成される
  - **信頼性**: 🔵 *ユーザヒアリングより*

- [ ] **TC-ENV-03**: 環境別パラメータが適用される 🔵
  - **入力**: 各環境デプロイ
  - **期待結果**: ログ保持期間等が環境別に異なる
  - **信頼性**: 🔵 *ユーザヒアリングより*

---

## 非機能要件テスト

### NFR-001〜004: パフォーマンス 🔵

**信頼性**: 🔵 *requirements.md より*

- [ ] **TC-NFR-001**: Multi-AZ 構成で高可用性が確保される 🔵
  - **測定項目**: AZ 障害時のフェイルオーバー
  - **目標値**: 自動フェイルオーバー
  - **測定条件**: 1 AZ を停止
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-NFR-002**: VPC Endpoint 経由でレイテンシが最適化される 🟡
  - **測定項目**: AWS サービスへのレイテンシ
  - **目標値**: NAT 経由より低レイテンシ
  - **測定条件**: ECR Pull 時間測定
  - **信頼性**: 🟡 *VPC Endpoint 特性から妥当な推測*

### NFR-101〜105: セキュリティ 🔵

**信頼性**: 🔵 *requirements.md 3.3, 3.4節より*

- [ ] **TC-NFR-101**: VPC Endpoint でトラフィックが AWS 内に閉じる 🔵
  - **検証内容**: トラフィックがインターネットを経由しない
  - **期待結果**: VPC Flow Logs で確認
  - **信頼性**: 🔵 *requirements.md 3.1節より*

- [ ] **TC-NFR-102**: Aurora Storage が暗号化される 🔵
  - **検証内容**: Storage Encryption の状態
  - **期待結果**: 暗号化が有効
  - **信頼性**: 🔵 *requirements.md 3.3節より*

- [ ] **TC-NFR-103**: WAF で一般的な攻撃がブロックされる 🔵
  - **検証内容**: SQL Injection 攻撃
  - **期待結果**: リクエストがブロックされる
  - **信頼性**: 🔵 *requirements.md 3.4節より*

- [ ] **TC-NFR-105**: HTTP アクセスが HTTPS にリダイレクトされる 🔵
  - **検証内容**: HTTP でのアクセス
  - **期待結果**: HTTPS にリダイレクト
  - **信頼性**: 🔵 *requirements.md 3.4節より*

---

## Edge ケーステスト

### EDGE-001: NAT Gateway 障害 🟡

**信頼性**: 🟡 *Multi-AZ 構成から妥当な推測*

- [ ] **TC-EDGE-001**: NAT Gateway 障害時にフェイルオーバーする
  - **条件**: 1 AZ の NAT Gateway が停止
  - **期待結果**: 他の AZ の NAT Gateway にルーティング
  - **信頼性**: 🟡 *Multi-AZ 構成から推測*

### EDGE-002: ECS タスク障害 🟡

**信頼性**: 🟡 *ECS Service 特性から妥当な推測*

- [ ] **TC-EDGE-002**: ECS タスク障害時に新しいタスクが起動する
  - **条件**: タスクが異常終了
  - **期待結果**: 自動的に新しいタスクが起動
  - **信頼性**: 🟡 *ECS Service 特性から推測*

### EDGE-003: Aurora フェイルオーバー 🟡

**信頼性**: 🟡 *Aurora Multi-AZ 特性から妥当な推測*

- [ ] **TC-EDGE-003**: Aurora ライター障害時にフェイルオーバーする
  - **条件**: ライターインスタンスが停止
  - **期待結果**: リーダーがライターに昇格
  - **信頼性**: 🟡 *Aurora Multi-AZ 特性から推測*

---

## テストケースサマリー

### カテゴリ別件数

| カテゴリ | 正常系 | 異常系 | 境界値 | 合計 |
|---------|--------|--------|--------|------|
| VPC & ネットワーク | 5 | 1 | 0 | 6 |
| VPC Endpoints | 4 | 0 | 0 | 4 |
| ECS Fargate | 8 | 1 | 0 | 9 |
| Aurora MySQL | 6 | 1 | 0 | 7 |
| セキュリティ & LB | 7 | 0 | 0 | 7 |
| モニタリング | 5 | 0 | 0 | 5 |
| CI/CD | 3 | 0 | 0 | 3 |
| 環境構成 | 3 | 0 | 0 | 3 |
| 非機能要件 | 5 | 0 | 0 | 5 |
| Edge ケース | 0 | 3 | 0 | 3 |
| **合計** | **46** | **6** | **0** | **52** |

### 信頼性レベル分布

- 🔵 青信号: 43件 (83%)
- 🟡 黄信号: 9件 (17%)
- 🔴 赤信号: 0件 (0%)

**品質評価**: ✅ 高品質 - テストケースの大部分が元要件書・ユーザヒアリングにより確認済み

### 優先度別テストケース

- **Must Have**: 39件
- **Should Have**: 13件
- **Could Have**: 0件

---

## テスト実施計画

### Phase 1: 基盤インフラテスト
- VPC & ネットワーク
- VPC Endpoints
- 優先度: Must Have

### Phase 2: コンピューティング・データベーステスト
- ECS Fargate
- Aurora MySQL
- 優先度: Must Have

### Phase 3: セキュリティ・配信テスト
- ALB, CloudFront, WAF
- 優先度: Must Have + Should Have

### Phase 4: 運用・CI/CD テスト
- モニタリング
- CI/CD パイプライン
- 優先度: Should Have

### Phase 5: 非機能・Edge ケーステスト
- パフォーマンス
- セキュリティ
- Edge ケース
- 優先度: Must Have + Should Have
