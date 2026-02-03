# TASK-0020: Distribution Stack 統合 - テストケース定義書

**タスクID**: TASK-0020
**機能名**: Distribution Stack 統合
**要件名**: aws-cdk-serverless-architecture
**作成日**: 2026-02-03
**フェーズ**: TDD Red Phase - テストケース定義
**信頼性評価**: 🔵 高品質

---

## 開発言語・フレームワーク

| 項目 | 値 |
|------|-----|
| **プログラミング言語** | TypeScript |
| **テストフレームワーク** | Jest + aws-cdk-lib/assertions |
| **CDK バージョン** | v2 |

**言語選択の理由**: AWS CDK プロジェクトの標準言語、型安全性による品質向上
**フレームワーク選択の理由**: CDK 公式テストライブラリ、CloudFormation テンプレート検証に最適
**テスト実行環境**: Node.js 20.x

🔵 信頼性: プロジェクト技術スタックより

---

## テストファイル情報

| 項目 | パス |
|------|------|
| **テストファイル** | `infra/test/distribution-stack.test.ts` |
| **実装ファイル** | `infra/lib/stack/distribution-stack.ts` |

---

## テストケース一覧サマリー

| カテゴリ | テストケースID | テスト数 | 説明 |
|----------|---------------|----------|------|
| スナップショット | TC-DS-01〜02 | 2 | CloudFormation テンプレート検証 |
| リソース存在確認 | TC-DS-03〜08 | 6 | 各リソースの作成確認 |
| Construct 統合 | TC-DS-09〜14 | 6 | S3, CloudFront, WAF 統合確認 |
| 公開プロパティ | TC-DS-15〜20 | 6 | Stack 公開プロパティ確認 |
| CfnOutput | TC-DS-21〜24 | 4 | CloudFormation Output 確認 |
| 依存関係 | TC-DS-25〜27 | 3 | Stack 間依存関係確認 |
| セキュリティ | TC-DS-28〜30 | 3 | セキュリティ設定確認 |
| オプション設定 | TC-DS-31〜33 | 3 | オプションパラメータ確認 |
| 異常系 | TC-DS-34〜36 | 3 | バリデーションエラー確認 |
| **合計** | | **36** | |

---

## 1. スナップショットテスト

### TC-DS-01: スナップショットテスト（devConfig） 🔵

**信頼性**: 🔵 *CDK ベストプラクティス、application-stack.test.ts パターンより*

- **テスト名**: CloudFormation テンプレートのスナップショットテスト（Dev環境）
  - **何をテストするか**: Distribution Stack の CloudFormation テンプレート全体の一貫性
  - **期待される動作**: テンプレートがスナップショットと一致する
- **入力値**: `devConfig` を使用した DistributionStack
  - **入力データの意味**: 開発環境の標準設定
- **期待される結果**: スナップショットと一致
  - **期待結果の理由**: テンプレートの意図しない変更（リグレッション）を検出するため
- **テストの目的**: CloudFormation テンプレートの一貫性保証
  - **確認ポイント**: 全リソースの設定値が期待通り

**参照した設計文書**: `infra/test/application-stack.test.ts` パターン

---

### TC-DS-02: スナップショットテスト（WAF 無効化） 🟡

**信頼性**: 🟡 *要件定義書 enableWaf オプションより*

- **テスト名**: CloudFormation テンプレートのスナップショットテスト（WAF無効）
  - **何をテストするか**: WAF 無効化設定での CloudFormation テンプレート
  - **期待される動作**: WAF リソースが含まれないテンプレートがスナップショットと一致
- **入力値**: `devConfig` + `enableWaf: false`
  - **入力データの意味**: WAF を無効化した設定
- **期待される結果**: スナップショットと一致、WAF リソース不在
  - **期待結果の理由**: オプション設定による構成差異を検証
- **テストの目的**: 条件付きリソース作成の検証
  - **確認ポイント**: WAF 関連リソースの有無

---

## 2. リソース存在確認テスト

### TC-DS-03: S3 Bucket リソース存在確認 🔵

**信頼性**: 🔵 *REQ-031、TASK-0018 より*

