/**
 * 通知ペイロードのインターフェース
 * 通知処理で送信されるデータの基本構造を定義します
 */
export interface INotifierPayload {
  /**
   * 通知の発端となったイベントを送信してきた送信元の識別子.
   */
  sourceId: string;

  /**
   * 送信されるメッセージの本文
   */
  content: string;
}

/**
 * 通知機能のインターフェース
 * 通知を送信するための基本的な機能を定義します
 */
export interface INotifier<TPayload extends INotifierPayload = INotifierPayload> {
  /**
   * 通知を送信するメソッド
   *
   * @param payload 送信する通知データ
   */
  send(payload: TPayload): Promise<void>;
}
