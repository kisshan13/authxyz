import { OAuth2Client } from "google-auth-library";
import {
  LoginAuthConfig,
  PostProcessType,
  PostprocessRequest,
} from "./types.js";

interface ProviderGoogleProps<T extends string> {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  roles: T[];
}

class Google<T extends string> {
  client: OAuth2Client;
  #roles: T[];
  constructor({
    clientId,
    clientSecret,
    redirectUrl,
    roles,
  }: ProviderGoogleProps<T>) {
    this.client = new OAuth2Client(clientId, clientSecret, redirectUrl);
    this.#roles = roles;
  }

  authUrl(
    config: LoginAuthConfig<T>,
    callback?: PostprocessRequest<{ url: string; state: string }>
  ) {
    const url = this.client.generateAuthUrl({
      access_type: "offline",
    });
  }

  callback() {}
}