- **テスト名**: S3 Bucket が 1 つ作成されること
  - **何をテストするか**: AWS::S3::Bucket リソースの作成
  - **期待される動作**: 静的コンテンツ用 S3 バケットが作成される
- **入力値**: DistributionStackProps（全必須パラメータ）
  - **入力データの意味**: Distribution Stack の標準入力
- **期待される結果**: `template.resourceCountIs('AWS::S3::Bucket', 1)`
  - **期待結果の理由**: REQ-031 で S3 バケット作成が要求されている
- **テストの目的**: S3BucketConstruct 統合確認
  - **確認ポイント**: バケットリソースの存在

**参照した EARS 要件**: REQ-031

---

### TC-DS-04: S3 Bucket Policy リソース存在確認 🔵

**信頼性**: 🔵 *REQ-032、TASK-0018 より*

- **テスト名**: S3 Bucket Policy が作成されること
  - **何をテストするか**: AWS::S3::BucketPolicy リソースの作成
  - **期待される動作**: CloudFront からのアクセスを許可するバケットポリシーが作成
- **入力値**: DistributionStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.resourceCountIs('AWS::S3::BucketPolicy', 1)`
  - **期待結果の理由**: REQ-032 で CloudFront 経由のアクセス制御が要求されている
- **テストの目的**: バケットポリシー作成確認
  - **確認ポイント**: バケットポリシーの存在

**参照した EARS 要件**: REQ-032

---

### TC-DS-05: OAC リソース存在確認 🔵

**信頼性**: 🔵 *REQ-032、TASK-0018 より*

- **テスト名**: Origin Access Control が 1 つ作成されること
  - **何をテストするか**: AWS::CloudFront::OriginAccessControl リソースの作成
  - **期待される動作**: S3 Origin 用の OAC が作成される
- **入力値**: DistributionStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1)`
  - **期待結果の理由**: REQ-032 で OAC 構成が要求されている
- **テストの目的**: OAC 作成確認
  - **確認ポイント**: OAC リソースの存在

**参照した EARS 要件**: REQ-032

---

### TC-DS-06: CloudFront Distribution リソース存在確認 🔵

**信頼性**: 🔵 *REQ-032、TASK-0019 より*

- **テスト名**: CloudFront Distribution が 1 つ作成されること
  - **何をテストするか**: AWS::CloudFront::Distribution リソースの作成
  - **期待される動作**: Multi-Origin Distribution が作成される
- **入力値**: DistributionStackProps
  - **入力データの意味**: 標準設定
- **期待される結果**: `template.resourceCountIs('AWS::CloudFront::Distribution', 1)`
  - **期待結果の理由**: コンテンツ配信の中核リソース
- **テストの目的**: CloudFrontConstruct 統合確認
  - **確認ポイント**: Distribution リソースの存在

**参照した EARS 要件**: REQ-032

---

### TC-DS-07: WAF WebACL リソース存在確認（有効時） 🔵

**信頼性**: 🔵 *REQ-033、TASK-0011 より*

- **テスト名**: WAF WebACL が 1 つ作成されること（enableWaf: true）
  - **何をテストするか**: AWS::WAFv2::WebACL リソースの作成
  - **期待される動作**: CLOUDFRONT スコープの WAF WebACL が作成される
- **入力値**: DistributionStackProps（enableWaf: true）
  - **入力データの意味**: WAF 有効化設定
- **期待される結果**: `template.resourceCountIs('AWS::WAFv2::WebACL', 1)`
  - **期待結果の理由**: REQ-033 で WAF の CloudFront 接続が要求されている
- **テストの目的**: WafConstruct 統合確認
  - **確認ポイント**: WebACL リソースの存在

**参照した EARS 要件**: REQ-033

---

### TC-DS-08: WAF WebACL リソース不在確認（無効時） 🟡

**信頼性**: 🟡 *要件定義書 enableWaf オプションより*

- **テスト名**: WAF WebACL が作成されないこと（enableWaf: false）
  - **何をテストするか**: WAF 無効化時のリソース不作成
  - **期待される動作**: WAF WebACL が作成されない
