import type { IContainer } from "@notifier/server/container";
import type { ILogger } from "@notifier/server/logger";
import type { RecursivePartial } from "@notifier/utils/types";
import type { Context } from "hono";

/**
 * 送信元の種別を表す型
 */
export type SourceConfigType = "github-webhook" | unknown;

/**
 * 送信元設定項目を表す型
 */
export type SourceConfigItem<T extends SourceConfigType> = {
  /**
   * 送信元の識別子
   * Configのキーとして設定されていた文字列をそのまま引き込んだもの
   */
  id: string;

  /**
   * 送信元の種類
   */
  type: T;

  /**
   * 送信元の有効/無効状態
   * デフォルトは有効
   */
  enabled?: boolean;

  /**
   * 通知先の識別子リスト
   */
  notifyTo?: string[];

  /**
   * 送信元のオプション設定
   */
  options: {
    /**
     * デバッグ関連の設定
     */
    debug: {
      /**
       * ペイロードを出力するかどうか
       */
      printPayload?: boolean;
    };
  };
} & {
  /**
   * GitHub Webhook送信元固有の設定
   */
  type: "github-webhook";
  config: {
    /**
     * GitHubからのリクエストを検証するために使用するWebhookシークレット.
     * このシークレットはGitHubのWebhook設定で指定したものと一致する必要がある.
     */
    webhookSecret: string;
  };
};

/**
 * 通知先設定を表す型
 */
export type DestinationConfigType = "misskey" | unknown;

/**
 * 通知先の設定情報を表す型
 */
export type DestinationConfigItem<T extends DestinationConfigType> = {
  /**
   * 通知先の識別子
   * Configのキーとして設定されていた文字列をそのまま引き込んだもの
   */
  id: string;

  /**
   * 通知先の種類
   */
  type: T;

  /**
   * 通知先の有効/無効状態
   * デフォルトは有効
   */
  enabled?: boolean;

  /**
   * 通知先のオプション設定
   */
  options: {
    /**
     * デバッグ関連の設定
     */
    debug: {
      /**
       * ペイロードを出力するかどうか
       */
      printPayload?: boolean;
    };
  };
} & {
  /**
   * Misskey通知先固有の設定
   */
  type: "misskey";
  config: {
    /**
     * MisskeyサーバーのURL.
     * e.g. https://misskey.example.com/
     */
    url: string;

    /**
     * {@link url}で指定したMisskeyサーバーのアカウントで発行したアクセストークン.
     */
    token: string;

    /**
     * 投稿公開範囲
     * デフォルトは"home"
     */
    defaultPostVisibility: MisskeyPostVisibility;
  };
};

/**
 * アプリケーション設定
 * アプリケーション全体の設定情報を表す型で、環境変数やwranglerの設定ファイルから読み込まれた値を検証して安全な状態にしたものを表現する.
 */
export type Config = {
  /**
   * 送信元IDをキーとする送信元設定のマップ
   */
  sources?: {
    [sourceId: string]: SourceConfigItem<unknown>;
  };

  /**
   * 通知先IDをキーとする通知先設定のマップ
   */
  destinations?: {
    [destinationId: string]: DestinationConfigItem<unknown>;
  };
};

/**
 * アプリケーションの環境設定を表す型
 */
export type Environment = {
  /**
   * 環境変数から読み込まれる部分的な設定情報.
   * wranglerの設定ファイルからオブジェクトを流し込まれた時に使用される想定で、
   * OSの環境変数などにJSON文字列を設定するようなパターンは想定していない.
   */
  CONFIG?: RecursivePartial<Config>;
};

/**
 * アプリケーション実行時に利用される変数を表す型
 */
export type Variables = {
  /**
   * アプリケーションの依存性を管理するコンテナ
   */
  container: IContainer;

  /**
   * 環境変数や設定ファイルから情報を読み取って優先順位度を解決し、バリデーションを行った完全な設定情報
   */
  config: Config;

  /**
   * アプリケーション全体で利用するロガー
   */
  logger: ILogger;
};

/**
 * サーバーの実行環境を表す型
 * Honoと連携するための型で、Middlewareなどで差し込んだ値の型解決などを行うために必要
 */
export type ServerEnvironment = {
  Bindings: Environment;
  Variables: Variables;
};

/**
 * HonoのMiddlewareや環境変数の情報を型安全に取得するためのContext拡張
 */
export type ServerContext = Context<ServerEnvironment>;

/**
 * Misskey投稿公開範囲の選択肢
 */
export const misskeyPostVisibilities = ["public", "home", "followers", "specified"];

/**
 * Misskey投稿公開範囲
 */
export type MisskeyPostVisibility = (typeof misskeyPostVisibilities)[number];
