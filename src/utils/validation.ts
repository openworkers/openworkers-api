// https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
// https://github.com/angular/angular/blob/caedef0f5b37ac6530885223b26879c39c36c1bd/packages/forms/src/validators.ts#L112
export const emailRegexp =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string): boolean {
  return emailRegexp.test(email);
}