- **入力値**: DistributionStackProps（enableWaf: false）
  - **入力データの意味**: WAF 無効化設定
- **期待される結果**: `template.resourceCountIs('AWS::WAFv2::WebACL', 0)`
  - **期待結果の理由**: オプション設定による条件付きリソース作成
- **テストの目的**: 条件付き WAF 作成確認
  - **確認ポイント**: WebACL リソースの不在

---

## 3. Construct 統合テスト

### TC-DS-09: S3 バケット パブリックアクセスブロック設定確認 🔵

**信頼性**: 🔵 *REQ-031、NFR-104 より*

- **テスト名**: S3 バケットにパブリックアクセスブロックが設定される
  - **何をテストするか**: S3 バケットのパブリックアクセスブロック設定
  - **期待される動作**: 全てのパブリックアクセスがブロックされる
- **入力値**: DistributionStackProps
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    }
  });
  ```
- **テストの目的**: S3 セキュリティ設定確認

**参照した EARS 要件**: NFR-104

---

### TC-DS-10: CloudFront Distribution HTTPS 強制設定確認 🔵

**信頼性**: 🔵 *NFR-105、TASK-0019 より*

- **テスト名**: CloudFront で HTTPS リダイレクトが設定される
  - **何をテストするか**: Default Cache Behavior の ViewerProtocolPolicy
  - **期待される動作**: redirect-to-https が設定される
- **入力値**: DistributionStackProps
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        ViewerProtocolPolicy: 'redirect-to-https'
      }
    }
  });
  ```
- **テストの目的**: HTTPS 強制設定確認

**参照した EARS 要件**: NFR-105

---

### TC-DS-11: CloudFront Distribution に S3 Origin が設定される 🔵

**信頼性**: 🔵 *REQ-032 より*

- **テスト名**: Distribution の Origins に S3 バケットが含まれる
  - **何をテストするか**: S3 Origin の設定
  - **期待される動作**: S3 バケットのリージョナルドメインが Origin として設定
- **入力値**: DistributionStackProps
- **期待される結果**: Origins 配列に S3 ドメインを含む Origin が存在
- **テストの目的**: S3 Origin 統合確認

**参照した EARS 要件**: REQ-032

---

### TC-DS-12: CloudFront Distribution に ALB Origin が設定される 🔵

**信頼性**: 🔵 *TASK-0019 より*

- **テスト名**: Distribution の Origins に ALB が含まれる
  - **何をテストするか**: ALB Origin の設定
  - **期待される動作**: ALB DNS 名が Origin として設定、HTTPS-only
- **入力値**: DistributionStackProps（alb 参照含む）
- **期待される結果**: Origins 配列に ALB ドメインを含む Origin が存在
- **テストの目的**: ALB Origin 統合確認

**参照した設計文書**: TASK-0019 要件定義書

---

### TC-DS-13: WAF Managed Rules 設定確認 🔵

**信頼性**: 🔵 *REQ-034 より*

- **テスト名**: WAF WebACL に AWS Managed Rules が設定される
  - **何をテストするか**: AWSManagedRulesCommonRuleSet と AWSManagedRulesSQLiRuleSet
  - **期待される動作**: 両方の Managed Rules が適用される
- **入力値**: DistributionStackProps（enableWaf: true）
- **期待される結果**: WebACL の Rules に Managed Rules が含まれる
- **テストの目的**: WAF ルール設定確認

**参照した EARS 要件**: REQ-034

---

### TC-DS-14: WAF スコープが CLOUDFRONT に設定される 🔵

**信頼性**: 🔵 *REQ-033 より*

- **テスト名**: WAF WebACL のスコープが CLOUDFRONT
  - **何をテストするか**: WebACL の Scope 設定
  - **期待される動作**: Scope: CLOUDFRONT が設定される
