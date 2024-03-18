import {
  AuthConfig,
  AuthUrlConfig,
  LocalMiddlewareRegister,
  PostProcessType,
  PostprocessRequest,
} from "./types";

export interface ThirdPartyInitailization<T extends string> {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  stateSecret: string;
  roles: T[];
}

class ThirdParty<T extends string> {
  #clientId: string;
  #clientSecret: string;
  #redirectUri: string;
  #stateSecret: string;
  #roles: T[];
  constructor(options: ThirdPartyInitailization<T>) {
    this.#clientId = options.clientId;
    this.#clientSecret = options.clientSecret;
    this.#redirectUri = options.redirectUri;
    this.#stateSecret = options.stateSecret;
    this.#roles = options.roles;
  }

  getPrivateFields() {
    return {
      clientId: this.#clientId,
      clientSecret: this.#clientSecret,
      redirectUri: this.#redirectUri,
      stateSecret: this.#stateSecret,
      roles: this.#roles,
    };
  }

  auth(
    config: AuthUrlConfig<T>,
    callback?: PostprocessRequest<{ url: string; state: string }>
  ): LocalMiddlewareRegister {
    return null as LocalMiddlewareRegister;
  }
}

export default ThirdParty;
