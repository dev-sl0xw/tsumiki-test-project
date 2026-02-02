/**
 * CodeBuild Project Construct 実装
 *
 * TASK-0023: CI/CD Pipeline 構築
 * フェーズ: TDD Refactor Phase - コード品質改善
 *
 * 【機能概要】: アプリケーションのビルド・テスト実行用の CodeBuild プロジェクトを作成
 * 【実装方針】: Docker ビルド対応、ECR プッシュ権限付与
 * 【テスト対応】: TC-CICD-006〜015, 033 の全11テストケースに対応
 *
 * 構成内容:
 * - CodeBuild プロジェクト作成 (REQ-041)
 * - Docker ビルド用特権モード設定
 * - ECR プッシュ権限付与
 * - カスタム環境変数設定
 *
 * 🟡 信頼性レベル: 要件定義書 REQ-041 に基づく実装（詳細設計は推測）
 *
 * @module cicd/codebuild-construct
 */

import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

// ============================================================================
// 【定数定義】: CodeBuild 構成のデフォルト値
// ============================================================================

/**
 * デフォルトビルドイメージ
 *
 * 最新の安定版 AWS CodeBuild イメージを使用します。
 */
const DEFAULT_BUILD_IMAGE = codebuild.LinuxBuildImage.STANDARD_7_0;

/**
 * デフォルトコンピュートタイプ
 *
 * コスト効率と性能のバランスを考慮した SMALL サイズを使用します。
 */
const DEFAULT_COMPUTE_TYPE = codebuild.ComputeType.SMALL;

/**
 * デフォルト特権モード
 *
 * Docker ビルドを行うため、デフォルトで特権モードを有効化します。
 */
const DEFAULT_PRIVILEGED_MODE = true;

// ============================================================================
// 【インターフェース定義】
// ============================================================================

/**
 * CodeBuild Construct の Props インターフェース
 *
 * 柔軟なビルド設定をサポートする設定インターフェース。
 *
 * @interface CodeBuildConstructProps
 */
export interface CodeBuildConstructProps {
  /**
   * CodeBuild プロジェクトの名前
   *
   * AWS アカウント内で一意である必要があります。
   *
   * @example 'dev-app-build'
   */
  readonly projectName: string;

  /**
   * ビルドイメージ（オプション）
   *
   * CodeBuild の実行環境として使用するコンテナイメージ。
   *
   * @default LinuxBuildImage.STANDARD_7_0
   */
  readonly buildImage?: codebuild.IBuildImage;

  /**
   * コンピュートタイプ（オプション）
   *
   * ビルド環境のスペック（CPU・メモリ）を指定します。
   *
   * @default ComputeType.SMALL
   */
  readonly computeType?: codebuild.ComputeType;

  /**
   * 特権モード（オプション）
   *
   * Docker ビルドを行う場合は true を指定します。
   *
   * @default true
   */
  readonly privilegedMode?: boolean;

  /**
   * 環境変数（オプション）
   *
   * ビルド時に利用可能な環境変数を定義します。
   */
  readonly environmentVariables?: {
    [key: string]: codebuild.BuildEnvironmentVariable;
  };

  /**
   * ECR リポジトリ（オプション）
   *
   * Docker イメージのプッシュ先 ECR リポジトリ。
   * 指定すると、自動的にプッシュ権限が付与されます。
   */
  readonly ecrRepository?: ecr.IRepository;
}

/**
 * CodeBuild Project Construct
 *
 * アプリケーションのビルド・テスト実行用の CodeBuild プロジェクトを作成する Construct です。
 * Docker ビルド対応、ECR プッシュ権限付与が含まれます。
 *
 * @remarks
 * アーキテクチャ位置づけ:
 * ```
 * Ops Stack
 *   ↓
 * CodeCommit → CodeBuild → CodePipeline
 *                  ↓
 *               ECR (Docker Image)
 * ```
 *
 * @example
 * ```typescript
 * const codeBuild = new CodeBuildConstruct(this, 'CodeBuild', {
 *   projectName: 'dev-app-build',
 *   ecrRepository: ecrRepository,
 *   environmentVariables: {
 *     ENV_NAME: { value: 'dev' },
 *   },
 * });
 *
 * // CodePipeline との連携
 * const pipeline = new CodePipelineConstruct(this, 'Pipeline', {
 *   buildProject: codeBuild.project,
 *   // ...
 * });
 * ```
 */
export class CodeBuildConstruct extends Construct {
  /**
   * 作成された CodeBuild プロジェクトインスタンス
   *
   * CodePipeline の Build ステージで参照されます。
   */
  public readonly project: codebuild.IProject;

  /**
   * プロジェクトの ARN
   *
   * IAM ポリシーやリソース参照で使用されます。
   */
  public readonly projectArn: string;

  /**
   * プロジェクトの IAM ロール
   *
   * 追加権限付与が必要な場合に使用します。
   */
  public readonly role: iam.IRole;

  /**
   * CodeBuildConstruct を作成します
   *
   * @param scope - 親となる Construct
   * @param id - この Construct の識別子
   * @param props - ビルドプロジェクト設定
   */
  constructor(scope: Construct, id: string, props: CodeBuildConstructProps) {
    super(scope, id);

    // デフォルト値の適用
    const buildConfig = this.applyDefaults(props);

    // CodeBuild プロジェクトの作成
    const project = this.createBuildProject(props, buildConfig);

    // ECR 権限の付与
    this.grantEcrPermissions(props, project);

    // プロパティの公開
    this.project = project;
    this.projectArn = project.projectArn;
    this.role = this.ensureRole(project);
  }

  /**
   * デフォルト値を適用した設定を返します
   *
   * @param props - 元の設定
   * @returns デフォルト値が適用された設定
   */
  private applyDefaults(props: CodeBuildConstructProps) {
    return {
      buildImage: props.buildImage ?? DEFAULT_BUILD_IMAGE,
      computeType: props.computeType ?? DEFAULT_COMPUTE_TYPE,
      privilegedMode: props.privilegedMode ?? DEFAULT_PRIVILEGED_MODE,
    };
  }

  /**
   * CodeBuild プロジェクトを作成します
   *
   * @param props - プロジェクト設定
   * @param buildConfig - ビルド環境設定
   * @returns 作成された CodeBuild プロジェクト
   */
  private createBuildProject(
    props: CodeBuildConstructProps,
    buildConfig: {
      buildImage: codebuild.IBuildImage;
      computeType: codebuild.ComputeType;
      privilegedMode: boolean;
    }
  ): codebuild.PipelineProject {
    return new codebuild.PipelineProject(this, 'Project', {
      projectName: props.projectName,
      environment: {
        buildImage: buildConfig.buildImage,
        computeType: buildConfig.computeType,
        privileged: buildConfig.privilegedMode,
        environmentVariables: props.environmentVariables,
      },
    });
  }

  /**
   * ECR リポジトリへのアクセス権限を付与します
   *
   * @param props - プロジェクト設定
   * @param project - CodeBuild プロジェクト
   */
  private grantEcrPermissions(
    props: CodeBuildConstructProps,
    project: codebuild.PipelineProject
  ): void {
    if (props.ecrRepository) {
      props.ecrRepository.grantPullPush(project);
    }
  }

  /**
   * プロジェクトロールの存在を確認して返します
   *
   * @param project - CodeBuild プロジェクト
   * @returns プロジェクトロール
   * @throws プロジェクトロールが存在しない場合
   */
  private ensureRole(project: codebuild.PipelineProject): iam.IRole {
    if (!project.role) {
      throw new Error('CodeBuild project role is not available');
    }
    return project.role;
  }
}