- **入力値**: DistributionStackProps（enableWaf: true）
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::WAFv2::WebACL', {
    Scope: 'CLOUDFRONT'
  });
  ```
- **テストの目的**: WAF スコープ設定確認

**参照した EARS 要件**: REQ-033

---

## 4. 公開プロパティ確認テスト

### TC-DS-15: distribution プロパティ存在確認 🔵

**信頼性**: 🔵 *要件定義書 出力プロパティより*

- **テスト名**: distribution プロパティが正しく公開される
  - **何をテストするか**: Stack の distribution プロパティ
  - **期待される動作**: IDistribution 型のオブジェクトが取得可能
- **入力値**: DistributionStackProps
- **期待される結果**: `expect(stack.distribution).toBeDefined()`
- **テストの目的**: 公開プロパティ確認

---

### TC-DS-16: distributionDomainName プロパティ確認 🔵

**信頼性**: 🔵 *要件定義書 出力プロパティより*

- **テスト名**: distributionDomainName プロパティが正しく公開される
  - **何をテストするか**: Distribution のドメイン名
  - **期待される動作**: CloudFront ドメイン名形式の文字列
- **入力値**: DistributionStackProps
- **期待される結果**: `expect(stack.distributionDomainName).toBeDefined()`
- **テストの目的**: ドメイン名取得確認

---

### TC-DS-17: distributionId プロパティ確認 🔵

**信頼性**: 🔵 *要件定義書 出力プロパティより*

- **テスト名**: distributionId プロパティが正しく公開される
  - **何をテストするか**: Distribution の ID
  - **期待される動作**: Distribution ID が取得可能
- **入力値**: DistributionStackProps
- **期待される結果**: `expect(stack.distributionId).toBeDefined()`
- **テストの目的**: Distribution ID 取得確認

---

### TC-DS-18: bucket プロパティ確認 🔵

**信頼性**: 🔵 *要件定義書 出力プロパティより*

- **テスト名**: bucket プロパティが正しく公開される
  - **何をテストするか**: S3 バケット参照
  - **期待される動作**: IBucket 型のオブジェクトが取得可能
- **入力値**: DistributionStackProps
- **期待される結果**: `expect(stack.bucket).toBeDefined()`
- **テストの目的**: バケット参照確認

---

### TC-DS-19: bucketArn プロパティ確認 🔵

**信頼性**: 🔵 *要件定義書 出力プロパティより*

- **テスト名**: bucketArn プロパティが正しく公開される
  - **何をテストするか**: S3 バケット ARN
  - **期待される動作**: ARN 形式の文字列
- **入力値**: DistributionStackProps
- **期待される結果**: `expect(stack.bucketArn).toBeDefined()`
- **テストの目的**: バケット ARN 取得確認

---

### TC-DS-20: webAcl プロパティ確認（条件付き） 🟡

**信頼性**: 🟡 *要件定義書 enableWaf オプションより*

- **テスト名**: webAcl プロパティが条件付きで公開される
  - **何をテストするか**: enableWaf に応じた webAcl プロパティ
  - **期待される動作**: enableWaf: true の場合のみ値が存在
- **入力値**: DistributionStackProps（enableWaf: true / false）
- **期待される結果**:
  - enableWaf: true → `expect(stack.webAcl).toBeDefined()`
  - enableWaf: false → `expect(stack.webAcl).toBeUndefined()`
- **テストの目的**: 条件付きプロパティ確認

---

## 5. CfnOutput 確認テスト

### TC-DS-21: DistributionDomainName CfnOutput 確認 🔵

**信頼性**: 🔵 *要件定義書 CfnOutput より*

- **テスト名**: DistributionDomainName が CfnOutput として出力される
  - **何をテストするか**: CfnOutput の存在と Export 名
  - **期待される動作**: DistributionDomainName が出力される
- **入力値**: DistributionStackProps
- **期待される結果**:
  ```typescript
  template.hasOutput('DistributionDomainName', {
    Export: { Name: Match.stringLikeRegexp('.*-DistributionDomainName') }
  });
  ```
- **テストの目的**: CfnOutput 確認

---

### TC-DS-22: DistributionId CfnOutput 確認 🔵

**信頼性**: 🔵 *要件定義書 CfnOutput より*

- **テスト名**: DistributionId が CfnOutput として出力される
  - **何をテストするか**: CfnOutput の存在と Export 名
  - **期待される動作**: DistributionId が出力される
- **入力値**: DistributionStackProps
- **期待される結果**:
  ```typescript
  template.hasOutput('DistributionId', {
    Export: { Name: Match.stringLikeRegexp('.*-DistributionId') }
  });
  ```
- **テストの目的**: CfnOutput 確認

---

### TC-DS-23: BucketName CfnOutput 確認 🔵

**信頼性**: 🔵 *要件定義書 CfnOutput より*

- **テスト名**: BucketName が CfnOutput として出力される
  - **何をテストするか**: CfnOutput の存在と Export 名
  - **期待される動作**: StaticContentBucket 名が出力される
- **入力値**: DistributionStackProps
- **期待される結果**:
  ```typescript
  template.hasOutput('BucketName', {
    Export: { Name: Match.stringLikeRegexp('.*-StaticContentBucket') }
  });
  ```
- **テストの目的**: CfnOutput 確認

---

### TC-DS-24: BucketArn CfnOutput 確認 🔵

**信頼性**: 🔵 *要件定義書 CfnOutput より*

- **テスト名**: BucketArn が CfnOutput として出力される
  - **何をテストするか**: CfnOutput の存在と Export 名
  - **期待される動作**: StaticContentBucketArn が出力される
- **入力値**: DistributionStackProps
- **期待される結果**:
  ```typescript
  template.hasOutput('BucketArn', {
    Export: { Name: Match.stringLikeRegexp('.*-StaticContentBucketArn') }
  });
  ```
- **テストの目的**: CfnOutput 確認

---

## 6. 依存関係テスト

### TC-DS-25: S3 バケットポリシーが Distribution 作成後に適用される 🔵

**信頼性**: 🔵 *TASK-0018 循環参照解決パターンより*

- **テスト名**: S3 バケットポリシーに CloudFront Distribution ARN が含まれる
  - **何をテストするか**: バケットポリシーの Condition 設定
  - **期待される動作**: aws:SourceArn に Distribution ARN が設定される
- **入力値**: DistributionStackProps
- **期待される結果**: バケットポリシーに Distribution への参照が含まれる
- **テストの目的**: 循環参照解決確認

**参照した設計文書**: TASK-0018 要件定義書

---

### TC-DS-26: ALB 参照が正しく設定される 🔵

**信頼性**: 🔵 *要件定義書 依存関係より*

- **テスト名**: CloudFront Origin に ALB DNS 名への参照が含まれる
  - **何をテストするか**: ALB Origin の DomainName 設定
  - **期待される動作**: ALB の DNS 名が Origin DomainName に設定
- **入力値**: DistributionStackProps（alb 参照含む）
- **期待される結果**: Origin DomainName に ALB 参照が含まれる
- **テストの目的**: Application Stack 依存確認

---

### TC-DS-27: Stack の論理的依存関係確認 🟡

**信頼性**: 🟡 *CDK ベストプラクティスより*

- **テスト名**: Distribution Stack が Application Stack に依存する
  - **何をテストするか**: Stack 間の依存関係
  - **期待される動作**: Distribution Stack は Application Stack より後にデプロイされる
- **入力値**: App レベルでの Stack 定義
- **期待される結果**: addDependency による依存関係が確認できる
- **テストの目的**: デプロイ順序確認

---

## 7. セキュリティテスト

### TC-DS-28: S3 バケットが暗号化されている 🔵

**信頼性**: 🔵 *REQ-031 より*

- **テスト名**: S3 バケットに S3 マネージド暗号化が設定される
  - **何をテストするか**: バケットの暗号化設定
  - **期待される動作**: SSE-S3 暗号化が有効
- **入力値**: DistributionStackProps
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: Match.arrayWith([
        Match.objectLike({
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          }
        })
      ])
    }
  });
  ```
