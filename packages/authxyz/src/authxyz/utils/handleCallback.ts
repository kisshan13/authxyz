type CallbackFn = () => any | Promise<any>;

interface CallbackHandlers {
  default?: CallbackFn;
  callback?: CallbackFn | any;
}

export function handleCallback(common: CallbackFn, callback: CallbackFn | any) {
  if (typeof callback === "function") {
    return callback();
  }

  return common();
}
