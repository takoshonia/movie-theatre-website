let opener = () => {};

export function setAuthOpener(nextOpener) {
  opener = nextOpener;
}

export function openLogin() {
  opener("login");
}