- **テストの目的**: データ暗号化確認

**参照した EARS 要件**: REQ-031

---

### TC-DS-29: OAC が sigv4、always で設定される 🔵

**信頼性**: 🔵 *REQ-032 より*

- **テスト名**: OAC の署名設定が適切に構成される
  - **何をテストするか**: OAC の SigningBehavior と SigningProtocol
  - **期待される動作**: always + sigv4 が設定される
- **入力値**: DistributionStackProps
- **期待される結果**:
  ```typescript
  template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
    OriginAccessControlConfig: {
      SigningBehavior: 'always',
      SigningProtocol: 'sigv4'
    }
  });
  ```
- **テストの目的**: OAC セキュリティ設定確認

**参照した EARS 要件**: REQ-032

---

### TC-DS-30: CloudFront Origin Protocol Policy 確認 🔵

**信頼性**: 🔵 *NFR-105 より*

- **テスト名**: ALB Origin が HTTPS-only で設定される
  - **何をテストするか**: ALB Origin の OriginProtocolPolicy
  - **期待される動作**: https-only が設定される
- **入力値**: DistributionStackProps
- **期待される結果**: ALB Origin に `OriginProtocolPolicy: https-only` が設定
- **テストの目的**: Origin 通信セキュリティ確認

**参照した EARS 要件**: NFR-105

