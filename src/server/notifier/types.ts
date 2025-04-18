export type INotifierConfig = {};

export interface INotifierPayload {
  content: string;
}

export interface INotifier<TPayload extends INotifierPayload = INotifierPayload> {
  send(payload: TPayload): Promise<void>;
}
