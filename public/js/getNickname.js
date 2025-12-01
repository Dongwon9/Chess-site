export function getNickname() {
  let nickname = sessionStorage.getItem('nickname');
  while (!nickname) {
    nickname = prompt('닉네임을 입력하세요:');
  }
  sessionStorage.setItem('nickname', nickname);
  return nickname;
}