---

## 8. オプション設定テスト

### TC-DS-31: enableWaf デフォルト値テスト 🟡

**信頼性**: 🟡 *要件定義書 オプションパラメータより*

- **テスト名**: enableWaf を省略した場合 WAF が有効になる
  - **何をテストするか**: enableWaf のデフォルト値動作
  - **期待される動作**: デフォルトで WAF WebACL が作成される
- **入力値**: DistributionStackProps（enableWaf 省略）
- **期待される結果**: `template.resourceCountIs('AWS::WAFv2::WebACL', 1)`
- **テストの目的**: デフォルト値動作確認

---

### TC-DS-32: priceClass カスタム値テスト 🟡

**信頼性**: 🟡 *要件定義書 オプションパラメータより*

- **テスト名**: priceClass をカスタム値で設定できる
  - **何をテストするか**: priceClass オプションの反映
  - **期待される動作**: 指定した Price Class が設定される
- **入力値**: DistributionStackProps + `priceClass: PriceClass.PRICE_CLASS_ALL`
- **期待される結果**: `PriceClass: PriceClassAll` が設定される
- **テストの目的**: オプションパラメータ反映確認

---

### TC-DS-33: enableErrorPages 設定テスト 🟡

**信頼性**: 🟡 *要件定義書 オプションパラメータより*

- **テスト名**: enableErrorPages でエラーページ設定を制御できる
  - **何をテストするか**: enableErrorPages オプションの動作
  - **期待される動作**: false の場合エラーレスポンス設定が含まれない
- **入力値**: DistributionStackProps + `enableErrorPages: false`
- **期待される結果**: CustomErrorResponses が空または存在しない
- **テストの目的**: オプション設定動作確認

---

## 9. 異常系・バリデーションテスト

### TC-DS-34: envName 空文字エラー 🟡

**信頼性**: 🟡 *要件定義書 Props バリデーションより*

- **テスト名**: envName が空文字の場合エラーが発生する
  - **何をテストするか**: envName バリデーション
  - **期待される動作**: 適切なエラーメッセージで例外がスローされる
- **入力値**: `config.envName = ''`
- **期待される結果**:
  ```typescript
  expect(() => new DistributionStack(...)).toThrow('envName は必須です。');
  ```
- **テストの目的**: 入力バリデーション確認

---

### TC-DS-35: envName 長さ超過エラー 🟡

**信頼性**: 🟡 *要件定義書 Props バリデーションより*

- **テスト名**: envName が 20 文字を超える場合エラーが発生する
  - **何をテストするか**: envName 長さバリデーション
  - **期待される動作**: 適切なエラーメッセージで例外がスローされる
- **入力値**: `config.envName = 'a'.repeat(21)`
- **期待される結果**:
  ```typescript
  expect(() => new DistributionStack(...)).toThrow('envName は 20 文字以下である必要があります。');
  ```
- **テストの目的**: 入力バリデーション確認

---

### TC-DS-36: envName 不正形式エラー 🟡

**信頼性**: 🟡 *要件定義書 Props バリデーションより*

- **テスト名**: envName に不正な文字が含まれる場合エラーが発生する
  - **何をテストするか**: envName 形式バリデーション
  - **期待される動作**: 適切なエラーメッセージで例外がスローされる
- **入力値**: `config.envName = 'Dev-Environment'`（大文字を含む）
- **期待される結果**:
  ```typescript
  expect(() => new DistributionStack(...)).toThrow('envName は小文字英数字とハイフンのみで構成されます。');
  ```
- **テストの目的**: 入力バリデーション確認

---

## 10. 要件定義との対応関係

### 参照した機能要件

| 要件ID | 内容 | 対応テストケース |
|--------|------|------------------|
| REQ-031 | S3 バケット作成 | TC-DS-03, TC-DS-09, TC-DS-28 |
| REQ-032 | OAC 構成 | TC-DS-04, TC-DS-05, TC-DS-11, TC-DS-25, TC-DS-29 |
| REQ-033 | WAF CloudFront 接続 | TC-DS-07, TC-DS-14 |
| REQ-034 | AWS Managed Rules | TC-DS-13 |
| REQ-043 | デフォルトドメイン | (カスタムドメイン設定なしで暗黙的に確認) |

### 参照した非機能要件

| 要件ID | 内容 | 対応テストケース |
|--------|------|------------------|
| NFR-103 | WAF 保護 | TC-DS-07, TC-DS-13 |
| NFR-104 | OAC による直接アクセス防止 | TC-DS-09, TC-DS-29 |
| NFR-105 | HTTPS 強制 | TC-DS-10, TC-DS-30 |

### 参照した設計文書

| 文書 | 内容 | 対応テストケース |
|------|------|------------------|
| TASK-0018 | S3 + OAC Construct | TC-DS-03〜05, TC-DS-09, TC-DS-25 |
| TASK-0019 | CloudFront Construct | TC-DS-06, TC-DS-10〜12 |
| TASK-0011 | WAF Construct | TC-DS-07〜08, TC-DS-13〜14 |
| application-stack.test.ts | テストパターン | 全体構造 |

---

## 信頼性レベルサマリー

| レベル | 件数 | 割合 |
|--------|------|------|
| 🔵 青信号 | 28 | 78% |
| 🟡 黄信号 | 8 | 22% |
| 🔴 赤信号 | 0 | 0% |

**品質評価**: ✅ 高品質 - テストケースの大部分が要件定義書・設計文書により確認済み

---

## テスト実装時のコメント指針

### テストファイルヘッダー

```typescript
/**
 * Distribution Stack テスト
 *
 * TASK-0020: Distribution Stack 統合
 * フェーズ: TDD Red Phase - 失敗するテストケースの作成
 *
 * 【テスト概要】: DistributionStack の動作を検証するテストスイート
 * 【テスト対象】: distribution-stack.ts
 * 【テストケース数】: 36 テストケース
 *
 * テストケース:
 * - TC-DS-01〜02: スナップショットテスト
 * - TC-DS-03〜08: リソース存在確認テスト
 * - TC-DS-09〜14: Construct 統合テスト
 * - TC-DS-15〜20: 公開プロパティ確認テスト
 * - TC-DS-21〜24: CfnOutput 確認テスト
 * - TC-DS-25〜27: 依存関係テスト
 * - TC-DS-28〜30: セキュリティテスト
 * - TC-DS-31〜33: オプション設定テスト
 * - TC-DS-34〜36: 異常系・バリデーションテスト
 *
 * 🔵 信頼性: 要件定義書 REQ-031〜034, REQ-043、NFR-103〜105 に基づくテスト
 */
```

### 各テストケースのコメント形式

```typescript
// ============================================================================
// 【TC-DS-XX: テスト名】
// 【テスト目的】: 何を確認するか
// 【期待される動作】: 正常に動作した場合の結果
// 【信頼性】: 🔵/🟡/🔴 根拠
// ============================================================================
```

---

*このテストケース定義書は TDD Red Phase の実装に使用されます*
